import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { loopScene as T } from '../../content'

/**
 * The end of the Loop scene: Mars-like ground that spreads out from under the rover, and
 * the base station a few metres away, a table of five portrait monitors running the
 * Delivery mission. Arm Operator draws the arm live from its joint angles; Driver and
 * Drone show what cameras on the rover and above it actually see.
 * World is the arm's: z up, metres, origin at the top of the turret.
 */

type Spec = { shoulder_h: number; upper: number; fore: number; wrist: number; finger: number; limits_deg: number[][] }

export type Base = {
  /** 0 grid only .. 1 terrain everywhere it will reach. */
  setTerrain(u: number): void
  /** Draw the screens; `feeds` renders the rover's cameras into the Driver and Drone screens. */
  update(p: number, q: number[], gripper: number, renderer: THREE.WebGLRenderer, feeds: boolean): void
  /** Where the camera ends up, looking over the operators' shoulders at the screens with the rover beyond. */
  view(aspect: number): { pos: THREE.Vector3; look: THREE.Vector3; fov: number }
  setVisible(v: boolean): void
  dispose(): void
}

// ---- noise
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x: number, y: number) {
  let s = 0
  let a = 0.5
  let f = 1
  for (let i = 0; i < 5; i++) {
    s += a * vnoise(x * f, y * f)
    f *= 2.03
    a *= 0.5
  }
  return s
}
const sstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** The base station: where the table stands, and which way its screens face. */
const TABLE = { x: -2.9, y: 3.3, yaw: 0 }
{
  // screens face away from the rover, toward the operators, with the rover a little to the right of them
  const dx = TABLE.x - 2.2
  const dy = TABLE.y - 1.6
  TABLE.yaw = Math.atan2(dy, dx) - Math.PI / 2
}

export function createBase(
  scene: THREE.Scene,
  opts: { G: number; spec: Spec; accent: THREE.Color; tint: THREE.Color; fg: THREE.Color; fill: THREE.Material; line: THREE.LineBasicMaterial; mobile: boolean },
): Base {
  const { G, spec, accent, tint } = opts
  const disposables: { dispose(): void }[] = []
  const keep = <X extends { dispose(): void }>(x: X) => (disposables.push(x), x)
  const root = new THREE.Group()
  scene.add(root)

  // ================================================================ terrain
  const roverC = new THREE.Vector2(-0.15, 0)
  const tableC = new THREE.Vector2(TABLE.x, TABLE.y)
  const craters = [
    { x: 3.2, y: -2.4, r: 1.3 },
    { x: -4.8, y: -1.6, r: 0.9 },
    { x: 1.4, y: 4.6, r: 1.1 },
    { x: 5.6, y: 2.4, r: 1.8 },
    { x: -1.2, y: -5.2, r: 1.4 },
  ]
  const height = (x: number, y: number) => {
    let h = (fbm(x * 0.22 + 3.1, y * 0.22 - 1.7) - 0.45) * 1.1
    h += (fbm(x * 0.9, y * 0.9) - 0.5) * 0.12
    for (const c of craters) {
      const d = Math.hypot(x - c.x, y - c.y) / c.r
      h += -0.35 * c.r * Math.exp(-d * d * 2.2) + 0.12 * c.r * Math.exp(-((d - 1) * (d - 1)) * 10)
    }
    // flat where the rover drives and where the table stands
    const flat = Math.min(sstep(1.5, 3.2, Math.hypot(x - roverC.x, y - roverC.y)), sstep(1.6, 3.0, Math.hypot(x - tableC.x, y - tableC.y)))
    return h * flat - 0.012 * (1 - flat)
  }
  const SIZE = 30
  const N = opts.mobile ? 150 : 220
  const tg = new THREE.PlaneGeometry(SIZE, SIZE, N, N)
  tg.translate(-1, 1, 0)
  const sun = new THREE.Vector3(0.45, -0.55, 0.7).normalize()
  const lo = new THREE.Color('#5a2e1b')
  const hi = new THREE.Color('#b9693a')
  const dust = new THREE.Color('#d39462')
  const shade = (g: THREE.BufferGeometry, tone: (x: number, y: number, z: number) => THREE.Color) => {
    g.computeVertexNormals()
    const pos = g.attributes.position as THREE.BufferAttribute
    const nor = g.attributes.normal as THREE.BufferAttribute
    const col = new Float32Array(pos.count * 3)
    const n = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      n.fromBufferAttribute(nor, i)
      const c = tone(pos.getX(i), pos.getY(i), pos.getZ(i))
      const l = 0.3 + 0.8 * Math.max(0, n.dot(sun))
      col[i * 3] = c.r * l
      col[i * 3 + 1] = c.g * l
      col[i * 3 + 2] = c.b * l
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  }
  {
    const pos = tg.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) pos.setZ(i, G + height(pos.getX(i), pos.getY(i)))
    shade(tg, (x, y, z) => {
      const n = fbm(x * 0.6 + 9, y * 0.6 - 4)
      const c = lo.clone().lerp(hi, Math.min(1, Math.max(0, (z - G) * 1.4 + 0.55 + (n - 0.5) * 0.6)))
      return c.lerp(dust, Math.max(0, fbm(x * 2.1, y * 2.1) - 0.62) * 1.6)
    })
  }
  // scattered rocks, kept off the flat ground
  const rocks: THREE.BufferGeometry[] = []
  for (let i = 0; i < (opts.mobile ? 120 : 220); i++) {
    const x = -1 + (hash(i, 1.3) - 0.5) * SIZE * 0.85
    const y = 1 + (hash(i, 7.9) - 0.5) * SIZE * 0.85
    const dR = Math.hypot(x - roverC.x, y - roverC.y)
    const dT = Math.hypot(x - tableC.x, y - tableC.y)
    if (dR < 1.9 || dT < 2.0) continue
    const r = 0.04 + Math.pow(hash(i, 3.3), 3) * 0.32
    const g = new THREE.IcosahedronGeometry(r, 0)
    const p = g.attributes.position as THREE.BufferAttribute
    for (let k = 0; k < p.count; k++) {
      const j = 0.75 + 0.45 * hash(Math.round(p.getX(k) * 1e4) + i, Math.round(p.getY(k) * 1e4) + Math.round(p.getZ(k) * 1e4))
      p.setXYZ(k, p.getX(k) * j * 1.2, p.getY(k) * j, p.getZ(k) * j * 0.7)
    }
    g.rotateZ(hash(i, 5.5) * 6.28)
    g.translate(x, y, G + height(x, y) + r * 0.25)
    rocks.push(g)
  }
  rocks.forEach((g) => shade(g, () => lo.clone().lerp(hi, 0.35)))
  const groundGeo = keep(mergeGeometries([tg.toNonIndexed(), ...rocks.map((g) => (g.index ? g.toNonIndexed() : g))].map((g) => {
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k)
    return g
  }))!)
  tg.dispose()
  rocks.forEach((g) => g.dispose())
  const groundMat = keep(
    new THREE.ShaderMaterial({
      uniforms: {
        uReveal: { value: 0 },
        uCenter: { value: roverC },
        uTint: { value: tint },
        uAccent: { value: accent },
      },
      vertexShader: /* glsl */ `
        attribute vec3 color; varying vec3 vC; varying vec3 vW;
        void main(){ vC = color; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        varying vec3 vC; varying vec3 vW;
        uniform float uReveal; uniform vec2 uCenter; uniform vec3 uTint; uniform vec3 uAccent;
        void main(){
          float d = distance(vW.xy, uCenter);
          if (d > uReveal) discard;
          float edge = 1.0 - smoothstep(0.0, min(0.3, uReveal * 0.08), uReveal - d);
          vec3 c = mix(vC, uAccent, edge * 0.7);
          c = mix(c, uTint, smoothstep(7.0, 14.0, d));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  )
  const ground = new THREE.Mesh(groundGeo, groundMat)
  root.add(ground)

  // ================================================================ the base station
  let shown = false
  let revealed = false
  const station = new THREE.Group()
  station.position.set(TABLE.x, TABLE.y, G)
  station.rotation.z = TABLE.yaw
  root.add(station)
  const line = opts.line
  const part = (geo: THREE.BufferGeometry, pos: number[], rot?: number[], parent: THREE.Object3D = station) => {
    keep(geo)
    const g = new THREE.Group()
    g.add(new THREE.Mesh(geo, opts.fill))
    g.add(new THREE.LineSegments(keep(new THREE.EdgesGeometry(geo, 24)), line))
    g.position.set(pos[0], pos[1], pos[2])
    if (rot) g.rotation.set(rot[0], rot[1], rot[2])
    parent.add(g)
    return g
  }
  // local frame: x along the table, -y toward the screens' backs, +y toward the operators, z up
  const TH = 0.74
  part(new THREE.BoxGeometry(2.1, 0.76, 0.035), [0, 0, TH])
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) part(new THREE.BoxGeometry(0.035, 0.035, TH), [sx * 0.98, sy * 0.32, TH / 2])
  // keyboards, and a radio on a tripod at the end of the table
  for (const x of [-0.55, 0.0, 0.55]) part(new THREE.BoxGeometry(0.36, 0.13, 0.02), [x, 0.18, TH + 0.028])
  {
    const tri = new THREE.Group()
    tri.position.set(1.45, -0.6, 0)
    station.add(tri)
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2
      const leg = new THREE.Vector3(Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0)
      const top = new THREE.Vector3(0, 0, 1.3)
      const d = top.clone().sub(leg)
      const g = part(new THREE.BoxGeometry(0.02, d.length(), 0.02), [0, 0, 0], undefined, tri)
      g.position.copy(leg).addScaledVector(d, 0.5)
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
    }
    part(new THREE.CylinderGeometry(0.014, 0.014, 0.9, 8), [0, 0, 1.75], [Math.PI / 2, 0, 0], tri)
    part(new THREE.BoxGeometry(0.22, 0.05, 0.34), [0, 0, 2.15], undefined, tri)
  }

  // ---- monitors and their screens
  const SW = 0.33
  const SH = 0.575
  const CW = 360
  const CH = Math.round((CW * SH) / SW)
  type Screen = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; mesh: THREE.Mesh }
  const screens: Screen[] = []
  const feedPlanes: THREE.Mesh[] = []
  const angles = [0.32, 0.15, 0, -0.15, -0.32]
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group()
    // the operators face -y, so their left is +x: seat 1 at +x
    const x = (2 - i) * 0.4
    g.position.set(x, -0.2 + Math.abs(i - 2) * 0.06, TH + 0.02)
    g.rotation.z = -angles[i]
    station.add(g)
    part(new THREE.BoxGeometry(0.2, 0.16, 0.012), [0, 0, 0.006], undefined, g)
    part(new THREE.BoxGeometry(0.035, 0.025, 0.16), [0, -0.03, 0.09], undefined, g)
    part(new THREE.BoxGeometry(SW + 0.02, 0.022, SH + 0.02), [0, -0.01, 0.12 + SH / 2], undefined, g)
    const canvas = document.createElement('canvas')
    canvas.width = CW
    canvas.height = CH
    const ctx = canvas.getContext('2d')!
    const tex = keep(new THREE.CanvasTexture(canvas))
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    const mesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(SW, SH)), keep(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })))
    mesh.position.set(0, 0.0025, 0.12 + SH / 2)
    mesh.rotation.x = Math.PI / 2
    mesh.rotateY(Math.PI) // face +y, toward the operators, with the picture upright
    g.add(mesh)
    screens.push({ canvas, ctx, tex, mesh })
  }

  // ---- the rover's own cameras, for the Driver and Drone screens
  const feedSize = opts.mobile ? 192 : 256
  const rtDrive = keep(new THREE.WebGLRenderTarget(feedSize, Math.round(feedSize * 0.75), { colorSpace: THREE.SRGBColorSpace }))
  const rtDrone = keep(new THREE.WebGLRenderTarget(feedSize, Math.round(feedSize * 0.75), { colorSpace: THREE.SRGBColorSpace }))
  const driveCam = new THREE.PerspectiveCamera(68, 4 / 3, 0.03, 30)
  driveCam.up.set(0, 0, 1)
  driveCam.position.set(0.26, 0.05, -0.1)
  driveCam.lookAt(2.5, 0.15, G - 0.35)
  const droneCam = new THREE.PerspectiveCamera(50, 4 / 3, 0.1, 40)
  droneCam.up.set(0, 0, 1)
  // feed areas inside the Drone (3) and Driver (4) screens, as fractions of the screen: x, y from top, w, h
  const FEED = { 3: [0.03, 0.15, 0.94, 0.56], 4: [0.03, 0.15, 0.94, 0.5] } as const
  for (const [k, rt] of [
    [3, rtDrone],
    [4, rtDrive],
  ] as const) {
    const [fx, fy, fw, fh] = FEED[k]
    const pl = new THREE.Mesh(keep(new THREE.PlaneGeometry(SW * fw, SH * fh)), keep(new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false })))
    pl.position.set((fx + fw / 2 - 0.5) * SW, 0.0005, (0.5 - (fy + fh / 2)) * SH)
    pl.rotation.x = -Math.PI / 2
    // child of the screen plane: its local y is the screen's up
    pl.rotation.set(0, 0, 0)
    pl.position.set((fx + fw / 2 - 0.5) * SW, (0.5 - (fy + fh / 2)) * SH, 0.0008)
    screens[k].mesh.add(pl)
    feedPlanes.push(pl)
  }

  // ================================================================ drawing the screens
  const MONO = '"SF Mono", Menlo, Consolas, ui-monospace, monospace'
  const C = { bg: '#111218', panel: '#171820', cell: '#1e1f28', fg: '#ecebe4', muted: '#8d8b84', line: 'rgba(236,235,228,0.12)', ok: '#72d08e' }
  const acc = '#' + accent.getHexString()
  const u = CW / 360 // drawing unit

  function chrome(ctx: CanvasRenderingContext2D, i: number) {
    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, CW, CH)
    ctx.textBaseline = 'alphabetic'
    // status band
    ctx.fillStyle = C.muted
    ctx.font = `${9 * u}px ${MONO}`
    ctx.fillText(`${T.console.screen.toUpperCase()} ${i + 1} · ${T.console.mission.toUpperCase()}`, 10 * u, 17 * u)
    ctx.fillStyle = C.fg
    ctx.font = `600 ${14 * u}px system-ui, sans-serif`
    ctx.fillText(T.seats[i], 10 * u, 36 * u)
    ctx.fillStyle = C.muted
    ctx.font = `${8 * u}px ${MONO}`
    ctx.fillText(T.console.link.toUpperCase(), 190 * u, 17 * u)
    ctx.fillText(T.console.battery.toUpperCase(), 240 * u, 17 * u)
    ctx.fillStyle = C.fg
    ctx.font = `${13 * u}px ${MONO}`
    ctx.fillText('-66', 190 * u, 35 * u)
    ctx.fillText('94', 240 * u, 35 * u)
    ctx.fillStyle = '#4a1114'
    ctx.fillRect(296 * u, 12 * u, 54 * u, 28 * u)
    ctx.strokeStyle = '#a8171f'
    ctx.strokeRect(296.5 * u, 12.5 * u, 53 * u, 27 * u)
    ctx.fillStyle = '#ff8a84'
    ctx.font = `${10 * u}px ${MONO}`
    ctx.fillText(T.console.stop.toUpperCase(), 307 * u, 30 * u)
    ctx.fillStyle = C.line
    ctx.fillRect(0, 48 * u, CW, 1)
    // tabs
    let x = 10 * u
    ctx.font = `${9 * u}px ${MONO}`
    T.console.tabs[i].forEach((t, k) => {
      const on = k === (i === 1 ? 1 : 0)
      ctx.fillStyle = on ? C.fg : C.muted
      ctx.fillText(t.toUpperCase(), x, 64 * u)
      const w = ctx.measureText(t.toUpperCase()).width
      if (on) {
        ctx.fillStyle = acc
        ctx.fillRect(x, 69 * u, w, 2 * u)
      }
      x += w + 16 * u
    })
    ctx.fillStyle = C.line
    ctx.fillRect(0, 72 * u, CW, 1)
  }
  function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title?: string) {
    ctx.fillStyle = C.panel
    ctx.fillRect(x * u, y * u, w * u, h * u)
    if (title) {
      ctx.fillStyle = C.muted
      ctx.font = `${8 * u}px ${MONO}`
      ctx.fillText(title.toUpperCase(), (x + 7) * u, (y + 14) * u)
    }
  }
  const bottom = CH / u - 8

  function technician(ctx: CanvasRenderingContext2D, p: number) {
    chrome(ctx, 0)
    panel(ctx, 6, 80, 348, 128, T.console.readiness)
    T.readiness.forEach((r, k) => {
      const x = 12 + (k % 2) * 170
      const y = 96 + Math.floor(k / 2) * 27
      ctx.fillStyle = C.cell
      ctx.fillRect(x * u, y * u, 164 * u, 22 * u)
      ctx.fillStyle = C.fg
      ctx.font = `${10 * u}px ${MONO}`
      ctx.fillText(r, (x + 7) * u, (y + 15) * u)
      ctx.fillStyle = C.ok
      ctx.fillText('OK', (x + 140) * u, (y + 15) * u)
    })
    panel(ctx, 6, 214, 348, bottom - 214, T.console.bandwidth)
    T.cameras.forEach((c, k) => {
      const y = 240 + k * 26
      ctx.fillStyle = C.fg
      ctx.font = `${9.5 * u}px ${MONO}`
      ctx.fillText(c, 13 * u, (y + 9) * u)
      ctx.fillStyle = C.cell
      ctx.fillRect(118 * u, y * u, 228 * u, 9 * u)
      const v = 0.5 + 0.38 * Math.abs(Math.sin(k * 1.7 + p * 60 + Math.sin(p * 17 + k)))
      ctx.fillStyle = '#9b9a94'
      ctx.fillRect(118 * u, y * u, 228 * u * v, 9 * u)
    })
  }

  function armOperator(ctx: CanvasRenderingContext2D, q: number[], gripper: number) {
    chrome(ctx, 1)
    // side view, metres, like the real Kinematics tab
    panel(ctx, 6, 80, 348, 300, T.arm)
    const ox = 60
    const oy = 300
    const sc = 175
    ctx.strokeStyle = 'rgba(236,235,228,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(14 * u, (oy + 64) * u)
    ctx.lineTo(346 * u, (oy + 64) * u)
    ctx.stroke()
    ctx.setLineDash([3 * u, 4 * u])
    ctx.beginPath()
    ctx.arc(ox * u, (oy - spec.shoulder_h * sc) * u, (spec.upper + spec.fore + spec.wrist + spec.finger) * sc * u, -Math.PI / 2, 0.45)
    ctx.stroke()
    ctx.setLineDash([])
    const [, sh, el, wp] = q
    const a1 = sh
    const a2 = sh + el
    const a3 = a2 + wp
    const pts = [[0, spec.shoulder_h]]
    pts.push([pts[0][0] + spec.upper * Math.cos(a1), pts[0][1] + spec.upper * Math.sin(a1)])
    pts.push([pts[1][0] + spec.fore * Math.cos(a2), pts[1][1] + spec.fore * Math.sin(a2)])
    pts.push([pts[2][0] + (spec.wrist + spec.finger) * Math.cos(a3), pts[2][1] + (spec.wrist + spec.finger) * Math.sin(a3)])
    ctx.strokeStyle = C.fg
    ctx.lineWidth = 3 * u
    ctx.beginPath()
    pts.forEach(([x, y], k) => (k ? ctx.lineTo((ox + x * sc) * u, (oy - y * sc) * u) : ctx.moveTo((ox + x * sc) * u, (oy - y * sc) * u)))
    ctx.stroke()
    ctx.fillStyle = C.fg
    for (const [x, y] of pts) {
      ctx.beginPath()
      ctx.arc((ox + x * sc) * u, (oy - y * sc) * u, 3.5 * u, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = acc
    ctx.font = `${9 * u}px ${MONO}`
    ctx.fillText(`${Math.round(gripper * 100)}%`, (ox + pts[3][0] * sc + 8) * u, (oy - pts[3][1] * sc) * u)
    // joint bars
    panel(ctx, 6, 386, 348, bottom - 386, T.console.armJoints)
    T.joints.forEach((j, k) => {
      const y = 414 + k * 30
      const [lo, hi] = spec.limits_deg[k]
      const deg = (q[k] * 180) / Math.PI
      ctx.fillStyle = C.fg
      ctx.font = `${9.5 * u}px ${MONO}`
      ctx.fillText(j, 13 * u, (y + 10) * u)
      ctx.fillStyle = C.cell
      ctx.fillRect(110 * u, y * u, 190 * u, 13 * u)
      ctx.fillStyle = C.fg
      ctx.fillRect((110 + 190 * Math.max(0, Math.min(1, (deg - lo) / (hi - lo)))) * u - 1, y * u, 2.5 * u, 13 * u)
      ctx.fillText(`${deg >= 0 ? '+' : ''}${deg.toFixed(0)}°`, 310 * u, (y + 10) * u)
    })
  }

  function navigator(ctx: CanvasRenderingContext2D, p: number) {
    chrome(ctx, 2)
    panel(ctx, 6, 80, 348, bottom - 80)
    ctx.strokeStyle = 'rgba(236,235,228,0.07)'
    ctx.lineWidth = 1
    for (let x = 6; x < 354; x += 38) {
      ctx.beginPath()
      ctx.moveTo(x * u, 80 * u)
      ctx.lineTo(x * u, bottom * u)
      ctx.stroke()
    }
    for (let y = 80; y < bottom; y += 38) {
      ctx.beginPath()
      ctx.moveTo(6 * u, y * u)
      ctx.lineTo(354 * u, y * u)
      ctx.stroke()
    }
    const route = [
      [70, 560],
      [120, 470],
      [200, 430],
      [230, 330],
      [300, 220],
      [280, 130],
    ]
    ctx.strokeStyle = acc
    ctx.setLineDash([5 * u, 5 * u])
    ctx.lineWidth = 1.5 * u
    ctx.beginPath()
    route.forEach(([x, y], k) => (k ? ctx.lineTo(x * u, y * u) : ctx.moveTo(x * u, y * u)))
    ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle = C.fg
    for (const k of [0, 3, 5]) {
      ctx.beginPath()
      ctx.arc(route[k][0] * u, route[k][1] * u, 7 * u, 0, Math.PI * 2)
      ctx.stroke()
    }
    // the rover, part way along the second leg
    const f = 0.35 + 0.1 * Math.sin(p * 20)
    const rx = route[1][0] + (route[2][0] - route[1][0]) * f
    const ry = route[1][1] + (route[2][1] - route[1][1]) * f
    ctx.fillStyle = C.fg
    ctx.beginPath()
    ctx.moveTo(rx * u, (ry - 10) * u)
    ctx.lineTo((rx + 8) * u, (ry + 7) * u)
    ctx.lineTo((rx - 8) * u, (ry + 7) * u)
    ctx.fill()
  }

  function feedScreen(ctx: CanvasRenderingContext2D, i: 3 | 4) {
    chrome(ctx, i)
    const [fx, fy, fw, fh] = FEED[i]
    ctx.fillStyle = '#000'
    ctx.fillRect(fx * CW, fy * CH, fw * CW, fh * CH)
    ctx.fillStyle = C.muted
    ctx.font = `${8 * u}px ${MONO}`
    const y2 = (fy + fh) * CH / u
    if (i === 3) {
      panel(ctx, 6, y2 + 8, 348, bottom - y2 - 8, T.console.battery)
      ctx.fillStyle = C.fg
      ctx.font = `${10 * u}px ${MONO}`
      ctx.fillText('71%', 13 * u, (y2 + 44) * u)
      ctx.fillStyle = C.cell
      ctx.fillRect(110 * u, (y2 + 35) * u, 230 * u, 10 * u)
      ctx.fillStyle = '#9b9a94'
      ctx.fillRect(110 * u, (y2 + 35) * u, 230 * 0.71 * u, 10 * u)
    } else {
      const w = 171
      for (let k = 0; k < 2; k++) {
        panel(ctx, 6 + k * (w + 6), y2 + 8, w, bottom - y2 - 8, T.console.driveFeeds[k + 1])
      }
    }
    ctx.fillStyle = 'rgba(236,235,228,0.75)'
    ctx.font = `${8.5 * u}px ${MONO}`
    ctx.fillText((i === 3 ? T.console.droneFeed : T.console.driveFeeds[0]).toUpperCase(), (fx * CW) + 7 * u, (fy * CH) + 14 * u)
  }

  // static screens are drawn once; the moving ones each frame they are on screen
  navigator(screens[2].ctx, 0)
  feedScreen(screens[3].ctx, 3)
  feedScreen(screens[4].ctx, 4)
  for (const k of [2, 3, 4]) screens[k].tex.needsUpdate = true

  return {
    setTerrain(v) {
      const r = v <= 0 ? 0 : 0.6 + v * 17
      groundMat.uniforms.uReveal.value = r
      ground.visible = v > 0
      // the table arrives with the ground under it
      revealed = r > tableC.distanceTo(roverC) - 1.0
      station.visible = shown && revealed
    },
    update(p, q, gripper, renderer, feeds) {
      technician(screens[0].ctx, p)
      screens[0].tex.needsUpdate = true
      armOperator(screens[1].ctx, q, gripper)
      screens[1].tex.needsUpdate = true
      navigator(screens[2].ctx, p)
      screens[2].tex.needsUpdate = true
      if (feeds) {
        // the drone circles slowly above the rover
        const a = -0.9 + p * 4
        droneCam.position.set(0.3 + Math.cos(a) * 1.6, Math.sin(a) * 1.6, 3.4)
        droneCam.lookAt(0.4, 0, G)
        for (const f of feedPlanes) f.visible = false
        const prev = renderer.getRenderTarget()
        renderer.setRenderTarget(rtDrive)
        renderer.render(scene, driveCam)
        renderer.setRenderTarget(rtDrone)
        renderer.render(scene, droneCam)
        renderer.setRenderTarget(prev)
        for (const f of feedPlanes) f.visible = true
      }
    },
    view(aspect) {
      // behind the operators, eyes above the screens. Straight-on screens and the rover in frame pull
      // in different directions, so the camera stands part way round toward the line from the rover;
      // on a narrow screen all the way, so the rover sits beyond the table instead of beside it.
      const T0 = new THREE.Vector3(TABLE.x, TABLE.y, G)
      const back = new THREE.Vector3(-Math.sin(TABLE.yaw), Math.cos(TABLE.yaw), 0) // station +y: where the operators sit
      const away = new THREE.Vector3(TABLE.x, TABLE.y, 0).normalize() // from the rover, through the table
      const narrow = aspect < 1
      const dir = back.clone().lerp(away, narrow ? 0.9 : 0.05).normalize()
      const far = narrow ? 4.6 + (1 - aspect) * 2.4 : 3.0
      const pos = T0.clone().addScaledVector(dir, far).add(new THREE.Vector3(0, 0, narrow ? 2.9 : 2.05))
      const rover = new THREE.Vector3(0.2, 0, G + 0.35)
      const look = T0.clone().add(new THREE.Vector3(0, 0, 0.85)).lerp(rover, narrow ? 0.42 : 0.5)
      return { pos, look, fov: narrow ? 44 : 38 }
    },
    setVisible(v) {
      shown = v
      station.visible = shown && revealed
    },
    dispose() {
      scene.remove(root)
      for (const d of disposables) d.dispose()
    },
  }
}
