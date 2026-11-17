import * as THREE from 'three'
import { governor, pixelRatio } from '../../lib/gpu'
import { ACT, SEAM, WALL, easeInOut, seg, smooth, trackTime, trackerAt } from './timeline'
import { createBase } from './base'
import { BONES, buildPhone } from './phone'

/**
 * The Loop section's two WebGL views, drawn from one baked Arm Pilot track:
 * the arm on the rover (world z-up, metres, origin at the top of the turret,
 * joint conventions as armtrack's fk), and the operator's side (ARKit world,
 * y-up), where the phone, or one of the other trackers, moves.
 */

type Spec = {
  shoulder_h: number
  upper: number
  fore: number
  wrist: number
  finger: number
  ground_z: number
  limits_deg: number[][]
  max_speed_deg: number
  scale: number
}
export type Track = { source: string; rate: number; fields: string[]; spec: Spec; frames: number[][] }

export type Sample = {
  t: number
  p: [number, number, number]
  q: [number, number, number, number]
  engaged: number
  gripCmd: number
  joints: number[]
  gripper: number
  target: [number, number, number]
  limit: number
  reachable: number
  speed: number
}

export type FrameInfo = { p: number; s: Sample; vel: number[]; spec: Spec; source: string }

export type Stage = {
  set(p: number): void
  jump(p: number): void
  setActive(active: boolean): void
  onFrame(fn: (f: FrameInfo) => void): void
  /** A point in arm-world metres, in arm-canvas pixels. */
  project(v: THREE.Vector3): { x: number; y: number } | null
  /** Joint axis positions in arm-world metres, for labels. */
  jointPoints(): THREE.Vector3[]
  dispose(): void
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u

export function sample(track: Track, t: number): Sample {
  const f = track.frames
  const r = track.rate
  const x = Math.max(0, Math.min(f.length - 1.0001, t * r))
  const i = Math.floor(x)
  const u = x - i
  const a = f[i]
  const b = f[i + 1]
  const L = (k: number) => lerp(a[k], b[k], u)
  const step = (k: number) => (u < 0.5 ? a[k] : b[k])
  // quaternions: keep b in a's hemisphere, then normalised lerp
  let qb = [b[4], b[5], b[6], b[7]]
  if (a[4] * qb[0] + a[5] * qb[1] + a[6] * qb[2] + a[7] * qb[3] < 0) qb = qb.map((v) => -v)
  const q = [0, 1, 2, 3].map((k) => lerp(a[4 + k], qb[k], u))
  const n = Math.hypot(...q) || 1
  return {
    t,
    p: [L(1), L(2), L(3)],
    q: [q[0] / n, q[1] / n, q[2] / n, q[3] / n],
    engaged: step(8),
    gripCmd: L(9),
    joints: [L(10), L(11), L(12), L(13), L(14)],
    gripper: L(15),
    target: [L(16), L(17), L(18)],
    limit: step(19),
    reachable: step(20),
    speed: L(21),
  }
}

/** armtrack's fk: joint angles to the tip and the gripper's approach direction, arm-world metres. */
export function fk(spec: Spec, q: number[]) {
  const [yaw, sh, el, wp] = q
  const a1 = sh
  const a2 = sh + el
  const a3 = a2 + wp
  const ex = spec.upper * Math.cos(a1)
  const ez = spec.shoulder_h + spec.upper * Math.sin(a1)
  const wx = ex + spec.fore * Math.cos(a2)
  const wz = ez + spec.fore * Math.sin(a2)
  const tool = spec.wrist + spec.finger
  const tx = wx + tool * Math.cos(a3)
  const tz = wz + tool * Math.sin(a3)
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return {
    tip: new THREE.Vector3(tx * c, tx * s, tz),
    wrist: new THREE.Vector3(wx * c, wx * s, wz),
    approach: new THREE.Vector3(Math.cos(a3) * c, Math.cos(a3) * s, Math.sin(a3)),
  }
}

/** ArUco DICT_4X4_50 markers 0 to 5, inner 4x4 bits, row-major (the wand's cube). */
const ARUCO = ['1011010100110010', '0000111110011010', '0011001100101101', '1001100101000110', '0101010010011110', '0111100111001101']

function markerTexture(bits: string, accent: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 96
  const g = c.getContext('2d')!
  g.fillStyle = '#f2f0ea'
  g.fillRect(0, 0, 96, 96)
  g.fillStyle = '#101014'
  g.fillRect(8, 8, 80, 80)
  g.fillStyle = '#f2f0ea'
  for (let i = 0; i < 16; i++) if (bits[i] === '1') g.fillRect(8 + 13.33 * (1 + (i % 4)), 8 + 13.33 * (1 + Math.floor(i / 4)), 13.4, 13.4)
  g.strokeStyle = accent
  g.lineWidth = 2
  g.strokeRect(1, 1, 94, 94)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.NearestFilter
  return t
}

export async function createStage(
  armCanvas: HTMLCanvasElement,
  opCanvas: HTMLCanvasElement,
  opts: { accent: string; tint: string; mobile: boolean },
): Promise<Stage> {
  const track: Track = await (await fetch('/media/loop/track.json')).json()
  const spec = track.spec
  const G = spec.ground_z
  const cap = opts.mobile ? 1.5 : 1.75
  let scale = 1

  const accent = new THREE.Color(opts.accent)
  const tint = new THREE.Color(opts.tint)
  const FG = new THREE.Color('#ecebe4')
  const RED = new THREE.Color('#ff6159')
  const fillColor = tint.clone().lerp(FG, 0.035)

  const mk = (canvas: HTMLCanvasElement) => {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    r.setClearColor(0x000000, 0)
    r.outputColorSpace = THREE.SRGBColorSpace
    return r
  }
  const armR = mk(armCanvas)
  const opR = mk(opCanvas)

  // ------------------------------------------------------------- materials
  const disposables: { dispose(): void }[] = []
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x)
  const fillMat = keep(new THREE.MeshBasicMaterial({ color: fillColor, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }))
  const line = (color: THREE.Color, opacity: number) => keep(new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }))
  const bodyLine = line(FG, 0.2)
  const armLine = line(FG, 0.72)
  const accentLine = line(accent, 0.9)

  function part(geo: THREE.BufferGeometry, parent: THREE.Object3D, mat: THREE.LineBasicMaterial, pos?: number[], rot?: number[], threshold = 24) {
    keep(geo)
    const g = new THREE.Group()
    g.add(new THREE.Mesh(geo, fillMat))
    const e = keep(new THREE.EdgesGeometry(geo, threshold))
    g.add(new THREE.LineSegments(e, mat))
    if (pos) g.position.set(pos[0], pos[1], pos[2])
    if (rot) g.rotation.set(rot[0], rot[1], rot[2])
    parent.add(g)
    return g
  }
  const box = (x: number, y: number, z: number, parent: THREE.Object3D, mat: THREE.LineBasicMaterial, pos?: number[], rot?: number[]) =>
    part(new THREE.BoxGeometry(x, y, z), parent, mat, pos, rot)
  const cyl = (axis: 'x' | 'y' | 'z', r: number, len: number, parent: THREE.Object3D, mat: THREE.LineBasicMaterial, pos?: number[], n = 20) =>
    part(new THREE.CylinderGeometry(r, r, len, n), parent, mat, pos, axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : undefined, 30)
  const beam = (a: THREE.Vector3, b: THREE.Vector3, w: number, parent: THREE.Object3D, mat: THREE.LineBasicMaterial) => {
    const d = new THREE.Vector3().subVectors(b, a)
    const g = part(new THREE.BoxGeometry(w, d.length(), w), parent, mat)
    g.position.copy(a).addScaledVector(d, 0.5)
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
    return g
  }
  function circle(r: number, axis: 'x' | 'y' | 'z', mat: THREE.LineBasicMaterial | THREE.LineDashedMaterial, n = 64) {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      const c = Math.cos(a) * r
      const s = Math.sin(a) * r
      pts.push(axis === 'z' ? new THREE.Vector3(c, s, 0) : axis === 'y' ? new THREE.Vector3(c, 0, s) : new THREE.Vector3(0, c, s))
    }
    const l = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(pts)), mat)
    if ((mat as THREE.LineDashedMaterial).isLineDashedMaterial) l.computeLineDistances()
    return l
  }

  // ============================================================= arm world
  const arm = new THREE.Scene()
  const armCam = new THREE.PerspectiveCamera(30, 1, 0.02, 60)
  armCam.up.set(0, 0, 1)

  // ground: a grid that fades out from the rover
  let gridMat: THREE.ShaderMaterial | null = null
  {
    const g = keep(new THREE.PlaneGeometry(12, 12))
    const m = keep(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uColor: { value: FG }, uAccent: { value: accent }, uFade: { value: 1 } },
        vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec2 vP; uniform vec3 uColor; uniform float uFade;
          float gridLine(vec2 p, float s){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s); return 1.0 - min(min(g.x, g.y), 1.0); }
          void main(){
            float d = length(vP - vec2(0.0, 0.0));
            float fade = 1.0 - smoothstep(0.8, 4.2, d);
            float a = gridLine(vP, 0.25) * 0.10 + gridLine(vP, 1.0) * 0.10;
            gl_FragColor = vec4(uColor, a * fade * uFade);
            #include <colorspace_fragment>
          }`,
      }),
    )
    const plane = new THREE.Mesh(g, m)
    plane.position.z = G
    arm.add(plane)
    gridMat = m
  }

  // how far the arm can reach, drawn on the ground; brightens when a target is out of range
  const reachMat = keep(new THREE.LineDashedMaterial({ color: accent, dashSize: 0.03, gapSize: 0.03, transparent: true, opacity: 0.18, depthWrite: false }))
  const reachR = spec.upper + spec.fore + spec.wrist + spec.finger
  const reach = circle(reachR, 'z', reachMat, 160)
  reach.position.z = G + 0.002
  arm.add(reach)

  // ------------------------------------------------------------- rover body (from armtrack's model)
  const rover = new THREE.Group()
  arm.add(rover)
  const WR = 0.12
  const WY = 0.43
  const HUBZ = G + WR
  box(0.72, 0.42, 0.22, rover, bodyLine, [-0.14, 0, -0.11])
  box(0.7, 0.4, 0.006, rover, bodyLine, [-0.14, 0, 0.003])
  for (const s of [-1, 1]) {
    for (const x of [0.36, -0.18, -0.68]) {
      const w = cyl('y', WR, 0.095, rover, bodyLine, [x, s * WY, HUBZ], 22)
      w.userData.wheel = true
      cyl('y', 0.072, 0.1, rover, bodyLine, [x, s * WY, HUBZ], 12)
      box(0.05, 0.012, HUBZ < -0.3 ? -0.33 - HUBZ : 0.1, rover, bodyLine, [x, s * (WY - 0.1), (HUBZ + -0.33) / 2])
    }
    const piv = new THREE.Vector3(-0.14, s * 0.24, -0.12)
    const fTop = new THREE.Vector3(0.36, s * (WY - 0.1), -0.3)
    const bog = new THREE.Vector3(-0.42, s * (WY - 0.1), -0.33)
    beam(piv, fTop, 0.034, rover, bodyLine)
    beam(piv, bog, 0.034, rover, bodyLine)
    beam(bog, new THREE.Vector3(-0.18, s * (WY - 0.1), -0.36), 0.03, rover, bodyLine)
    beam(bog, new THREE.Vector3(-0.68, s * (WY - 0.1), -0.3), 0.03, rover, bodyLine)
  }
  cyl('z', 0.016, 1.0, rover, bodyLine, [-0.46, 0.17, 0.5], 10)
  box(0.06, 0.08, 0.05, rover, bodyLine, [-0.45, 0.17, 1.02])

  // ------------------------------------------------------------- the arm
  const armG = new THREE.Group()
  arm.add(armG)
  cyl('z', 0.11, 0.022, armG, armLine, [0, 0, 0.011], 32)
  const yaw = new THREE.Group()
  yaw.position.z = 0.022
  armG.add(yaw)
  cyl('z', 0.095, 0.02, yaw, armLine, [0, 0, 0.01], 32)
  for (const s of [-1, 1]) {
    box(0.17, 0.012, 0.15, yaw, armLine, [-0.01, s * 0.07, 0.085])
    cyl('y', 0.046, 0.11, yaw, armLine, [0, s * 0.145, spec.shoulder_h - 0.022], 24)
  }
  const SH = spec.shoulder_h - 0.022
  const shoulder = new THREE.Group()
  shoulder.position.z = SH
  yaw.add(shoulder)
  cyl('y', 0.05, 0.13, shoulder, armLine, [0, 0, 0], 24)
  cyl('x', 0.029, spec.upper - 0.05, shoulder, armLine, [spec.upper / 2, 0, 0], 16)
  for (const f of [0.22, 0.42, 0.62]) cyl('x', 0.036, 0.03, shoulder, armLine, [spec.upper * f, 0, 0], 16)
  const elbow = new THREE.Group()
  elbow.position.x = spec.upper
  shoulder.add(elbow)
  cyl('y', 0.04, 0.115, elbow, armLine, [0, 0, 0], 24)
  cyl('y', 0.036, 0.07, elbow, armLine, [0, 0.095, 0], 20)
  cyl('x', 0.026, spec.fore - 0.07, elbow, armLine, [spec.fore / 2 - 0.005, 0, 0], 16)
  cyl('x', 0.033, 0.035, elbow, armLine, [spec.fore * 0.38, 0, 0], 16)
  const wrist = new THREE.Group()
  wrist.position.x = spec.fore
  elbow.add(wrist)
  for (const s of [-1, 1]) box(0.1, 0.008, 0.1, wrist, armLine, [0.01, s * 0.058, 0])
  cyl('y', 0.042, 0.1, wrist, armLine, [0, 0, 0], 24)
  cyl('x', 0.046, 0.06, wrist, armLine, [0.06, 0, 0], 20)
  const roll = new THREE.Group()
  roll.position.x = 0.09
  wrist.add(roll)
  cyl('x', 0.04, 0.04, roll, armLine, [0.02, 0, 0], 20)
  box(0.012, 0.12, 0.05, roll, armLine, [spec.wrist - 0.096, 0, 0])
  const fingers: THREE.Group[] = []
  for (const s of [-1, 1]) {
    const f = new THREE.Group()
    f.position.x = spec.wrist - 0.09
    roll.add(f)
    box(spec.finger - 0.02, 0.014, 0.034, f, accentLine, [(spec.finger - 0.02) / 2 + 0.02, 0, 0])
    f.userData.s = s
    fingers.push(f)
  }

  // joint rings: brighten with each joint's speed, red at a limit
  const ringDefs: { parent: THREE.Object3D; axis: 'x' | 'y' | 'z'; r: number; pos: number[] }[] = [
    { parent: armG, axis: 'z', r: 0.15, pos: [0, 0, 0.03] },
    { parent: shoulder, axis: 'y', r: 0.085, pos: [0, 0.2, 0] },
    { parent: elbow, axis: 'y', r: 0.07, pos: [0, 0.14, 0] },
    { parent: wrist, axis: 'y', r: 0.065, pos: [0, 0.075, 0] },
    { parent: roll, axis: 'x', r: 0.07, pos: [0.0, 0, 0] },
  ]
  const ringMats = ringDefs.map(() => line(accent, 0.3))
  const rings = ringDefs.map((d, i) => {
    const c = circle(d.r, d.axis, ringMats[i])
    c.position.set(d.pos[0], d.pos[1], d.pos[2])
    d.parent.add(c)
    return c
  })

  // where the operator is asking the tip to be, and the lag between
  const targetMat = line(accent, 0.9)
  const target = new THREE.LineSegments(keep(new THREE.EdgesGeometry(keep(new THREE.OctahedronGeometry(0.03)))), targetMat)
  arm.add(target)
  const lagMat = keep(new THREE.LineDashedMaterial({ color: accent, dashSize: 0.02, gapSize: 0.015, transparent: true, opacity: 0.8, depthWrite: false }))
  const lagGeo = keep(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]))
  const lag = new THREE.Line(lagGeo, lagMat)
  arm.add(lag)

  // the tip's path over the last two seconds
  const TRAIL = 60
  const trailGeo = keep(new THREE.BufferGeometry())
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3))
  trailGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3))
  const trail = new THREE.Line(trailGeo, keep(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false })))
  arm.add(trail)

  // a rock to pick up: found from the track, where the gripper first closes and opens again
  let tGrab = -1
  let tRel = -1
  for (const f of track.frames) {
    if (tGrab < 0 && f[8] && f[15] < 0.35) tGrab = f[0]
    else if (tGrab >= 0 && tRel < 0 && f[15] > 0.35) tRel = f[0]
  }
  const ROCK_R = 0.06
  const rockGeo = new THREE.IcosahedronGeometry(ROCK_R, 0)
  {
    const pa = rockGeo.attributes.position as THREE.BufferAttribute
    const h = (x: number, y: number, z: number) => Math.abs((Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453) % 1)
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i)
      const y = pa.getY(i)
      const z = pa.getZ(i)
      const k = 0.78 + 0.4 * h(Math.round(x * 1e4), Math.round(y * 1e4), Math.round(z * 1e4))
      pa.setXYZ(i, x * k * 1.15, y * k, z * k * 0.75)
    }
    rockGeo.computeVertexNormals()
  }
  const rock = part(rockGeo, arm, armLine, undefined, undefined, 1)
  const grabAt = tGrab >= 0 ? fk(spec, sample(track, tGrab).joints) : null
  const relAt = tRel >= 0 ? fk(spec, sample(track, tRel).joints) : null
  const rockRest = grabAt ? new THREE.Vector3(grabAt.tip.x, grabAt.tip.y, G + ROCK_R * 0.8) : new THREE.Vector3(0.9, 0, G + ROCK_R)
  const rockPos = (t: number) => {
    if (!grabAt || t < tGrab) return rockRest.clone()
    const held = (tt: number) => {
      const k = fk(spec, sample(track, tt).joints)
      return k.tip.addScaledVector(k.approach, -0.035)
    }
    if (tRel < 0 || t < tRel) {
      // ease from resting to held over the first half second, so it does not jump
      const u = smooth(seg(t, tGrab, tGrab + 0.5))
      return rockRest.clone().lerp(held(t), u)
    }
    const from = held(tRel)
    const dt = t - tRel
    const z = Math.max(G + ROCK_R * 0.8, from.z - 4.9 * dt * dt)
    return new THREE.Vector3(from.x, from.y, z)
  }
  void relAt

  // the ending: terrain, and the base station table with its screens
  const base = createBase(arm, { G, spec, accent, tint, fg: FG, fill: fillMat, line: line(FG, 0.42), mobile: opts.mobile })
  base.setVisible(false)

  // ============================================================= operator world (ARKit, y up)
  const op = new THREE.Scene()
  const opCam = new THREE.PerspectiveCamera(40, 1, 0.01, 10)
  const opFloorY = -0.42
  {
    const g = keep(new THREE.PlaneGeometry(3, 3))
    const m = keep(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uColor: { value: FG } },
        vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec2 vP; uniform vec3 uColor;
          float gridLine(vec2 p, float s){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s); return 1.0 - min(min(g.x, g.y), 1.0); }
          void main(){
            float fade = 1.0 - smoothstep(0.2, 0.9, length(vP - vec2(-0.05, 0.1)));
            gl_FragColor = vec4(uColor, gridLine(vP, 0.1) * 0.12 * fade);
            #include <colorspace_fragment>
          }`,
      }),
    )
    const floor = new THREE.Mesh(g, m)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = opFloorY
    op.add(floor)
  }

  // the phone: in its own ARKit camera frame (x bottom edge, y right side, z out of the screen)
  const phoneG = new THREE.Group()
  op.add(phoneG)
  const phone = buildPhone({ fill: fillMat, line, keep, fg: FG, accent, tint })
  phoneG.add(phone.group)

  // operator trail: the last three seconds, accent while the thumb is down
  const OTRAIL = 90
  const oTrailGeo = keep(new THREE.BufferGeometry())
  oTrailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(OTRAIL * 3), 3))
  oTrailGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(OTRAIL * 3), 3))
  const oTrailMat = keep(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }))
  const oTrail = new THREE.Line(oTrailGeo, oTrailMat)
  op.add(oTrail)

  // the hand, for the camera trackers
  const handGeo = keep(new THREE.BufferGeometry())
  handGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BONES.length * 6), 3))
  const handMat = line(FG, 0.9)
  const hand = new THREE.LineSegments(handGeo, handMat)
  op.add(hand)
  const jointsGeo = keep(new THREE.BufferGeometry())
  jointsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(21 * 3), 3))
  const jointsMat = keep(new THREE.PointsMaterial({ color: accent, size: opts.mobile ? 4 : 5, sizeAttenuation: false, transparent: true }))
  const handJoints = new THREE.Points(jointsGeo, jointsMat)
  op.add(handJoints)

  // cameras facing the operator, with rays to every landmark
  function frustum(at: THREE.Vector3, look: THREE.Vector3, mat: THREE.LineBasicMaterial) {
    const g = new THREE.Group()
    const d = 0.07
    const w = 0.05
    const h = 0.035
    const pts = [
      [0, 0, 0], [-w, -h, -d], [0, 0, 0], [w, -h, -d], [0, 0, 0], [w, h, -d], [0, 0, 0], [-w, h, -d],
      [-w, -h, -d], [w, -h, -d], [w, -h, -d], [w, h, -d], [w, h, -d], [-w, h, -d], [-w, h, -d], [-w, -h, -d],
    ].map((p) => new THREE.Vector3(p[0], p[1], p[2]))
    g.add(new THREE.LineSegments(keep(new THREE.BufferGeometry().setFromPoints(pts)), mat))
    g.position.copy(at)
    g.lookAt(look)
    g.rotateY(Math.PI) // lookAt points -z away from the target for non-cameras; flip so the pyramid opens toward it
    op.add(g)
    return g
  }
  const camMat = line(FG, 0.7)
  const aim = new THREE.Vector3(-0.1, -0.1, -0.1)
  const camL = frustum(new THREE.Vector3(-0.26, 0.02, -0.5), aim, camMat)
  const camR = frustum(new THREE.Vector3(0.06, 0.02, -0.5), aim, camMat)
  const camC = frustum(new THREE.Vector3(-0.1, 0.02, -0.5), aim, camMat)
  const rayGeo = keep(new THREE.BufferGeometry())
  rayGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 21 * 2 * 3), 3))
  const rayMat = line(accent, 0.16)
  const rays = new THREE.LineSegments(rayGeo, rayMat)
  op.add(rays)
  // the mono tracker's depth guess: a bracket along the ray through the wrist
  const depthGeo = keep(new THREE.BufferGeometry())
  depthGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6 * 3), 3))
  const depthMat = line(accent, 0.9)
  const depth = new THREE.LineSegments(depthGeo, depthMat)
  op.add(depth)

  // the marker wand: a 50 mm ArUco cube on a handle
  const wandG = new THREE.Group()
  phoneG.add(wandG)
  const cubeMats = ARUCO.map((b) => keep(new THREE.MeshBasicMaterial({ map: keep(markerTexture(b, opts.accent)) })))
  const cube = new THREE.Mesh(keep(new THREE.BoxGeometry(0.05, 0.05, 0.05)), cubeMats)
  // held like a torch: the handle along the hand's grip (the phone's long axis), the cube out in front
  cube.position.x = -0.082
  wandG.add(cube)
  const wandLine = line(FG, 0.85)
  cyl('x', 0.012, 0.13, wandG, wandLine, [0.008, 0, 0], 14)
  const wandMats = [...cubeMats]

  // what the operator camera must keep in view
  let lastFit = { key: '', d: 1, ctr: new THREE.Vector3() }
  const opBounds = (() => {
    // the phone's actual path (every fifth frame), with the phone's size around each point
    const drivePts: THREE.Vector3[] = []
    track.frames.forEach((f, i) => {
      if (i % 5) return
      for (const d of [[0.07, 0, 0], [-0.07, 0, 0], [0, 0.05, 0], [0, -0.05, 0], [0, 0, 0.07], [0, 0, -0.07]])
        drivePts.push(new THREE.Vector3(f[1] + d[0], f[2] + d[1], f[3] + d[2]))
    })
    const trackerPts = [...drivePts, camL.position.clone(), camR.position.clone(), camC.position.clone()]
    return { drivePts, trackerPts }
  })()

  // ============================================================= sizing
  let aw = 1
  let ah = 1
  let ow = 1
  let oh = 1
  const sizeArm = () => {
    aw = Math.max(1, armCanvas.clientWidth)
    ah = Math.max(1, armCanvas.clientHeight)
    armR.setPixelRatio(pixelRatio(aw, ah, cap, scale))
    armR.setSize(aw, ah, false)
    armCam.aspect = aw / ah
    armCam.updateProjectionMatrix()
  }
  const sizeOp = () => {
    ow = Math.max(1, opCanvas.clientWidth)
    oh = Math.max(1, opCanvas.clientHeight)
    opR.setPixelRatio(pixelRatio(ow, oh, cap, scale))
    opR.setSize(ow, oh, false)
    opCam.aspect = ow / oh
    opCam.updateProjectionMatrix()
  }
  sizeArm()
  sizeOp()
  // Sizes are checked at the start of every frame, after the page has laid out the panels for this
  // frame and before drawing. Resizing from a ResizeObserver instead would clear the canvas after it
  // was drawn, and the arm view would blink out while it widens to full screen.
  const gov = governor((k) => {
    scale = k
    sizeArm()
    sizeOp()
  })
  const fitSizes = () => {
    if (armCanvas.clientWidth !== aw || armCanvas.clientHeight !== ah) sizeArm()
    if (opCanvas.clientWidth !== ow || opCanvas.clientHeight !== oh) sizeOp()
  }
  const ro = new ResizeObserver(() => {
    if (!active) fitSizes()
  })
  ro.observe(armCanvas)
  ro.observe(opCanvas)

  // ============================================================= per frame
  const tmpQ = new THREE.Quaternion()
  const tmpV = new THREE.Vector3()
  const vmax = (spec.max_speed_deg * Math.PI) / 180
  const lim = spec.limits_deg.map(([a, b]) => [(a * Math.PI) / 180, (b * Math.PI) / 180])

  // camera: azimuth from the rover's front, elevation, distance, by scroll progress
  const CAM: [number, number, number, number][] = [
    // p, azimuth deg, elevation deg, distance m
    [0.0, -112, 34, 5.2],
    [0.06, -96, 20, 4.5],
    [0.35, -78, 22, 4.4],
    [0.64, -62, 24, 4.4],
    [0.84, -52, 26, 4.5],
    [1.0, -46, 28, 4.6],
  ]
  const camAt = (p: number) => {
    let i = 0
    while (i < CAM.length - 2 && p > CAM[i + 1][0]) i++
    const a = CAM[i]
    const b = CAM[i + 1]
    const u = smooth(seg(p, a[0], b[0]))
    return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]
  }

  function placeArm(p: number, s: Sample, vel: number[], rockAt: THREE.Vector3) {
    yaw.rotation.z = s.joints[0]
    shoulder.rotation.y = -s.joints[1]
    elbow.rotation.y = -s.joints[2]
    wrist.rotation.y = -s.joints[3]
    roll.rotation.x = s.joints[4]
    const spread = 0.012 + 0.035 * s.gripper
    for (const f of fingers) f.position.y = f.userData.s * spread

    for (let j = 0; j < 5; j++) {
      const atLimit = (s.limit >> j) & 1
      ringMats[j].color.copy(atLimit ? RED : accent)
      ringMats[j].opacity = atLimit ? 1 : 0.18 + 0.8 * Math.min(1, Math.abs(vel[j]) / vmax)
    }

    const k = fk(spec, s.joints)
    const tg = new THREE.Vector3(...s.target)
    const show = s.engaged ? 1 : 0
    target.position.copy(tg)
    target.rotation.z += 0.01
    targetMat.opacity = show * 0.9
    targetMat.color.copy(s.reachable ? accent : RED)
    const pa = lagGeo.attributes.position as THREE.BufferAttribute
    pa.setXYZ(0, k.tip.x, k.tip.y, k.tip.z)
    pa.setXYZ(1, tg.x, tg.y, tg.z)
    pa.needsUpdate = true
    lag.computeLineDistances()
    // the controller's overlays leave with the operator panel
    const keepOverlays = 1 - seg(p, WALL.panel[0], WALL.panel[1])
    targetMat.opacity *= keepOverlays
    lagMat.opacity = show * Math.min(1, k.tip.distanceTo(tg) / 0.03) * 0.8 * keepOverlays
    lagMat.color.copy(s.reachable ? accent : RED)
    reachMat.opacity = (0.14 + (s.reachable ? 0 : 0.6) * show) * keepOverlays
    ;(trail.material as THREE.LineBasicMaterial).opacity = 0.9 * keepOverlays
    for (const m of ringMats) m.opacity *= 0.35 + 0.65 * keepOverlays

    // tip trail
    const tp = trailGeo.attributes.position as THREE.BufferAttribute
    const tc = trailGeo.attributes.color as THREE.BufferAttribute
    for (let i = 0; i < TRAIL; i++) {
      const tt = Math.max(0, s.t - (2 * (TRAIL - 1 - i)) / (TRAIL - 1))
      const ki = fk(spec, sample(track, tt).joints)
      tp.setXYZ(i, ki.tip.x, ki.tip.y, ki.tip.z)
      const a = (i / (TRAIL - 1)) ** 1.5
      tmpV.set(tint.r, tint.g, tint.b).lerp(new THREE.Vector3(accent.r, accent.g, accent.b), a)
      tc.setXYZ(i, tmpV.x, tmpV.y, tmpV.z)
    }
    tp.needsUpdate = true
    tc.needsUpdate = true

    rock.position.copy(rockAt)

    // camera
    const [az, el, dist0] = camAt(p)
    const aspect = aw / ah
    const dist = dist0 * (aspect < 1.25 ? Math.pow(1.25 / aspect, 0.75) : 1)
    const look = new THREE.Vector3(0.3, 0.12, 0.02)
    const A = (az * Math.PI) / 180
    const E = (el * Math.PI) / 180
    const orbit = new THREE.Vector3(look.x + dist * Math.cos(E) * Math.cos(A), look.y + dist * Math.cos(E) * Math.sin(A), look.z + dist * Math.sin(E))
    const sw = easeInOut(seg(p, WALL.swing[0], WALL.swing[1]))
    if (sw <= 0) {
      armCam.position.copy(orbit)
      armCam.lookAt(look)
      armCam.fov = 30
    } else {
      // swing round a pivot between the rover and the table, so the camera arcs rather than slides
      const v = base.view(aspect)
      const pivot = look.clone().lerp(v.look, 0.5)
      const sph = (x: THREE.Vector3) => {
        const d = x.clone().sub(pivot)
        return { r: d.length(), az: Math.atan2(d.y, d.x), el: Math.asin(d.z / d.length()) }
      }
      const a0 = sph(orbit)
      const a1 = sph(v.pos)
      let daz = a1.az - a0.az
      if (daz > Math.PI) daz -= 2 * Math.PI
      if (daz < -Math.PI) daz += 2 * Math.PI
      const r = lerp(a0.r, a1.r, sw) + Math.sin(sw * Math.PI) * 0.8
      const az = a0.az + daz * sw
      const el = lerp(a0.el, a1.el, sw) + Math.sin(sw * Math.PI) * 0.12
      armCam.position.set(pivot.x + r * Math.cos(el) * Math.cos(az), pivot.y + r * Math.cos(el) * Math.sin(az), pivot.z + r * Math.sin(el))
      armCam.lookAt(look.clone().lerp(v.look, smooth(sw)))
      armCam.fov = lerp(30, v.fov, sw)
    }
    armCam.updateProjectionMatrix()
    armCam.updateMatrixWorld()
  }

  function placeOperator(p: number, s: Sample) {
    const tr = trackerAt(p)
    const inTrackers = p >= ACT.trackers[0]
    // weights for the four trackers: phone always during the drive, then each in turn
    const w = [0, 1, 2, 3].map((i) => (inTrackers ? Math.max(0, 1 - Math.abs(tr - i - 0.5 + 0.5) * 2.2) : i === 0 ? 1 : 0))
    if (inTrackers) {
      // hold each fully on screen for most of its quarter, crossfade at the boundaries
      const u = tr
      for (let i = 0; i < 4; i++) {
        const a = i - 0.15
        const b = i + 1 - 0.15
        w[i] = smooth(seg(u, a, a + 0.3)) * (1 - smooth(seg(u, b, b + 0.3)))
        if (i === 0 && u < 0.15) w[i] = 1
        if (i === 3 && u > 3.85) w[i] = 1
      }
    }
    const [wPhone, wStereo, wMono, wWand] = w

    tmpQ.set(s.q[0], s.q[1], s.q[2], s.q[3])
    const P = new THREE.Vector3(s.p[0], s.p[1], s.p[2])

    phoneG.position.copy(P)
    phoneG.quaternion.copy(tmpQ)
    phoneG.scale.setScalar(1.7)
    // the see-through hand stays throughout: its skin thins as its joints take over, and in the last
    // section it closes round the wand's handle
    phone.set({
      body: wPhone,
      ghost: wPhone + 0.22 * (wStereo + wMono) + 0.55 * wWand,
      wrap: smooth(wWand),
      engaged: !!s.engaged || wPhone < 0.5,
      grip: s.gripCmd,
      dt: frameDt,
    })
    phoneG.updateMatrixWorld(true)

    // operator trail, three seconds
    const op_ = oTrailGeo.attributes.position as THREE.BufferAttribute
    const oc = oTrailGeo.attributes.color as THREE.BufferAttribute
    for (let i = 0; i < OTRAIL; i++) {
      const tt = Math.max(0, s.t - (3 * (OTRAIL - 1 - i)) / (OTRAIL - 1))
      const si = sample(track, tt)
      op_.setXYZ(i, si.p[0], si.p[1], si.p[2])
      const a = 0.2 + 0.8 * (i / (OTRAIL - 1)) ** 1.2
      const c = si.engaged ? accent : FG
      const k = si.engaged ? a : a * 0.4
      oc.setXYZ(i, lerp(tint.r, c.r, k), lerp(tint.g, c.g, k), lerp(tint.b, c.b, k))
    }
    op_.needsUpdate = true
    oc.needsUpdate = true
    oTrailMat.opacity = Math.max(wPhone, wWand, 0.35)

    // the hand's joints: the see-through hand's own 21 landmarks, as the cameras would find them
    const wHand = Math.max(wStereo, wMono, 0.6 * wWand)
    const wandLead = wWand > Math.max(wStereo, wMono)
    hand.visible = handJoints.visible = wHand > 0.01
    if (hand.visible) {
      // noisy depth along the camera ray: a little for stereo, a lot for one camera
      const cam = wMono > wStereo ? camC.position : camL.position.clone().lerp(camR.position, 0.5)
      const ray = P.clone().sub(cam).normalize()
      const noise =
        (wMono > wStereo ? 0.022 * Math.sin(s.t * 7.3) * Math.sin(s.t * 2.1 + 1) : 0.003 * Math.sin(s.t * 13.1) * (0.3 + s.speed)) *
        Math.max(wStereo, wMono)
      const world = phone.landmarks().map((v) => phoneG.localToWorld(v.clone()).addScaledVector(ray, noise))
      const hp = handGeo.attributes.position as THREE.BufferAttribute
      BONES.forEach(([a, b], i) => {
        hp.setXYZ(i * 2, world[a].x, world[a].y, world[a].z)
        hp.setXYZ(i * 2 + 1, world[b].x, world[b].y, world[b].z)
      })
      hp.needsUpdate = true
      const jp = jointsGeo.attributes.position as THREE.BufferAttribute
      world.forEach((v, i) => jp.setXYZ(i, v.x, v.y, v.z))
      jp.needsUpdate = true
      handMat.opacity = 0.9 * wHand
      jointsMat.opacity = wHand

      if (!wandLead) {
        const rp = rayGeo.attributes.position as THREE.BufferAttribute
        const stereo = wStereo >= wMono
        const cams = [stereo ? camL : camC, camR]
        let n = 0
        cams.forEach((c, ci) => {
          world.forEach((v) => {
            const use = ci === 0 || stereo
            rp.setXYZ(n++, c.position.x, c.position.y, c.position.z)
            rp.setXYZ(n++, use ? v.x : c.position.x, use ? v.y : c.position.y, use ? v.z : c.position.z)
          })
        })
        rp.needsUpdate = true
        rayMat.opacity = 0.16 * Math.max(wStereo, wMono)
      }

      // depth bracket for mono
      const dp = depthGeo.attributes.position as THREE.BufferAttribute
      const wr = world[0]
      const span = 0.06
      const a = wr.clone().addScaledVector(ray, -span)
      const b = wr.clone().addScaledVector(ray, span)
      const side = new THREE.Vector3().crossVectors(ray, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(0.012)
      dp.setXYZ(0, a.x, a.y, a.z)
      dp.setXYZ(1, b.x, b.y, b.z)
      dp.setXYZ(2, a.x - side.x, a.y - side.y, a.z - side.z)
      dp.setXYZ(3, a.x + side.x, a.y + side.y, a.z + side.z)
      dp.setXYZ(4, b.x - side.x, b.y - side.y, b.z - side.z)
      dp.setXYZ(5, b.x + side.x, b.y + side.y, b.z + side.z)
      dp.needsUpdate = true
      depthMat.opacity = 0.9 * wMono
    }
    rays.visible = hand.visible || wWand > 0.01
    depth.visible = wMono > 0.01
    camL.visible = wStereo > 0.01
    camR.visible = wStereo > 0.01
    camC.visible = wMono > 0.01 || wWand > 0.01
    camMat.opacity = 0.7 * Math.max(wStereo, wMono, wWand)

    // the wand, in the hand
    wandG.visible = wWand > 0.01
    if (wandG.visible) {
      for (const m of wandMats) {
        m.transparent = wWand < 0.99
        m.opacity = wWand
      }
      wandLine.opacity = 0.85 * wWand
      if (wandLead) {
        // the camera sees the cube, not the hand
        const rp = rayGeo.attributes.position as THREE.BufferAttribute
        const c = cube.getWorldPosition(tmpV)
        for (let i = 0; i < rp.count; i += 2) {
          rp.setXYZ(i, camC.position.x, camC.position.y, camC.position.z)
          rp.setXYZ(i + 1, c.x, c.y, c.z)
        }
        rp.needsUpdate = true
        rayMat.opacity = 0.5 * wWand
      }
    }

    // operator camera: behind the operator's right shoulder, half following the phone;
    // for the camera trackers, higher, so the cameras in front and the hand both fit
    const k = inTrackers ? smooth(seg(p, ACT.trackers[0], ACT.trackers[0] + 0.025)) : 0
    // a fixed camera that frames everywhere the phone goes (and, for the trackers, the cameras too),
    // from behind the operator's right shoulder
    const dir = new THREE.Vector3(0.38, 0.55, 0.74).lerp(new THREE.Vector3(0.3, 0.72, 0.62), k).normalize()
    const aspect = ow / oh
    const fitKey = `${aspect.toFixed(3)}:${k.toFixed(3)}`
    if (fitKey !== lastFit.key) {
      // the nearest distance at which every corner of the box lands inside the frame,
      // leaving the bottom of the panel to the words
      const corners = k > 0 ? opBounds.trackerPts : opBounds.drivePts
      const box = new THREE.Box3().setFromPoints(corners)
      const ctr = box.getCenter(new THREE.Vector3())
      const bottom = aspect < 1 ? (k > 0 ? -0.28 : -0.42) : k > 0 ? -0.5 : -0.7
      let lo = 0.2
      let hi = 6
      for (let it = 0; it < 18; it++) {
        const d = (lo + hi) / 2
        opCam.clearViewOffset()
        opCam.position.copy(ctr).addScaledVector(dir, d)
        opCam.lookAt(ctr)
        opCam.updateMatrixWorld()
        let ok = true
        for (const c of corners) {
          const v = c.clone().project(opCam)
          if (Math.abs(v.x) > 0.78 || v.y > 0.66 || v.y < bottom) ok = false
        }
        if (ok) hi = d
        else lo = d
      }
      lastFit = { key: fitKey, d: hi, ctr }
      ;(window as unknown as { __loopFit?: unknown }).__loopFit = { ...lastFit, box: [box.min.toArray(), box.max.toArray()], aspect, fov: opCam.fov }
    }
    opCam.position.copy(lastFit.ctr).addScaledVector(dir, lastFit.d)
    opCam.lookAt(lastFit.ctr)
    opCam.clearViewOffset()
    opCam.updateMatrixWorld()
  }

  // ============================================================= loop
  let target_ = 0
  let cur = 0
  let raf = 0
  let last = 0
  let active = false
  let frameDt = 1
  const frameFns: ((f: FrameInfo) => void)[] = []

  const draw = () => {
    const t = trackTime(cur)
    let s = sample(track, t)
    const s0 = sample(track, Math.max(0, t - 0.1))
    const vel = s.joints.map((v, j) => (v - s0.joints[j]) / 0.1)
    let rockAt = rockPos(t)
    // where the drive ends and the tracker replay begins, the arm moves across rather than jumping
    const seam = cur > SEAM.at && cur < SEAM.at + SEAM.len ? smooth(seg(cur, SEAM.at, SEAM.at + SEAM.len)) : -1
    if (seam >= 0) {
      const e = sample(track, SEAM.from)
      const L = (a: number[], b: number[]) => a.map((v, i) => lerp(v, b[i], seam))
      s = {
        ...s,
        joints: L(e.joints, s.joints),
        gripper: lerp(e.gripper, s.gripper, seam),
        target: L(e.target, s.target) as [number, number, number],
        p: L(e.p, s.p) as [number, number, number],
        engaged: seam < 0.5 ? e.engaged : s.engaged,
        limit: 0,
        reachable: 1,
      }
      rockAt = rockPos(SEAM.from).lerp(rockAt, seam)
    }
    // lay out the page for this frame first, then size the canvases to it, then draw
    for (const f of frameFns) f({ p: cur, s, vel, spec, source: track.source })
    fitSizes()
    const inWall = cur > WALL.terrain[0] - 0.005
    base.setVisible(inWall)
    base.setTerrain(smooth(seg(cur, WALL.terrain[0], WALL.terrain[1])))
    if (gridMat) gridMat.uniforms.uFade.value = 1 - seg(cur, WALL.terrain[0], WALL.terrain[0] + 0.03)
    placeArm(cur, s, vel, rockAt)
    if (cur > WALL.swing[0] - 0.01) base.update(cur, s.joints, s.gripper, armR, true)
    armR.render(arm, armCam)
    if (cur < WALL.panel[1] + 0.01) {
      placeOperator(cur, s)
      opR.render(op, opCam)
    }
  }
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016)
    gov.frame(now - last)
    last = now
    cur += (target_ - cur) * (1 - Math.exp(-dt * 8))
    frameDt = dt
    draw()
  }

  // compile every shader in parallel before the first frame, instead of stalling inside it
  await Promise.all([armR.compileAsync(arm, armCam), opR.compileAsync(op, opCam)])

  return {
    set(p) {
      target_ = p
    },
    jump(p) {
      target_ = cur = p
      frameDt = 1
      draw()
    },
    setActive(a) {
      if (a === active) return
      active = a
      if (a) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      } else cancelAnimationFrame(raf)
    },
    onFrame(fn) {
      frameFns.push(fn)
    },
    project(v) {
      tmpV.copy(v).project(armCam)
      if (tmpV.z > 1 || tmpV.z < -1) return null
      return { x: ((tmpV.x + 1) / 2) * aw, y: ((1 - tmpV.y) / 2) * ah }
    },
    jointPoints() {
      armG.updateMatrixWorld(true)
      return [
        new THREE.Vector3(0.09, -0.09, 0.03).applyMatrix4(armG.matrixWorld),
        shoulder.getWorldPosition(new THREE.Vector3()),
        elbow.getWorldPosition(new THREE.Vector3()),
        wrist.getWorldPosition(new THREE.Vector3()),
        roll.localToWorld(new THREE.Vector3(0.03, 0, 0)),
      ]
    },
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      base.dispose()
      for (const d of disposables) d.dispose()
      rings.length = 0
      armR.dispose()
      opR.dispose()
      armR.forceContextLoss()
      opR.forceContextLoss()
    },
  }
}
