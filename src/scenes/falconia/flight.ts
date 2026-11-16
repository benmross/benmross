/**
 * WebGL flight over the photogrammetry scan of the Falconia terrain table.
 * Loaded on demand by the Falconia scene, so three.js stays out of the main bundle.
 *
 * Two models from the same scan: a light, simplified mesh drawn as a hidden-line
 * wireframe, and the full textured mesh. A sweep line crosses the table and replaces
 * one with the other.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { BANK, CLEARANCE, EXAGGERATION, KEYS, SWEEP, type Vec3 } from './route'

const BASE = '/media/falconia/model/'

export type Flight = {
  /** Scroll progress through the section (0..1) and how far the section has come into view (0..1). */
  set(progress: number, entry: number): void
  /** Like set, without easing toward it. */
  jump(progress: number, entry: number): void
  /** Screen position of a world point in CSS pixels, with depth; null when behind the camera. */
  project(p: Vec3): { x: number; y: number; d: number } | null
  /** Called after each frame is drawn, with the smoothed progress. */
  onFrame(fn: (t: number) => void): void
  /** Camera state at progress t, for checking the track. */
  sample(t: number): { p: number[]; q: number[]; fov: number }
  setActive(active: boolean): void
  dispose(): void
}

const seg = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)))
const smooth = (x: number) => x * x * (3 - 2 * x)

/**
 * Meshopt quantization stores positions normalised, with the real size in the node's
 * transform. Bake it in so shader-space coordinates are metres on the table.
 */
function bake(m: THREE.Mesh) {
  const g = m.geometry.clone()
  const p = g.getAttribute('position')
  const f = new Float32Array(p.count * 3)
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld)
    f[i * 3] = v.x
    f[i * 3 + 1] = v.y
    f[i * 3 + 2] = v.z
  }
  g.setAttribute('position', new THREE.BufferAttribute(f, 3))
  g.computeBoundingBox()
  g.computeBoundingSphere()
  m.geometry.dispose()
  return g
}

const COMMON_VERT = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec2 vUv;
  void main() {
    vLocal = position;
    #ifdef USE_UV_ATTR
    vUv = uv;
    #endif
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

const FOG = /* glsl */ `
  uniform vec3 uFog;
  uniform vec3 uCam;
  uniform vec2 uFogRange;
  float fogAmount() { return smoothstep(uFogRange.x, uFogRange.y, distance(vWorld, uCam)); }
`

export async function createFlight(canvas: HTMLCanvasElement, opts: { accent: string; tint: string; mobile: boolean }): Promise<Flight> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.004, 40)
  const group = new THREE.Group()
  group.scale.set(1, EXAGGERATION, 1)
  scene.add(group)

  const accent = new THREE.Color(opts.accent)
  const tint = new THREE.Color(opts.tint)

  const shared = {
    uSweep: { value: -3 },
    uDraw: { value: 0 },
    uFog: { value: tint },
    uCam: { value: new THREE.Vector3() },
    uFogRange: { value: new THREE.Vector2(3, 12) },
    uAccent: { value: accent },
    uWire: { value: 1 },
  }

  // --- wireframe: simplified mesh, depth-only fill so back lines are hidden
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const wireGltf = await loader.loadAsync(BASE + 'wire.glb')
  let wireGeo: THREE.BufferGeometry | null = null
  wireGltf.scene.updateMatrixWorld(true)
  wireGltf.scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && !wireGeo) wireGeo = bake(o as THREE.Mesh)
  })
  if (!wireGeo) throw new Error('wire.glb has no mesh')
  const wg = wireGeo as THREE.BufferGeometry

  const fillMat = new THREE.ShaderMaterial({
    uniforms: shared,
    vertexShader: COMMON_VERT,
    fragmentShader: /* glsl */ `
      varying vec3 vLocal; varying vec3 vWorld; varying vec2 vUv;
      uniform float uSweep; uniform float uDraw;
      ${FOG}
      void main() {
        if (vLocal.z < uSweep || length(vLocal.xz) > uDraw) discard;
        gl_FragColor = vec4(uFog, 1.0);
        #include <colorspace_fragment>
      }
    `,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
  })
  const fill = new THREE.Mesh(wg, fillMat)
  fill.renderOrder = 1
  group.add(fill)

  const lineMat = new THREE.ShaderMaterial({
    uniforms: shared,
    vertexShader: COMMON_VERT,
    fragmentShader: /* glsl */ `
      varying vec3 vLocal; varying vec3 vWorld; varying vec2 vUv;
      uniform float uSweep; uniform float uDraw; uniform vec3 uAccent; uniform float uWire;
      ${FOG}
      void main() {
        if (vLocal.z < uSweep) discard;
        float r = length(vLocal.xz);
        float front = 1.0 - smoothstep(uDraw - 0.35, uDraw, r);
        if (front <= 0.0) discard;
        float rim = smoothstep(uDraw - 0.35, uDraw - 0.02, r) * front; // the drawing edge glows
        float nearSweep = 1.0 - smoothstep(0.0, 0.25, vLocal.z - uSweep);
        float a = (0.42 + 0.5 * rim + 0.5 * nearSweep) * front * uWire * (1.0 - fogAmount());
        gl_FragColor = vec4(uAccent * (1.0 + rim + nearSweep), a);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const lines = new THREE.LineSegments(new THREE.WireframeGeometry(wg), lineMat)
  lines.renderOrder = 2
  group.add(lines)

  // the surface under the camera, for terrain clearance: max height on a coarse grid
  const N = 72
  const hf = new Float32Array(N * N).fill(-1)
  const pos = wg.getAttribute('position') as THREE.BufferAttribute
  wg.computeBoundingBox()
  const bb = wg.boundingBox!
  for (let i = 0; i < pos.count; i++) {
    const gx = Math.floor(((pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x)) * (N - 1))
    const gz = Math.floor(((pos.getZ(i) - bb.min.z) / (bb.max.z - bb.min.z)) * (N - 1))
    const k = gz * N + gx
    hf[k] = Math.max(hf[k], pos.getY(i) * EXAGGERATION)
  }
  const ground = (x: number, z: number) => {
    const fx = (x - bb.min.x) / (bb.max.x - bb.min.x)
    const fz = (z - bb.min.z) / (bb.max.z - bb.min.z)
    if (fx < 0 || fx > 1 || fz < 0 || fz > 1) return -1
    let h = -1
    const cx = Math.round(fx * (N - 1))
    const cz = Math.round(fz * (N - 1))
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx
        const gz = cz + dz
        if (gx >= 0 && gx < N && gz >= 0 && gz < N) h = Math.max(h, hf[gz * N + gx])
      }
    return h
  }

  // --- the textured scan, loaded after the wireframe so something is on screen quickly
  let terrainReady = false
  const terrainMat = new THREE.ShaderMaterial({
    uniforms: { ...shared, map: { value: null as THREE.Texture | null } },
    vertexShader: '#define USE_UV_ATTR\n' + COMMON_VERT,
    fragmentShader: /* glsl */ `
      varying vec3 vLocal; varying vec3 vWorld; varying vec2 vUv;
      uniform float uSweep; uniform vec3 uAccent; uniform sampler2D map;
      ${FOG}
      void main() {
        float e = vLocal.z - uSweep;
        if (e > 0.0) discard;
        vec3 c = texture2D(map, vUv).rgb;
        float band = smoothstep(-0.18, 0.0, e);
        c = mix(c, uAccent * 1.4, band * band * 0.85);
        c = mix(c, uFog, fogAmount());
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }
    `,
    // photogrammetry leaves some faces wound the wrong way
    side: THREE.DoubleSide,
  })
  loader.loadAsync(BASE + 'terrain.glb').then((g) => {
    g.scene.updateMatrixWorld(true)
    g.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshBasicMaterial
      const map = src.map
      if (map) {
        map.colorSpace = THREE.SRGBColorSpace
        map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
        terrainMat.uniforms.map.value = map
      }
      src.dispose()
      const mesh = new THREE.Mesh(bake(m), terrainMat)
      mesh.renderOrder = 0
      group.add(mesh)
      terrainReady = true
    })
  })

  // --- camera path
  /*
   * Everything about the camera is baked once into samples over scroll progress, then
   * smoothed, so speed, attitude and zoom all change continuously:
   *  - distance along the route follows a speed profile taken from the keyframes,
   *    eased in at the start and blurred, so speed never steps at a key;
   *  - the height is lifted over the sand by a smooth envelope, not the raw height grid;
   *  - attitude is the aircraft's: nose along travel at low level, bank from turn rate,
   *    tan(bank) = v^2 * curvature / g; the resulting rotations are blurred as quaternions;
   *  - field of view is interpolated between keys and blurred, so the zoom never stalls.
   */
  const v = (a: Vec3) => new THREE.Vector3(...a)
  const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => v(k.pos)), false, 'centripetal')
  const lookCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => v(k.look)), false, 'centripetal')
  const nk = KEYS.length

  const blur = (a: Float32Array, r: number, passes = 1) => {
    let src = a
    const wts: number[] = []
    for (let k = -r; k <= r; k++) wts.push(Math.exp(-(k * k) / (0.5 * r * r)))
    for (let p = 0; p < passes; p++) {
      const o = new Float32Array(src.length)
      for (let i = 0; i < src.length; i++) {
        let sum = 0
        let wsum = 0
        for (let k = -r; k <= r; k++) {
          const j = Math.max(0, Math.min(src.length - 1, i + k))
          sum += src[j] * wts[k + r]
          wsum += wts[k + r]
        }
        o[i] = sum / wsum
      }
      src = o
    }
    return src
  }

  // arc length along the position spline, densely, to turn distance back into spline parameter
  const NU = 6000
  const arc = new Float32Array(NU)
  {
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    posCurve.getPoint(0, a)
    for (let i = 1; i < NU; i++) {
      posCurve.getPoint(i / (NU - 1), b)
      arc[i] = arc[i - 1] + a.distanceTo(b)
      a.copy(b)
    }
  }
  const arcAtKey = (k: number) => arc[Math.round((k / (nk - 1)) * (NU - 1))]
  const uAtArc = (d: number) => {
    let lo = 0
    let hi = NU - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (arc[mid] < d) lo = mid
      else hi = mid
    }
    const f = arc[hi] > arc[lo] ? (d - arc[lo]) / (arc[hi] - arc[lo]) : 0
    return (lo + f) / (NU - 1)
  }

  const NS = 2000
  const tx = new Float32Array(NS)
  const ty = new Float32Array(NS)
  const tz = new Float32Array(NS)
  const dist = new Float32Array(NS)
  const fov = new Float32Array(NS)
  const low = new Float32Array(NS)
  const qx = new Float32Array(NS)
  const qy = new Float32Array(NS)
  const qz = new Float32Array(NS)
  const qw = new Float32Array(NS)
  {
    const tOf = (i: number) => i / (NS - 1)
    const keyAt = (t: number) => {
      let i = 0
      while (i < nk - 2 && t > KEYS[i + 1].t) i++
      return i
    }
    // speed profile: constant within each pair of keys, eased in from rest, then blurred
    const speed = new Float32Array(NS)
    for (let i = 0; i < NS; i++) {
      const t = tOf(i)
      const k = keyAt(t)
      speed[i] = (arcAtKey(k + 1) - arcAtKey(k)) / (KEYS[k + 1].t - KEYS[k].t)
      speed[i] *= smooth(seg(t, 0, 0.05)) * (1 - smooth(seg(t, 0.93, 1)))
    }
    const sp = blur(speed, 70, 2)
    const along = new Float32Array(NS)
    for (let i = 1; i < NS; i++) along[i] = along[i - 1] + (sp[i - 1] + sp[i]) / 2
    const total = arc[NU - 1]
    const q = new THREE.Vector3()
    const lx = new Float32Array(NS)
    const ly = new Float32Array(NS)
    const lz = new Float32Array(NS)
    const fovRaw = new Float32Array(NS)
    const lift = new Float32Array(NS)
    for (let i = 0; i < NS; i++) {
      const uu = uAtArc((along[i] / along[NS - 1]) * total)
      posCurve.getPoint(uu, q)
      tx[i] = q.x
      ty[i] = q.y
      tz[i] = q.z
      const g = ground(q.x, q.z)
      lift[i] = g > -1 ? Math.max(0, g + CLEARANCE - q.y) : 0
      lookCurve.getPoint(uu, q)
      lx[i] = q.x
      ly[i] = q.y
      lz[i] = q.z
      const t = tOf(i)
      const k = keyAt(t)
      fovRaw[i] = KEYS[k].fov + (KEYS[k + 1].fov - KEYS[k].fov) * seg(t, KEYS[k].t, KEYS[k + 1].t)
      low[i] = smooth(seg(t, 0.23, 0.36)) * (1 - smooth(seg(t, 0.52, 0.8)))
    }
    fov.set(blur(fovRaw, 70, 2))
    // spline segments meet with slightly different parametric speeds; a light blur
    // removes the leftover ripple at each key
    for (const arr of [tx, ty, tz, lx, ly, lz]) arr.set(blur(arr, 10))
    for (let i = 0; i < NS; i++) {
      const g = ground(tx[i], tz[i])
      lift[i] = g > -1 ? Math.max(0, g + CLEARANCE - ty[i]) : 0
    }
    // terrain clearance: widen each lift with a running maximum, then blur, so it stays
    // above the sand without following the blocky height grid
    const R = 60
    const wide = new Float32Array(NS)
    for (let i = 0; i < NS; i++) {
      let m = 0
      for (let k = Math.max(0, i - R); k <= Math.min(NS - 1, i + R); k++) m = Math.max(m, lift[k])
      wide[i] = m
    }
    const lifted = blur(wide, R / 2, 2)
    for (let i = 0; i < NS; i++) ty[i] += lifted[i]

    // turn rate per unit of distance, for the bank
    const turn = new Float32Array(NS)
    for (let i = 1; i < NS - 1; i++) {
      const ax = tx[i] - tx[i - 1]
      const az = tz[i] - tz[i - 1]
      const bx = tx[i + 1] - tx[i]
      const bz = tz[i + 1] - tz[i]
      // 3D lengths, so a near-vertical dive does not read as a tight horizontal turn
      const la = Math.hypot(ax, ty[i] - ty[i - 1], az)
      const lb = Math.hypot(bx, ty[i + 1] - ty[i], bz)
      if (la < 1e-6 || lb < 1e-6) continue
      // y component of a x b; positive is a left turn
      const cross = (az * bx - ax * bz) / (la * lb)
      turn[i] = Math.asin(Math.max(-1, Math.min(1, cross))) / ((la + lb) / 2)
    }
    const kt = blur(turn, 50)

    // attitude
    const P0 = new THREE.Vector3()
    const fwd = new THREE.Vector3()
    const nose = new THREE.Vector3()
    const heading = new THREE.Vector3(0, 0, -1)
    const hint = new THREE.Vector3()
    const right = new THREE.Vector3()
    const up = new THREE.Vector3()
    const m = new THREE.Matrix4()
    const qq = new THREE.Quaternion()
    const roll = new THREE.Quaternion()
    const Z = new THREE.Vector3(0, 0, 1)
    const prev = new THREE.Quaternion()
    for (let i = 0; i < NS; i++) {
      P0.set(tx[i], ty[i], tz[i])
      fwd.set(lx[i], ly[i], lz[i]).sub(P0)
      dist[i] = fwd.length()
      fwd.normalize()
      const a = Math.max(0, i - 4)
      const b = Math.min(NS - 1, i + 4)
      nose.set(tx[b] - tx[a], ty[b] - ty[a], tz[b] - tz[a])
      if (nose.lengthSq() > 1e-12) {
        // a drone camera on a gimbal: pitch follows the climb only a little, so a pull-up
        // over the crescent keeps the ground in frame instead of filling it with sky
        nose.normalize()
        const hz = Math.hypot(nose.x, nose.z)
        if (hz > 1e-6) {
          const pitch = Math.atan2(nose.y, hz)
          const p2 = pitch > 0 ? Math.min(pitch * 0.35, 0.12) : pitch
          nose.set((nose.x / hz) * Math.cos(p2), Math.sin(p2), (nose.z / hz) * Math.cos(p2))
        }
        fwd.lerp(nose, low[i]).normalize()
      }
      // screen-up: world up when looking out, the heading when looking steeply down,
      // so the picture never spins as the camera passes over the point it looks at
      const flat = Math.hypot(fwd.x, fwd.z)
      if (flat > 0.25) heading.set(fwd.x, 0, fwd.z).normalize()
      const steep = smooth(seg(-fwd.y, 0.55, 0.97))
      hint.set(0, 1, 0).multiplyScalar(1 - steep).addScaledVector(heading, steep).normalize()
      right.crossVectors(fwd, hint).normalize()
      up.crossVectors(right, fwd)
      m.makeBasis(right, up, fwd.clone().negate())
      qq.setFromRotationMatrix(m)
      // bank, in full when the camera faces along the track
      const nf = Math.hypot(nose.x, nose.z)
      const facing = nf > 1e-6 && flat > 1e-6 ? Math.max(0, (nose.x * fwd.x + nose.z * fwd.z) / (nf * flat)) : 0
      const bank = Math.max(-0.7, Math.min(0.7, Math.atan(BANK * kt[i])))
      qq.multiply(roll.setFromAxisAngle(Z, bank * facing))
      if (i > 0 && qq.dot(prev) < 0) qq.set(-qq.x, -qq.y, -qq.z, -qq.w)
      prev.copy(qq)
      qx[i] = qq.x
      qy[i] = qq.y
      qz[i] = qq.z
      qw[i] = qq.w
    }
    for (const arr of [qx, qy, qz, qw]) arr.set(blur(arr, 60, 2))
  }
  const at = (a: Float32Array, t: number) => {
    const f = Math.max(0, Math.min(1, t)) * (NS - 1)
    const i = Math.min(NS - 2, Math.floor(f))
    return a[i] + (a[i + 1] - a[i]) * (f - i)
  }

  const P = new THREE.Vector3()
  const tmp = new THREE.Vector3()
  const back = new THREE.Vector3()

  let target = 0
  let entry = 0
  let cur = 0
  let curEntry = 0
  let w = 0
  let h = 0
  let active = false
  let raf = 0
  let last = 0
  const frameFns: ((t: number) => void)[] = []

  const size = () => {
    const r = canvas.getBoundingClientRect()
    w = Math.max(1, r.width)
    h = Math.max(1, r.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.5 : 1.75))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  size()
  const ro = new ResizeObserver(size)
  ro.observe(canvas)

  const place = (t: number) => {
    P.set(at(tx, t), at(ty, t), at(tz, t))
    camera.quaternion.set(at(qx, t), at(qy, t), at(qz, t), at(qw, t)).normalize()
    // narrow screens are pulled back during the aerial parts so the table fits
    if (w < h) {
      const aerial = 1 - smooth(seg(t, 0.16, 0.3)) + smooth(seg(t, 0.8, 1))
      back.set(0, 0, 1).applyQuaternion(camera.quaternion)
      P.addScaledVector(back, at(dist, t) * 0.45 * Math.min(1, aerial))
    }
    camera.position.copy(P)
    camera.fov = at(fov, t)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    shared.uCam.value.copy(P)
    // fog follows how far the camera can see: long in the air, short on the deck
    const near = 1 - at(low, t)
    shared.uFogRange.value.set(1.2 + 3.5 * near, 3.4 + 9 * near)
  }

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016)
    last = now
    const k = 1 - Math.exp(-dt * 7)
    cur += (target - cur) * k
    curEntry += (entry - curEntry) * k
    shared.uDraw.value = smooth(Math.min(1, curEntry * 1.15)) * 2.6
    const sweep = terrainReady ? smooth(seg(cur, SWEEP[0], SWEEP[1])) : 0
    shared.uSweep.value = -2.0 + sweep * 4.2
    shared.uWire.value = 1 - seg(cur, SWEEP[1], SWEEP[1] + 0.04)
    place(cur)
    renderer.render(scene, camera)
    for (const f of frameFns) f(cur)
  }

  const proj = new THREE.Vector3()
  return {
    set(p, e) {
      target = p
      entry = e
    },
    jump(p, e) {
      target = cur = p
      entry = curEntry = e
    },
    project(p) {
      proj.set(p[0], p[1], p[2]).project(camera)
      if (proj.z > 1 || proj.z < -1) return null
      camera.getWorldPosition(tmp)
      return { x: ((proj.x + 1) / 2) * w, y: ((1 - proj.y) / 2) * h, d: tmp.distanceTo(new THREE.Vector3(...p)) }
    },
    onFrame(fn) {
      frameFns.push(fn)
    },
    sample(t) {
      place(t)
      const q = camera.quaternion
      return { p: [P.x, P.y, P.z], q: [q.x, q.y, q.z, q.w], fov: camera.fov }
    },
    setActive(a) {
      if (a === active) return
      active = a
      if (a) {
        cur = target
        curEntry = entry
        last = performance.now()
        raf = requestAnimationFrame(frame)
      } else cancelAnimationFrame(raf)
    },
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
      })
      terrainMat.uniforms.map.value?.dispose()
      for (const m of [fillMat, lineMat, terrainMat]) m.dispose()
      renderer.dispose()
    },
  }
}
