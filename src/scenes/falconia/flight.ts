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
  const v = (a: Vec3) => new THREE.Vector3(...a)
  const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => v(k.pos)), false, 'centripetal')
  const lookCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => v(k.look)), false, 'centripetal')
  const u = (t: number) => {
    let i = 0
    while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++
    const f = seg(t, KEYS[i].t, KEYS[i + 1].t)
    return { u: (i + f) / (KEYS.length - 1), i, f }
  }
  const fovAt = (t: number) => {
    const { i, f } = u(t)
    return KEYS[i].fov + (KEYS[i + 1].fov - KEYS[i].fov) * smooth(f)
  }

  /*
   * The track is baked once: positions sampled along the spline, lifted to clear the sand,
   * smoothed, then given the attitude an aircraft flying it would have. Nose along the
   * direction of travel at low level, so pitch follows climbs and dives; bank from the
   * turn rate, tan(bank) = v^2 * curvature / g, at a constant notional airspeed.
   */
  const NS = 1600
  const tx = new Float32Array(NS)
  const ty = new Float32Array(NS)
  const tz = new Float32Array(NS)
  const lx = new Float32Array(NS)
  const ly = new Float32Array(NS)
  const lz = new Float32Array(NS)
  const bank = new Float32Array(NS)
  {
    const q = new THREE.Vector3()
    for (let i = 0; i < NS; i++) {
      const t = i / (NS - 1)
      posCurve.getPoint(u(t).u, q)
      const g = ground(q.x, q.z)
      tx[i] = q.x
      ty[i] = g > -1 ? Math.max(q.y, g + CLEARANCE) : q.y
      tz[i] = q.z
      lookCurve.getPoint(u(t).u, q)
      lx[i] = q.x
      ly[i] = q.y
      lz[i] = q.z
    }
    // smooth the height so terrain clearance never makes a kink, and never dips below it
    const blur = (a: Float32Array, r: number) => {
      const o = new Float32Array(a.length)
      for (let i = 0; i < a.length; i++) {
        let sum = 0
        let wsum = 0
        for (let k = -r; k <= r; k++) {
          const j = Math.max(0, Math.min(a.length - 1, i + k))
          const wk = Math.exp(-(k * k) / (0.5 * r * r))
          sum += a[j] * wk
          wsum += wk
        }
        o[i] = sum / wsum
      }
      return o
    }
    const lifted = ty.slice()
    for (let pass = 0; pass < 3; pass++) {
      const b = blur(ty, 24)
      for (let i = 0; i < NS; i++) ty[i] = Math.max(b[i], lifted[i])
    }
    ty.set(blur(ty, 10))
    // signed heading change per unit of horizontal distance, then bank
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
    const k = blur(turn, 40)
    for (let i = 0; i < NS; i++) bank[i] = Math.max(-0.7, Math.min(0.7, Math.atan(BANK * k[i])))
  }
  const at = (a: Float32Array, t: number) => {
    const f = Math.max(0, Math.min(1, t)) * (NS - 1)
    const i = Math.min(NS - 2, Math.floor(f))
    return a[i] + (a[i + 1] - a[i]) * (f - i)
  }

  const P = new THREE.Vector3()
  const L = new THREE.Vector3()
  const N2 = new THREE.Vector3()
  const tmp = new THREE.Vector3()

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
    L.set(at(lx, t), at(ly, t), at(lz, t))
    // narrow screens get pulled back a little during the aerial parts so the table fits
    const aerial = 1 - seg(t, 0.18, 0.3) + seg(t, 0.84, 1)
    if (w < h) P.sub(L).multiplyScalar(1 + 0.45 * Math.min(1, aerial)).add(L)

    // low level: the camera is the aircraft's nose, looking where it is going
    const low = smooth(seg(t, 0.25, 0.34)) * (1 - smooth(seg(t, 0.6, 0.72)))
    const d = 0.004
    N2.set(at(tx, t + d) - at(tx, t - d), at(ty, t + d) - at(ty, t - d), at(tz, t + d) - at(tz, t - d))
    if (N2.lengthSq() > 1e-10) {
      const lookDir = tmp.subVectors(L, P).normalize()
      N2.normalize().lerp(lookDir, 1 - low).normalize()
      L.copy(P).addScaledVector(N2, 0.5)
    }
    camera.position.copy(P)
    camera.up.set(0, 1, 0)
    camera.lookAt(L)
    // the bank shows in full when the camera faces along the track, less when it looks elsewhere
    N2.set(at(tx, t + d) - at(tx, t - d), 0, at(tz, t + d) - at(tz, t - d))
    const view = tmp.subVectors(L, P).setY(0)
    const facing = N2.lengthSq() > 1e-10 && view.lengthSq() > 1e-10 ? N2.normalize().dot(view.normalize()) : 0
    camera.rotateZ(at(bank, t) * facing)
    camera.fov = fovAt(t)
    camera.updateProjectionMatrix()
    shared.uCam.value.copy(P)
    // fog follows how far the camera can see: long in the air, short on the deck
    const near = 1 - low
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
