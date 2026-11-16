import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ANCHOR, AXLE, buildKart, type V3, type WireKind } from './model'
import { drawDash } from './dash'
import { ACT, KEYS, caseAt, clock, ghostAt, lerp, pathAt, poseAtS, seg, sm, stateAt, stopAt, timeScale, type KartState } from './timeline'

/**
 * The Kart section's WebGL scene: the kart drifting through a floodlit turn at night,
 * then held almost still while the camera goes round it part by part, with the
 * signals between the parts drawn as pulses along their wiring.
 */

export type FrameInfo = {
  p: number
  state: KartState
  /** Kart time against real time, 1 at full speed. */
  scale: number
  stop: number
  ghost: number
  /** Which signal routes are lit, by id, 0..1. */
  level: Record<string, number>
}

export type Stage = {
  set(p: number): void
  jump(p: number): void
  setActive(active: boolean): void
  onFrame(fn: (f: FrameInfo) => void): void
  /** A point in the kart's frame, in canvas pixels; null when behind the camera. */
  project(local: V3): { x: number; y: number } | null
  dispose(): void
}

export const KIND_COLOR: Record<WireKind, string> = { cmd: '#f4efe6', tel: '#39d8c0', pwr: '#ff5a3c' }

/** Which signal routes each stop of the tour lights. Stop numbers are content.ts kartScene.stops. */
const FOCUS: string[][] = [
  ['phase1', 'phase2', 'phase3', 'traction', 'throttle', 'escSerial'],
  ['phase1', 'phase2', 'phase3'],
  ['traction', 'bms', 'contactor'],
  ['canSet', 'canStatus', 'pwm', 'steerPower', 'pot'],
  ['usb'],
  ['uart', 'usb', 'bms', 'canSet', 'canStatus', 'throttle', 'escSerial', 'contactor'],
  [],
]

const WIRE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const WIRE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime, uLen, uSpacing, uSpeed, uLevel, uDir, uOpacity;
  varying vec2 vUv;
  void main() {
    float d = (uDir > 0.0 ? vUv.x : 1.0 - vUv.x) * uLen;
    float ph = fract((d - uTime * uSpeed) / uSpacing);
    // a pulse: bright at its head, fading back along the wire
    float head = smoothstep(0.55, 1.0, ph);
    head *= head;
    vec3 c = uColor * (0.05 + 0.1 * uLevel) + uColor * head * (0.6 + 6.0 * uLevel);
    gl_FragColor = vec4(c, uOpacity);
  }
`

const SMOKE_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uScale;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(aSize * uScale / max(0.05, -mv.z), 420.0);
    vA = aAlpha;
  }
`
const SMOKE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, d);
    gl_FragColor = vec4(uColor, a * a * vA);
  }
`

export async function createStage(canvas: HTMLCanvasElement, opts: { accent: string; tint: string; mobile: boolean }): Promise<Stage> {
  const dpr = Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.5 : 1.75)
  const tint = new THREE.Color(opts.tint)
  const accent = new THREE.Color(opts.accent)
  const disposables: { dispose(): void }[] = []
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(dpr)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  const shadows = !opts.mobile
  renderer.shadowMap.enabled = shadows
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  scene.background = tint.clone()
  scene.fog = new THREE.Fog(tint.clone(), 9, 50)
  const cam = new THREE.PerspectiveCamera(36, 1, 0.05, 220)

  // ------------------------------------------------------------- light
  scene.add(new THREE.HemisphereLight('#5d6a86', '#1a0d0c', 0.55))
  const key = new THREE.DirectionalLight('#dfe8ff', 2.3)
  key.castShadow = shadows
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = key.shadow.camera.bottom = -2.6
  key.shadow.camera.right = key.shadow.camera.top = 2.6
  key.shadow.camera.near = 1
  key.shadow.camera.far = 30
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.015
  scene.add(key, key.target)
  const rim = new THREE.DirectionalLight('#ffd9c2', 0.9)
  scene.add(rim, rim.target)
  const KEY_DIR = new THREE.Vector3(-0.45, 1, -0.55).normalize()
  const RIM_DIR = new THREE.Vector3(0.7, 0.45, 0.6).normalize()

  // ------------------------------------------------------------- track
  const groundTex = keep(asphalt())
  groundTex.repeat.set(90, 90)
  groundTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(360, 360)), keep(new THREE.MeshStandardMaterial({ color: '#332d2e', roughness: 0.82, metalness: 0.05, map: groundTex })))
  ground.rotation.x = -Math.PI / 2
  ground.position.set(20, 0, -20)
  ground.receiveShadow = shadows
  scene.add(ground)

  /** A flat strip along the kart's line, `offset` metres to its right. */
  function ribbon(offset: number, width: number, s0: number, s1: number, y = 0.006) {
    const pos: number[] = []
    for (let s = s0; s <= s1 + 1e-6; s += 0.5) {
      const p = pathAt(s)
      const rx = Math.sin(p.h)
      const rz = Math.cos(p.h)
      pos.push(p.x + rx * (offset - width / 2), y, p.z + rz * (offset - width / 2), p.x + rx * (offset + width / 2), y, p.z + rz * (offset + width / 2))
    }
    const n = pos.length / 6
    const idx: number[] = []
    for (let i = 0; i < n - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    const g = keep(new THREE.BufferGeometry())
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }
  const IN = -3.4 // track edges, metres right of the kart's line
  const OUT = 4.6
  const paint = keep(new THREE.MeshStandardMaterial({ color: '#bdb9b0', roughness: 0.7 }))
  for (const off of [IN, OUT]) {
    const m = new THREE.Mesh(ribbon(off, 0.13, 0, 110), paint)
    m.receiveShadow = shadows
    scene.add(m)
  }
  // kerbs inside the turn, red and white: one curved strip, so neighbouring blocks never overlap and flicker
  {
    const W = 0.55
    const OFF = IN - 0.36
    const prof: [number, number][] = [[-W / 2, 0.003], [-W / 2 + 0.07, 0.03], [W / 2 - 0.07, 0.03], [W / 2, 0.003]]
    const pos: number[] = []
    const col: number[] = []
    const idx: number[] = []
    const red = new THREE.Color('#c81a1c')
    const white = new THREE.Color('#e9e5dc')
    const S0 = 4.5
    const BLOCK = 1.02
    const STEPS = 4
    for (let b = 0; b < 34; b++) {
      const c = b % 2 ? white : red
      const base = pos.length / 3
      for (let k = 0; k <= STEPS; k++) {
        const p = pathAt(S0 + (b + k / STEPS) * BLOCK)
        const rx = Math.sin(p.h)
        const rz = Math.cos(p.h)
        for (const [o, y] of prof) {
          pos.push(p.x + rx * (OFF + o), y, p.z + rz * (OFF + o))
          col.push(c.r, c.g, c.b)
        }
      }
      for (let k = 0; k < STEPS; k++)
        for (let j = 0; j < prof.length - 1; j++) {
          const i0 = base + k * prof.length + j
          const i1 = i0 + prof.length
          idx.push(i0, i0 + 1, i1, i0 + 1, i1 + 1, i1)
        }
    }
    const g = keep(new THREE.BufferGeometry())
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    const kerb = new THREE.Mesh(g, keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })))
    kerb.receiveShadow = shadows
    scene.add(kerb)
  }
  // tyre wall round the outside
  {
    const g = keep(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 14))
    const mat = keep(new THREE.MeshStandardMaterial({ roughness: 0.85 }))
    const stacks = 46
    const im = new THREE.InstancedMesh(g, mat, stacks * 3)
    const m = new THREE.Matrix4()
    let k = 0
    for (let i = 0; i < stacks; i++) {
      const p = pathAt(1 + i * 1.18)
      const x = p.x + Math.sin(p.h) * (OUT + 4.8)
      const z = p.z + Math.cos(p.h) * (OUT + 4.8)
      for (let j = 0; j < 3; j++) {
        im.setMatrixAt(k, m.makeTranslation(x, 0.1 + j * 0.205, z))
        im.setColorAt(k++, new THREE.Color(j === 2 ? (i % 2 ? '#d8d4cb' : '#b3181a') : '#111112'))
      }
    }
    scene.add(im)
  }
  // floodlights: two inside the turn, three outside
  {
    const pole = keep(new THREE.CylinderGeometry(0.07, 0.09, 8, 8))
    const poleMat = keep(new THREE.MeshStandardMaterial({ color: '#1b1b1e', roughness: 0.6, metalness: 0.5 }))
    const lamp = keep(new THREE.BoxGeometry(0.9, 0.28, 0.2))
    const lampMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 7.4, 8.4), toneMapped: false }))
    for (const [s, off] of [[13, -9], [27, -8.5], [41, -11], [6, 13], [24, 14], [44, 13]]) {
      const p = pathAt(s)
      const x = p.x + Math.sin(p.h) * off
      const z = p.z + Math.cos(p.h) * off
      const a = new THREE.Mesh(pole, poleMat)
      a.position.set(x, 4, z)
      const b = new THREE.Mesh(lamp, lampMat)
      b.position.set(x, 8.05, z)
      b.lookAt(p.x, 0, p.z)
      scene.add(a, b)
    }
  }

  // ------------------------------------------------------------- the kart
  const kart = buildKart({ accent: opts.accent, shadows })
  scene.add(kart.root)
  const glow = new THREE.PointLight(accent, 0.9, 6, 1.6)
  glow.position.set(0.05, 0.92, 0)
  const under = new THREE.PointLight(accent, 0.7, 3.4, 1.6)
  under.position.set(-0.75, 0.8, 0)
  kart.body.add(glow, under)

  // signal routes: thin tubes whose shader runs pulses along them
  type Wire = { id: string; mat: THREE.ShaderMaterial; level: number }
  const wires: Wire[] = kart.wires.map((w) => {
    const curve = new THREE.CatmullRomCurve3(w.pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.22)
    const len = curve.getLength()
    const geo = keep(new THREE.TubeGeometry(curve, Math.max(8, Math.round(len / 0.02)), w.r ?? 0.0055, 6, false))
    const mat = keep(
      new THREE.ShaderMaterial({
        vertexShader: WIRE_VERT,
        fragmentShader: WIRE_FRAG,
        transparent: true,
        uniforms: {
          uColor: { value: new THREE.Color(KIND_COLOR[w.kind]) },
          uTime: { value: 0 },
          uLen: { value: len },
          uSpacing: { value: w.spacing ?? 0.25 },
          uSpeed: { value: w.speed ?? 0.6 },
          uLevel: { value: 0 },
          uDir: { value: w.reverse ? -1 : 1 },
          uOpacity: { value: 1 },
        },
      }),
    )
    kart.body.add(new THREE.Mesh(geo, mat))
    return { id: w.id, mat, level: 0 }
  })

  // a soft light at each of the electronics, brightening with the signals that reach it
  const spriteTex = keep(softDot())
  type Node = { sprite: THREE.Sprite; wires: string[] }
  const node = (at: V3, kind: WireKind, ids: string[], size = 0.09): Node => {
    const mat = keep(new THREE.SpriteMaterial({ map: spriteTex, color: new THREE.Color(KIND_COLOR[kind]), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }))
    const sprite = new THREE.Sprite(mat)
    sprite.position.set(...at)
    sprite.scale.setScalar(size)
    kart.body.add(sprite)
    return { sprite, wires: ids }
  }
  const nodes: Node[] = [
    node(ANCHOR.teensy, 'cmd', ['usb', 'throttle', 'canSet', 'uart', 'contactor']),
    node(ANCHOR.pi, 'tel', ['uart', 'bms']),
    node(ANCHOR.esp32, 'cmd', ['canSet', 'pwm']),
    node(ANCHOR.talon, 'pwr', ['pwm', 'steerPower']),
    node(ANCHOR.esc, 'pwr', ['throttle', 'phase1', 'traction'], 0.14),
    node(ANCHOR.motor, 'pwr', ['phase1'], 0.2),
    node(ANCHOR.bms, 'tel', ['bms']),
    node(ANCHOR.contactor, 'pwr', ['contactor', 'traction']),
    node(ANCHOR.wheelBase, 'cmd', ['usb']),
  ]

  // tyre smoke: every puff's place follows from when it left the tyre, so scroll can run it backwards
  const PUFFS = 150
  const EMIT = 0.0036
  const LIFE = PUFFS * EMIT
  const smokeGeo = keep(new THREE.BufferGeometry())
  const sPos = new Float32Array(PUFFS * 2 * 3)
  const sSize = new Float32Array(PUFFS * 2)
  const sAlpha = new Float32Array(PUFFS * 2)
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
  smokeGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1))
  smokeGeo.setAttribute('aAlpha', new THREE.BufferAttribute(sAlpha, 1))
  const smokeMat = keep(
    new THREE.ShaderMaterial({
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: { uScale: { value: 800 }, uColor: { value: new THREE.Color('#a8908c') } },
    }),
  )
  const smoke = new THREE.Points(smokeGeo, smokeMat)
  smoke.frustumCulled = false
  smoke.renderOrder = 5
  scene.add(smoke)
  const hash = (n: number) => {
    const x = Math.sin(n * 127.1) * 43758.5453
    return x - Math.floor(x)
  }

  // tyre marks: laid for the whole drive, drawn as far as the kart has got
  const MARK_DS = 0.2
  const MARK_S0 = 4
  const MARK_N = 420
  const marks: THREE.Mesh[] = []
  for (const side of [-1, 1]) {
    const pos: number[] = []
    const col: number[] = []
    for (let i = 0; i <= MARK_N; i++) {
      const k = poseAtS(MARK_S0 + i * MARK_DS)
      const cy = Math.cos(k.yaw)
      const sy = Math.sin(k.yaw)
      // the rear contact patch, from the kart frame into the world
      const wx = k.x + cy * AXLE.rear + sy * side * AXLE.rearHalf
      const wz = k.z - sy * AXLE.rear + cy * side * AXLE.rearHalf
      const rx = Math.sin(k.h)
      const rz = Math.cos(k.h)
      const hw = 0.085 + 0.05 * Math.abs(k.slip)
      pos.push(wx - rx * hw, 0.004, wz - rz * hw, wx + rx * hw, 0.004, wz + rz * hw)
      const a = seg(Math.abs(k.slip), 0.06, 0.3) * 0.82
      col.push(0.015, 0.012, 0.012, a, 0.015, 0.012, 0.012, a)
    }
    const idx: number[] = []
    for (let i = 0; i < MARK_N; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    const g = keep(new THREE.BufferGeometry())
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4))
    g.setIndex(idx)
    const m = new THREE.Mesh(g, keep(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })))
    m.frustumCulled = false
    marks.push(m)
    scene.add(m)
  }

  // ------------------------------------------------------------- composer
  const composer = new EffectComposer(renderer, keep(new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: opts.mobile ? 2 : 4 })))
  composer.setPixelRatio(dpr)
  composer.addPass(new RenderPass(scene, cam))
  const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.62, 0.55, 0.92)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  let W = 0
  let H = 0
  function fit() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h || (w === W && h === H)) return
    W = w
    H = h
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
  }
  const ro = new ResizeObserver(fit)
  ro.observe(canvas)

  // ------------------------------------------------------------- camera
  const kartPos = new THREE.Vector3()
  const yAxis = new THREE.Vector3(0, 1, 0)
  const toWorld = (v: THREE.Vector3, st: KartState) => v.applyAxisAngle(yAxis, st.yaw).add(kartPos.set(st.x, 0, st.z))
  const cr = (a: number, b: number, c: number, d: number, u: number) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - 3 * c + d - a) * u * u * u)
  const K = (i: number) => KEYS[Math.max(0, Math.min(KEYS.length - 1, i))]
  /** The tour camera at p, in the kart's frame. It eases into and out of every stop. */
  function tour(p: number, pos: THREE.Vector3, look: THREE.Vector3) {
    let i = 0
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++
    const lin = seg(p, KEYS[i].p, KEYS[i + 1].p)
    const u = lerp(lin, sm(lin, 0, 1), 0.72)
    const f = (get: (k: (typeof KEYS)[number]) => number) => cr(get(K(i - 1)), get(K(i)), get(K(i + 1)), get(K(i + 2)), u)
    pos.set(f((k) => k.pos[0]), f((k) => k.pos[1]), f((k) => k.pos[2]))
    look.set(f((k) => k.look[0]), f((k) => k.look[1]), f((k) => k.look[2]))
    // between stops, swing out and up so the move clears the cage instead of cutting through it
    const b = Math.sin(Math.PI * lin) ** 1.5 * (i === 0 ? 0 : 1)
    if (b > 0) {
      const dx = pos.x - 0.1
      const dz = pos.z
      const r = Math.hypot(dx, dz) || 1
      pos.x += (dx / r) * 0.75 * b
      pos.z += (dz / r) * 0.75 * b
      pos.y += 0.35 * b
    }
    return lerp(KEYS[i].fov, KEYS[i + 1].fov, u)
  }
  // the opening shot: a long lens low on the outside of the turn
  const w0 = pathAt(17.2)
  const OPEN = new THREE.Vector3(w0.x + Math.sin(w0.h) * 7.2, 0.46, w0.z + Math.cos(w0.h) * 7.2)
  // the closing shot: where the tour camera lets go, fixed to the ground from then on
  const stExit = stateAt(clock(ACT.exit[0]))
  const last = KEYS[KEYS.length - 1]
  const CLOSE = toWorld(new THREE.Vector3(...last.pos), stExit).clone()

  const pos = new THREE.Vector3()
  const look = new THREE.Vector3()
  const tmp = new THREE.Vector3()
  const tmp2 = new THREE.Vector3()
  function placeCamera(p: number, st: KartState) {
    let fov = tour(p, pos, look)
    toWorld(pos, st)
    toWorld(look, st)
    // opening: from the long lens to the tour's first key
    const a = 1 - sm(p, ACT.slow[0] - 0.01, ACT.slow[1])
    if (a > 0) {
      tmp.set(0.1, 0.5, 0)
      toWorld(tmp, st)
      pos.lerp(OPEN, a)
      pos.y += 0.5 * Math.sin(Math.PI * a) // a small rise on the way in
      look.lerp(tmp, a)
      fov = lerp(fov, 23, a)
    }
    // closing: stay put and watch it go
    const e = sm(p, ACT.exit[0], ACT.exit[0] + 0.03)
    if (e > 0) {
      tmp.copy(CLOSE)
      tmp.y += 0.35 * sm(p, ACT.exit[0], 1)
      pos.lerp(tmp, e)
      tmp2.set(0.2, 0.5, 0)
      toWorld(tmp2, st)
      look.lerp(tmp2, e)
      fov = lerp(fov, 34, sm(p, ACT.exit[0] + 0.02, 1))
    }
    const aspect = W / Math.max(1, H)
    // hold the horizontal field on tall screens
    if (aspect < 1.25) fov = (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * (1.25 / aspect) ** 0.8) * 180) / Math.PI
    cam.fov = Math.min(fov, 95)
    cam.aspect = aspect
    cam.position.copy(pos)
    cam.lookAt(look)
    // leave room for the card: push the picture right on wide screens, up on tall ones
    const t = Math.min(sm(p, ACT.slow[0], ACT.tour[0] + 0.03), 1 - sm(p, ACT.exit[0] - 0.01, ACT.exit[0] + 0.04))
    const narrow = W < 820 || W < H
    if (t > 0.001) cam.setViewOffset(W, H, narrow ? 0 : -0.13 * W * t, narrow ? 0.12 * H * t : 0, W, H)
    else cam.clearViewOffset()
    cam.updateProjectionMatrix()
  }

  // ------------------------------------------------------------- frame
  let target_ = 0
  let cur = 0
  let active = false
  let raf = 0
  let lastT = 0
  let wall = 0
  let dashAt = -1
  const frameFns: ((f: FrameInfo) => void)[] = []
  const level: Record<string, number> = {}
  for (const w of wires) level[w.id] = 0
  const g2d = kart.screen.canvas.getContext('2d')!
  const vS = new THREE.Vector3()

  function draw(dt: number) {
    fit()
    if (!W) return
    const p = cur
    const st = stateAt(clock(p))
    const scale = timeScale(p)
    const stop = stopAt(p)
    const ghost = ghostAt(p)

    kart.root.position.set(st.x, 0, st.z)
    kart.root.rotation.y = st.yaw
    const rearSpin = (st.s * (1 + 0.55 * st.smoke)) / AXLE.rearR
    kart.pose({ steer: st.steer, roll: st.roll, frontSpin: st.s / AXLE.frontR, rearSpin, chain: rearSpin * 0.116, fans: st.t * 55 })
    kart.ghost(ghost, caseAt(p))
    kart.leds.color.setRGB(2.6 * (0.9 + 0.1 * Math.sin(wall * 3.1)), 0.13, 0.08)

    // lights follow the kart
    key.target.position.set(st.x, 0.4, st.z)
    key.position.copy(key.target.position).addScaledVector(KEY_DIR, 12)
    rim.target.position.copy(key.target.position)
    rim.position.copy(key.target.position).addScaledVector(RIM_DIR, 10)

    // signals
    const inTour = stop >= 0
    const all = stop === FOCUS.length - 1
    for (const w of wires) {
      const want = !inTour ? 0.16 : all ? 1 : FOCUS[stop].includes(w.id) ? 1 : 0.1
      w.level += (want - w.level) * Math.min(1, dt * 5)
      level[w.id] = w.level
      w.mat.uniforms.uLevel.value = w.level
      w.mat.uniforms.uTime.value = wall
    }
    for (const n of nodes) {
      let l = 0
      for (const id of n.wires) l = Math.max(l, level[id])
      ;(n.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, l - 0.2) * (0.55 + 0.25 * Math.sin(wall * 5 + n.sprite.position.x * 9))
    }

    // smoke
    const n0 = Math.floor(st.t / EMIT)
    for (let side = 0; side < 2; side++) {
      const sz = side ? AXLE.rearHalf : -AXLE.rearHalf
      for (let k = 0; k < PUFFS; k++) {
        const n = n0 - k
        const i = side * PUFFS + k
        const born = n * EMIT
        const age = st.t - born
        const b = stateAt(born)
        const h = hash(n * 2 + side)
        const h2 = hash(n * 2 + side + 0.37)
        const a = born < 0 ? 0 : b.smoke * Math.min(1, age / 0.012) * (1 - age / LIFE) ** 1.6
        // where the tyre was, then thrown back and out, and rising
        const cy = Math.cos(b.yaw)
        const sy = Math.sin(b.yaw)
        const lx = AXLE.rear - 0.12 - (1.5 + h) * (1 - Math.exp(-age * 4.5))
        const lz = sz + (h2 - 0.5) * 0.25 + (h2 - 0.5) * age * 1.6
        vS.set(b.x + cy * lx + sy * lz, 0.1 + h * 0.08 + (0.9 + h2 * 0.9) * age ** 0.8 + 0.012 * Math.sin(wall * 0.9 + n), b.z - sy * lx + cy * lz)
        sPos[i * 3] = vS.x
        sPos[i * 3 + 1] = vS.y
        sPos[i * 3 + 2] = vS.z
        sSize[i] = 0.16 + age * 2.6 + h * 0.14
        sAlpha[i] = a * 0.085
      }
    }
    smokeGeo.attributes.position.needsUpdate = true
    smokeGeo.attributes.aSize.needsUpdate = true
    smokeGeo.attributes.aAlpha.needsUpdate = true

    // tyre marks, as far as the rear axle
    const drawn = Math.max(0, Math.min(MARK_N, Math.floor((st.s - MARK_S0) / MARK_DS))) * 6
    for (const m of marks) m.geometry.setDrawRange(0, drawn)

    // dashboard, when what it shows has moved
    const stamp = Math.round(st.t * 200) + Math.round(st.steer * 300)
    if (stamp !== dashAt) {
      dashAt = stamp
      drawDash(g2d, {
        mph: st.v * 2.237,
        rpm: st.v * 2.237 * 132,
        steerDeg: (-st.steer * 180) / Math.PI,
        volts: 74.2 - 1.3 * st.throttle,
        amps: 40 + 170 * st.throttle,
        throttle: st.throttle,
        brake: 0,
        s: st.s,
      })
      kart.screen.texture.needsUpdate = true
    }

    placeCamera(p, st)
    smokeMat.uniforms.uScale.value = (H * dpr) / (2 * Math.tan((cam.fov * Math.PI) / 360))
    for (const f of frameFns) f({ p, state: st, scale, stop, ghost, level })
    composer.render()
  }

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016)
    lastT = now
    wall += dt
    cur += (target_ - cur) * (1 - Math.exp(-dt * 8))
    draw(dt)
  }

  const vP = new THREE.Vector3()
  return {
    set(p) {
      target_ = p
    },
    jump(p) {
      target_ = cur = p
      wall += 0.4
      draw(1)
    },
    setActive(a) {
      if (a === active) return
      active = a
      if (a) {
        lastT = performance.now()
        raf = requestAnimationFrame(frame)
      } else cancelAnimationFrame(raf)
    },
    onFrame(fn) {
      frameFns.push(fn)
    },
    project(local) {
      vP.set(...local)
      kart.body.localToWorld(vP)
      vP.project(cam)
      if (vP.z > 1 || vP.z < -1) return null
      return { x: ((vP.x + 1) / 2) * W, y: ((1 - vP.y) / 2) * H }
    },
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      kart.dispose()
      for (const d of disposables) d.dispose()
      bloom.dispose()
      composer.dispose()
      renderer.dispose()
    },
  }
}

/** Speckled tarmac, tileable. */
function asphalt() {
  const n = 256
  const c = document.createElement('canvas')
  c.width = c.height = n
  const g = c.getContext('2d')!
  const img = g.createImageData(n, n)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < n * n; i++) {
    const r = rnd()
    const v = 150 + (r < 0.06 ? 90 : r < 0.3 ? 30 : r > 0.9 ? -70 : 0) * rnd()
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function softDot() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.5)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}
