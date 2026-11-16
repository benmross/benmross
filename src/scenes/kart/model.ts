import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * The kart, modelled from photographs: a red tube frame with a roll cage wrapped in
 * white tape and red LED strings, knobbly tyres, a bench seat, the racing wheel and
 * touchscreen on the dash bar, the battery under the floor, and the motor, chain and
 * cooling loop behind the seat.
 *
 * Kart frame: origin on the ground under the middle of the kart, +x forward, +y up,
 * +z to the driver's right, metres.
 */

export type V3 = [number, number, number]
export type WireKind = 'cmd' | 'tel' | 'pwr'
export type WireSpec = { id: string; kind: WireKind; pts: V3[]; r?: number; reverse?: boolean; spacing?: number; speed?: number }

export const AXLE = { front: 0.64, rear: -0.66, frontHalf: 0.53, rearHalf: 0.57, frontR: 0.19, rearR: 0.205 }

/** Where things are, for labels, signal ends and the camera. */
export const ANCHOR = {
  motor: [-0.55, 0.43, 0.1],
  chain: [-0.61, 0.3, -0.1],
  esc: [-0.55, 0.4, -0.28],
  radiator: [-0.47, 0.74, 0.03],
  pump: [-0.64, 0.7, 0.25],
  pack: [0.3, 0.23, 0.2],
  bms: [0.55, 0.22, 0.29],
  contactor: [-0.1, 0.24, 0.3],
  esp32: [0.61, 0.345, -0.24],
  talon: [0.67, 0.2, -0.06],
  cim: [0.76, 0.21, -0.2],
  pot: [0.64, 0.3, 0.0],
  wheel: [0.27, 0.9, 0.0],
  wheelBase: [0.47, 0.8, 0.0],
  screen: [0.375, 0.62, 0.22],
  teensy: [0.445, 0.59, 0.165],
  pi: [0.445, 0.615, 0.265],
} satisfies Record<string, V3>

const TUBE_R = 0.0165

export type Kart = {
  root: THREE.Group
  /** Everything that leans with the chassis: kart-frame points live in here. */
  body: THREE.Group
  /** `chain` is metres of chain travel. Front wheels turn by `steer` (road wheel angle, positive left); all four roll. */
  pose(o: { steer: number; roll: number; frontSpin: number; rearSpin: number; chain: number; fans: number }): void
  /** 0 solid, 1 see-through: the body, and separately the dashboard's case. */
  ghost(body: number, dashCase: number): void
  screen: { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture }
  /** Signal routes, kart frame. */
  wires: WireSpec[]
  /** LED brightness, for a flicker. */
  leds: THREE.MeshBasicMaterial
  dispose(): void
}

export function buildKart(opts: { accent: string; shadows: boolean }): Kart {
  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)
  const disposables: { dispose(): void }[] = []
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x)

  // ------------------------------------------------------------- materials
  // body materials go see-through together; core materials (the electronics) never do
  const bodyMats: THREE.MeshStandardMaterial[] = []
  const caseMats: THREE.MeshStandardMaterial[] = []
  const std = (color: string, rough = 0.6, metal = 0, extra: THREE.MeshStandardMaterialParameters = {}, group: THREE.MeshStandardMaterial[] | null = bodyMats) => {
    const m = keep(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }))
    m.userData.opacity = extra.opacity ?? 1
    group?.push(m)
    return m
  }
  const core = (color: string, rough = 0.5, metal = 0, emissive = '#000000', ei = 1) =>
    std(color, rough, metal, { emissive: new THREE.Color(emissive), emissiveIntensity: ei }, null)

  const RED = '#d8181c'
  const stripeTex = keep(stripes(RED))
  const red = std(RED, 0.42, 0.25)
  const wrap = std('#ffffff', 0.5, 0.1, { map: stripeTex })
  const steel = std('#8d9096', 0.38, 0.85)
  const darkSteel = std('#3a3632', 0.55, 0.7)
  const black = std('#101012', 0.55, 0.15)
  const rubber = std('#0b0b0c', 0.92, 0)
  const vinyl = std('#0c0c0e', 0.42, 0.05)
  const plastic = std('#16161a', 0.5, 0.1)
  const white = std('#e9e6df', 0.6, 0)
  const foam = std('#ff4a4a', 0.95, 0, { emissive: new THREE.Color('#ff2a2a'), emissiveIntensity: 0.03 })
  const deckMat = std('#0d0d0f', 0.35, 0.2)
  const cellMat = std('#1f55c8', 0.45, 0.25)
  const hose = std('#e8eef2', 0.3, 0, { transparent: true, opacity: 0.55 })
  const clear = std('#dfe8f0', 0.08, 0, { transparent: true, opacity: 0.28 })
  const silver = std('#c9ccd1', 0.3, 0.9)
  const blue = std('#2a6fe0', 0.5, 0.05)
  const caseMat = std('#131316', 0.6, 0.05, {}, caseMats)

  const shadow = (m: THREE.Mesh, cast = true) => {
    if (opts.shadows) {
      m.castShadow = cast
      m.receiveShadow = true
    }
    return m
  }
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, pos?: V3, rot?: V3, parent: THREE.Object3D = body) => {
    const m = shadow(new THREE.Mesh(keep(geo), mat))
    if (pos) m.position.set(...pos)
    if (rot) m.rotation.set(...rot)
    parent.add(m)
    return m
  }
  const box = (sx: number, sy: number, sz: number, mat: THREE.Material, pos?: V3, rot?: V3, parent?: THREE.Object3D) =>
    add(new THREE.BoxGeometry(sx, sy, sz), mat, pos, rot, parent)
  const rbox = (sx: number, sy: number, sz: number, r: number, mat: THREE.Material, pos?: V3, rot?: V3, parent?: THREE.Object3D) =>
    add(new RoundedBoxGeometry(sx, sy, sz, 3, r), mat, pos, rot, parent)
  /** A cylinder along x, y or z. */
  const cyl = (axis: 'x' | 'y' | 'z', r: number, len: number, mat: THREE.Material, pos?: V3, parent?: THREE.Object3D, n = 24, r2 = r) => {
    const g = new THREE.CylinderGeometry(r2, r, len, n)
    if (axis === 'x') g.rotateZ(-Math.PI / 2)
    if (axis === 'z') g.rotateX(Math.PI / 2)
    return add(g, mat, pos, undefined, parent)
  }

  // ------------------------------------------------------------- the frame
  const ledPts: THREE.Vector3[] = []
  /** A bent tube through the points, corners rounded. `led` strings lights along it. */
  function tube(pts: V3[], mat: THREE.Material, o: { r?: number; bend?: number; led?: boolean; parent?: THREE.Object3D; cast?: boolean } = {}) {
    const r = o.r ?? TUBE_R
    const curve = rounded(pts, o.bend ?? 0.07)
    const len = curve.getLength()
    const g = new THREE.TubeGeometry(curve, Math.max(6, Math.round(len / 0.03)), r, 10, false)
    // one turn of tape every 9 cm
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / 0.09))
    const m = add(g, mat, undefined, undefined, o.parent)
    if (o.cast === false) m.castShadow = false
    if (o.led) {
      const n = Math.floor(len / 0.055)
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n
        const p = curve.getPointAt(u)
        const t = curve.getTangentAt(u)
        const side = new THREE.Vector3(0, 1, 0).cross(t)
        if (side.lengthSq() < 1e-4) side.set(0, 0, 1)
        side.normalize()
        const up = t.clone().cross(side)
        const a = i * 2.4
        ledPts.push(p.addScaledVector(side, Math.cos(a) * (r + 0.004)).addScaledVector(up, Math.sin(a) * (r + 0.004)))
      }
    }
    return m
  }

  const both = (f: (s: 1 | -1) => void) => (f(-1), f(1))
  const FY = 0.15 // floor rails
  const aBase = (s: number): V3 => [0.78, FY + 0.01, 0.37 * s]
  const roofF = (s: number): V3 => [-0.02, 1.36, 0.33 * s]
  const roofR = (s: number): V3 => [-0.5, 1.34, 0.33 * s]
  const pillarBase = (s: number): V3 => [-0.44, 0.3, 0.4 * s]
  const mix = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
  const DASH_F = 0.47
  const dashEnd = (s: number) => mix(aBase(s), roofF(s), DASH_F)

  both((s) => {
    // floor rail, kicking up to the rear cradle
    tube([[0.8, FY, 0.37 * s], [-0.1, FY, 0.4 * s], [-0.4, 0.27, 0.4 * s], [-1.0, 0.27, 0.4 * s]], red)
    // A-pillar: bare low down, taped and lit above the dash bar
    tube([aBase(s), mix(aBase(s), roofF(s), DASH_F - 0.05)], red)
    tube([mix(aBase(s), roofF(s), DASH_F - 0.05), roofF(s)], wrap, { led: true })
    // roof side and rear pillar
    tube([roofF(s), roofR(s), mix(roofR(s), pillarBase(s), 0.45)], wrap, { led: true, bend: 0.09 })
    tube([mix(roofR(s), pillarBase(s), 0.45), pillarBase(s)], red)
    // side guard, from the rear pillar forward and down to the A-pillar
    tube([[-0.445, 0.5, 0.385 * s], [0.12, 0.5, 0.43 * s], mix(aBase(s), roofF(s), 0.16)], s < 0 ? wrap : red, { bend: 0.16, led: s < 0 })
    // rear hoop post
    tube([[-1.0, 0.27, 0.4 * s], [-1.0, 0.47, 0.4 * s]], red)
  })
  // cross members
  for (const x of [0.8, 0.36, -0.1]) tube([[x, FY, -0.37], [x, FY, 0.37]], red)
  tube([[-0.4, 0.27, -0.4], [-0.4, 0.27, 0.4]], red)
  tube([[-1.0, 0.27, -0.4], [-1.0, 0.27, 0.4]], red)
  tube([roofF(-1), roofF(1)], wrap, { led: true })
  tube([roofR(-1), roofR(1)], wrap, { led: true })
  tube([dashEnd(-1), dashEnd(1)], red)
  // front bumper and the rear hoop round the motor
  tube([[0.8, FY, -0.37], [0.99, 0.19, -0.3], [0.99, 0.19, 0.3], [0.8, FY, 0.37]], red, { bend: 0.1 })
  tube([[-0.445, 0.47, -0.4], [-1.0, 0.47, -0.4], [-1.0, 0.47, 0.4], [-0.445, 0.47, 0.4]], wrap, { bend: 0.12 })
  // the post behind the seat, and the headrest plate with its pad
  tube([[-0.5, 1.34, 0.0], [-0.47, 0.75, 0.0], [-0.42, 0.29, 0.0]], red, { bend: 0.2 })
  box(0.012, 0.1, 0.72, red, [-0.468, 0.97, 0], [0, 0, 0.05])
  cyl('z', 0.047, 0.62, foam, [-0.455, 1.045, -0.02], undefined, 20)
  cyl('z', 0.05, 0.56, foam, [-0.02, 1.375, -0.04], undefined, 20)
  // dash bar tabs
  for (const z of [-0.2, 0, 0.2]) box(0.05, 0.006, 0.07, red, [dashEnd(1)[0] - 0.03, dashEnd(1)[1] + 0.012, z])

  // LED strings: one draw call of small lamps
  const leds = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.13, 0.08), toneMapped: false }))
  {
    const g = keep(new THREE.SphereGeometry(0.0055, 6, 5))
    const im = new THREE.InstancedMesh(g, leds, ledPts.length)
    const mtx = new THREE.Matrix4()
    ledPts.forEach((p, i) => im.setMatrixAt(i, mtx.makeTranslation(p.x, p.y, p.z)))
    body.add(im)
  }

  // ------------------------------------------------------------- floor and battery
  box(0.2, 0.004, 0.72, red, [0.7, FY + 0.005, 0]) // painted toe board
  box(0.66, 0.004, 0.72, darkSteel, [0.27, FY + 0.005, 0])
  // 24 cells in two rows under the deck
  {
    const g = keep(new RoundedBoxGeometry(0.05, 0.118, 0.165, 2, 0.006))
    const im = shadow(new THREE.InstancedMesh(g, cellMat, 24)) as THREE.InstancedMesh
    const top = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.036, 0.004, 0.03)), silver, 48)
    const m = new THREE.Matrix4()
    for (let i = 0; i < 24; i++) {
      const x = -0.02 + (i % 12) * 0.053
      const z = i < 12 ? -0.088 : 0.088
      im.setMatrixAt(i, m.makeTranslation(x, 0.224, z))
      top.setMatrixAt(i * 2, m.makeTranslation(x + 0.026, 0.286, z - 0.045))
      top.setMatrixAt(i * 2 + 1, m.makeTranslation(x + 0.026, 0.286, z + 0.045))
    }
    body.add(im, top)
  }
  box(0.68, 0.014, 0.74, deckMat, [0.28, 0.302, 0])
  {
    // the studs holding the deck down
    const im = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 6)), steel, 16)
    const m = new THREE.Matrix4()
    let i = 0
    for (const x of [-0.02, 0.18, 0.38, 0.58]) for (const z of [-0.33, -0.2, 0.2, 0.33]) im.setMatrixAt(i++, m.makeTranslation(x, 0.318, z))
    body.add(im)
  }
  // BMS: a black box with a paper label
  box(0.17, 0.05, 0.085, plastic, ANCHOR.bms)
  box(0.04, 0.001, 0.04, white, [ANCHOR.bms[0] + 0.03, ANCHOR.bms[1] + 0.026, ANCHOR.bms[2]])
  // main contactor
  cyl('x', 0.032, 0.07, core('#1b1b1f', 0.4, 0.3), ANCHOR.contactor)
  box(0.03, 0.02, 0.07, core('#b87333', 0.35, 0.9), [ANCHOR.contactor[0], ANCHOR.contactor[1] + 0.034, ANCHOR.contactor[2]])

  // ------------------------------------------------------------- seat
  for (let i = 0; i < 3; i++) rbox(0.165, 0.12, 0.76, 0.045, vinyl, [-0.04 - i * 0.15, 0.4 + i * 0.006, 0], [0, 0, 0.04])
  for (let i = 0; i < 2; i++) rbox(0.11, 0.125, 0.76, 0.045, vinyl, [-0.395 - i * 0.022, 0.5 + i * 0.105, 0], [0, 0, 0.2])
  box(0.44, 0.02, 0.7, darkSteel, [-0.2, 0.335, 0])

  // ------------------------------------------------------------- wheels
  const wheels: { spin: THREE.Group; steer?: THREE.Group; front: boolean }[] = []
  function wheel(x: number, z: number, r: number, w: number, front: boolean) {
    const side = Math.sign(z)
    const steer = new THREE.Group()
    steer.position.set(x, r, z)
    const spin = new THREE.Group()
    steer.add(spin)
    body.add(steer)
    // tyre: a rounded section turned round the axle
    const rim = r * 0.46
    const prof: THREE.Vector2[] = []
    const hw = w / 2
    const c = Math.min(0.05, hw * 0.7)
    prof.push(new THREE.Vector2(rim, -hw * 0.82))
    prof.push(new THREE.Vector2(r - c * 1.4, -hw))
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2)
      prof.push(new THREE.Vector2(r - c + Math.sin(a) * c, -hw + c - Math.cos(a) * c))
    }
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2)
      prof.push(new THREE.Vector2(r - c + Math.cos(a) * c, hw - c + Math.sin(a) * c))
    }
    prof.push(new THREE.Vector2(r - c * 1.4, hw))
    prof.push(new THREE.Vector2(rim, hw * 0.82))
    const tg = new THREE.LatheGeometry(prof, 36)
    tg.rotateX(Math.PI / 2)
    add(tg, rubber, undefined, undefined, spin)
    // knobs
    const rows = 3
    const per = 20
    const kg = keep(new RoundedBoxGeometry(0.03, 0.02, w / 4.4, 1, 0.004))
    const knobs = shadow(new THREE.InstancedMesh(kg, rubber, rows * per + per * 2)) as THREE.InstancedMesh
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const zAxis = new THREE.Vector3(0, 0, 1)
    let n = 0
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < per; i++) {
        const a = ((i + (j % 2) * 0.5) / per) * Math.PI * 2
        q.setFromAxisAngle(zAxis, a - Math.PI / 2)
        m.compose(new THREE.Vector3(Math.cos(a) * (r + 0.004), Math.sin(a) * (r + 0.004), (j - 1) * (w / 3.3)), q, new THREE.Vector3(1, 1, 1))
        knobs.setMatrixAt(n++, m)
      }
    // shoulder lugs
    for (const sgn of [-1, 1])
      for (let i = 0; i < per; i++) {
        const a = ((i + 0.25) / per) * Math.PI * 2
        q.setFromAxisAngle(zAxis, a - Math.PI / 2)
        m.compose(new THREE.Vector3(Math.cos(a) * (r - 0.018), Math.sin(a) * (r - 0.018), sgn * (hw - 0.004)), q, new THREE.Vector3(1.1, 1.6, 0.35))
        knobs.setMatrixAt(n++, m)
      }
    spin.add(knobs)
    // steel wheel: a dished disc with holes suggested by a darker ring
    cyl('z', rim * 1.02, w * 0.78, black, undefined, spin, 28)
    cyl('z', rim * 0.92, 0.012, darkSteel, [0, 0, side * w * 0.3], spin, 28)
    cyl('z', rim * 0.34, 0.03, steel, [0, 0, side * w * 0.33], spin, 12)
    {
      const im = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 6).rotateX(Math.PI / 2)), steel, 4)
      for (let i = 0; i < 4; i++) im.setMatrixAt(i, m.makeTranslation(Math.cos(i * 1.5708 + 0.6) * rim * 0.55, Math.sin(i * 1.5708 + 0.6) * rim * 0.55, side * w * 0.31))
      spin.add(im)
    }
    wheels.push({ spin, steer: front ? steer : undefined, front })
  }
  wheel(AXLE.front, -AXLE.frontHalf, AXLE.frontR, 0.17, true)
  wheel(AXLE.front, AXLE.frontHalf, AXLE.frontR, 0.17, true)
  wheel(AXLE.rear, -AXLE.rearHalf, AXLE.rearR, 0.21, false)
  wheel(AXLE.rear, AXLE.rearHalf, AXLE.rearR, 0.21, false)

  // front axle beam, kingpins and tie rod; the tie rod slides with the steering
  cyl('z', 0.016, AXLE.frontHalf * 2 - 0.2, darkSteel, [AXLE.front, AXLE.frontR, 0])
  both((s) => cyl('y', 0.012, 0.12, darkSteel, [AXLE.front, AXLE.frontR, s * (AXLE.frontHalf - 0.1)]))
  const tieRod = cyl('z', 0.008, AXLE.frontHalf * 2 - 0.24, steel, [AXLE.front - 0.09, AXLE.frontR - 0.03, 0])
  // rear axle, bearings, brake disc
  const rearAxle = new THREE.Group()
  rearAxle.position.set(AXLE.rear, AXLE.rearR, 0)
  body.add(rearAxle)
  cyl('z', 0.015, AXLE.rearHalf * 2, steel, undefined, rearAxle, 16)
  cyl('z', 0.075, 0.005, darkSteel, [0, 0, -0.33], rearAxle, 28)
  both((s) => box(0.07, 0.07, 0.03, darkSteel, [AXLE.rear, AXLE.rearR, s * 0.4]))

  // ------------------------------------------------------------- motor, chain, cooling
  const MOTOR: V3 = [-0.55, 0.43, 0.07]
  const SPROCKET_Z = -0.1
  const motorMat = core('#0d0d10', 0.35, 0.6)
  cyl('z', 0.1, 0.25, motorMat, MOTOR, undefined, 32)
  for (const dz of [-0.09, -0.03, 0.03, 0.09]) add(new THREE.TorusGeometry(0.101, 0.004, 6, 32), motorMat, [MOTOR[0], MOTOR[1], MOTOR[2] + dz])
  cyl('z', 0.085, 0.03, black, [MOTOR[0], MOTOR[1], MOTOR[2] - 0.135], undefined, 32)
  cyl('z', 0.012, 0.09, steel, [MOTOR[0], MOTOR[1], -0.11], undefined, 12)
  // mount: an angle bracket and a foot plate
  box(0.012, 0.27, 0.2, steel, [MOTOR[0] - 0.005, 0.4, MOTOR[2] + 0.135], undefined)
  box(0.24, 0.008, 0.36, steel, [MOTOR[0], 0.29, MOTOR[2]])
  // sprockets
  const motorSprocket = add(gear(0.032, 11, 0.007, 0.006), steel, [MOTOR[0], MOTOR[1], SPROCKET_Z])
  const axleSprocket = add(gear(0.112, 40, 0.007, 0.006, 0.06), darkSteel, [0, 0, SPROCKET_Z], undefined, rearAxle)
  cyl('z', 0.04, 0.03, steel, [0, 0, SPROCKET_Z], rearAxle, 16)
  // chain: links carried round both sprockets
  const chainPath = beltPath([MOTOR[0], MOTOR[1]], 0.036, [AXLE.rear, AXLE.rearR], 0.116)
  const LINKS = Math.round(chainPath.length / 0.0127)
  const linkGeo = keep(new RoundedBoxGeometry(0.0115, 0.009, 0.011, 1, 0.003))
  const chain = new THREE.InstancedMesh(linkGeo, core('#2a2a2e', 0.35, 0.9), LINKS)
  chain.position.z = SPROCKET_Z
  chain.frustumCulled = false
  body.add(chain)

  // cooling: a plate over the motor carrying the radiator, two fans, pump and reservoir
  const PLATE_Y = 0.6
  box(0.3, 0.012, 0.44, white, [-0.58, PLATE_Y, 0.09])
  const RAD: V3 = [-0.47, PLATE_Y + 0.075, 0.03]
  const finTex = keep(fins())
  box(0.028, 0.122, 0.25, std('#111114', 0.5, 0.6, { map: finTex }), RAD)
  both((s) => box(0.034, 0.124, 0.02, black, [RAD[0], RAD[1], RAD[2] + s * 0.135]))
  both((s) => box(0.012, 0.14, 0.03, white, [RAD[0] - 0.02, RAD[1] + 0.004, RAD[2] + s * 0.062]))
  const fans: THREE.Group[] = []
  both((s) => {
    const cz = RAD[2] + s * 0.062
    const fx = RAD[0] + 0.028
    // frame
    for (const [dy, dz, sy, sz] of [[0.057, 0, 0.008, 0.122], [-0.057, 0, 0.008, 0.122], [0, 0.057, 0.122, 0.008], [0, -0.057, 0.122, 0.008]] as const)
      box(0.026, sy, sz, black, [fx, RAD[1] + dy, cz + dz])
    const fan = new THREE.Group()
    fan.position.set(fx, RAD[1], cz)
    body.add(fan)
    cyl('x', 0.019, 0.02, black, undefined, fan, 14)
    for (let i = 0; i < 7; i++) {
      const b = box(0.004, 0.036, 0.024, plastic, undefined, undefined, fan)
      const a = (i / 7) * Math.PI * 2
      b.position.set(0, Math.cos(a) * 0.035, Math.sin(a) * 0.035)
      b.rotation.set(a, 0, 0.5)
    }
    fans.push(fan)
    // wire grille
    for (const rr of [0.022, 0.038, 0.054]) add(new THREE.TorusGeometry(rr, 0.0012, 4, 28).rotateY(Math.PI / 2), silver, [fx + 0.015, RAD[1], cz])
  })
  // pump with its clear reservoir, and the finned driver beside it
  box(0.058, 0.05, 0.058, black, [ANCHOR.pump[0], PLATE_Y + 0.031, ANCHOR.pump[2]])
  rbox(0.062, 0.058, 0.062, 0.008, clear, [ANCHOR.pump[0], PLATE_Y + 0.086, ANCHOR.pump[2]])
  box(0.05, 0.03, 0.05, std('#ff6a5a', 0.2, 0, { transparent: true, opacity: 0.35, emissive: new THREE.Color('#ff3020'), emissiveIntensity: 0.25 }), [ANCHOR.pump[0], PLATE_Y + 0.076, ANCHOR.pump[2]])
  cyl('y', 0.012, 0.006, silver, [ANCHOR.pump[0], PLATE_Y + 0.117, ANCHOR.pump[2]])
  box(0.085, 0.036, 0.07, silver, [-0.685, PLATE_Y + 0.024, 0.13])
  for (let i = 0; i < 6; i++) box(0.085, 0.01, 0.003, silver, [-0.685, PLATE_Y + 0.046, 0.102 + i * 0.011])
  // hoses: radiator to pump, pump to motor, motor back to the radiator
  tube([[RAD[0], RAD[1] - 0.03, RAD[2] - 0.15], [-0.47, 0.52, -0.2], [-0.56, 0.5, -0.03], [-0.56, 0.53, 0.02]], hose, { r: 0.008, bend: 0.06, cast: false })
  tube([[RAD[0], RAD[1] + 0.03, RAD[2] - 0.15], [-0.5, 0.7, -0.24], [-0.66, 0.64, -0.2], [-0.67, 0.67, 0.12], [-0.67, 0.67, 0.22]], hose, { r: 0.008, bend: 0.07, cast: false })
  tube([[ANCHOR.pump[0] + 0.03, PLATE_Y + 0.03, ANCHOR.pump[2]], [-0.55, 0.63, 0.26], [-0.5, 0.56, 0.2], [-0.54, 0.52, 0.12]], hose, { r: 0.008, bend: 0.05, cast: false })

  // motor controller: a finned black case with three phase lugs
  const escMat = core('#141417', 0.4, 0.5)
  box(0.22, 0.05, 0.15, escMat, ANCHOR.esc)
  for (let i = 0; i < 9; i++) box(0.2, 0.014, 0.004, escMat, [ANCHOR.esc[0], ANCHOR.esc[1] + 0.03, ANCHOR.esc[2] - 0.06 + i * 0.015])
  box(0.26, 0.006, 0.19, steel, [ANCHOR.esc[0], ANCHOR.esc[1] - 0.03, ANCHOR.esc[2]])
  both((s) => box(0.012, 0.1, 0.012, steel, [ANCHOR.esc[0] + s * 0.1, 0.32, ANCHOR.esc[2]]))

  // ------------------------------------------------------------- steer-by-wire unit
  const cimMat = core('#1a1a1d', 0.35, 0.7)
  cyl('z', 0.032, 0.11, cimMat, ANCHOR.cim, undefined, 20)
  box(0.075, 0.075, 0.06, core('#2b2b30', 0.4, 0.7), [ANCHOR.cim[0], ANCHOR.cim[1], ANCHOR.cim[2] + 0.085])
  // steering shaft from the gearbox to a pitman arm on the tie rod, with the feedback pot on top
  cyl('z', 0.009, 0.16, steel, [ANCHOR.cim[0], ANCHOR.cim[1], -0.03], undefined, 10)
  cyl('y', 0.014, 0.1, steel, ANCHOR.pot, undefined, 12)
  cyl('y', 0.02, 0.02, core('#2456b8', 0.4, 0.2), [ANCHOR.pot[0], ANCHOR.pot[1] + 0.055, ANCHOR.pot[2]], undefined, 14)
  box(0.09, 0.008, 0.02, steel, [ANCHOR.pot[0] - 0.02, AXLE.frontR - 0.02, 0])
  // Talon SRX: a small finned brick
  const talonMat = core('#101013', 0.4, 0.4)
  box(0.07, 0.024, 0.07, talonMat, ANCHOR.talon)
  for (let i = 0; i < 5; i++) box(0.066, 0.008, 0.003, talonMat, [ANCHOR.talon[0], ANCHOR.talon[1] + 0.015, ANCHOR.talon[2] - 0.024 + i * 0.012])
  // ESP32 on a bracket above the deck
  box(0.07, 0.004, 0.045, core('#0d3b2a', 0.5, 0.1, '#0a5a3a', 0.25), ANCHOR.esp32)
  box(0.018, 0.004, 0.016, core('#b9bcc2', 0.3, 0.9), [ANCHOR.esp32[0] + 0.014, ANCHOR.esp32[1] + 0.004, ANCHOR.esp32[2]])
  box(0.004, 0.035, 0.03, steel, [ANCHOR.esp32[0], ANCHOR.esp32[1] - 0.02, ANCHOR.esp32[2] - 0.03])

  // ------------------------------------------------------------- racing wheel
  const DB = dashEnd(1)
  box(0.2, 0.01, 0.26, white, [DB[0] + 0.03, DB[1] + 0.022, 0]) // printed mounting plate
  {
    // base: a wedge, tall at the front and falling toward the driver
    const sh = new THREE.Shape()
    sh.moveTo(-0.1, 0)
    sh.lineTo(0.11, 0)
    sh.lineTo(0.11, 0.1)
    sh.lineTo(0.03, 0.155)
    sh.lineTo(-0.06, 0.15)
    sh.lineTo(-0.1, 0.07)
    sh.closePath()
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 })
    g.translate(0, 0, -0.11)
    add(g, plastic, [DB[0] + 0.05, DB[1] + 0.03, 0])
  }
  const col = new THREE.Group()
  col.position.set(...ANCHOR.wheel)
  col.rotation.set(0, Math.PI, 0.33)
  body.add(col)
  cyl('x', 0.03, 0.12, plastic, [-0.07, 0, 0], col, 16)
  const hand = new THREE.Group()
  col.add(hand)
  {
    const RIM = 0.14
    add(new THREE.TorusGeometry(RIM, 0.021, 14, 56).rotateY(Math.PI / 2), core('#0c0c0d', 0.75, 0), undefined, undefined, hand)
    // the red centre mark at the top of the rim
    add(new THREE.TorusGeometry(RIM, 0.0218, 10, 6, 0.1).rotateZ(Math.PI / 2 - 0.05).rotateY(Math.PI / 2), core('#e0181c', 0.5, 0, '#ff2a20', 0.35), undefined, undefined, hand)
    // spokes
    const spoke = core('#b4b6ba', 0.35, 0.8)
    box(0.012, 0.03, 0.11, spoke, [-0.004, -0.01, 0.085], [0.12, 0, 0], hand)
    box(0.012, 0.03, 0.11, spoke, [-0.004, -0.01, -0.085], [-0.12, 0, 0], hand)
    box(0.012, 0.1, 0.022, spoke, [-0.004, -0.085, 0.022], [0.22, 0, 0], hand)
    box(0.012, 0.1, 0.022, spoke, [-0.004, -0.085, -0.022], [-0.22, 0, 0], hand)
    // hub and its buttons
    rbox(0.04, 0.105, 0.13, 0.012, plastic, [-0.004, 0.0, 0], undefined, hand)
    cyl('x', 0.011, 0.004, core('#d8d8d8', 0.3, 0, '#ffffff', 0.25), [0.017, 0.012, 0], hand, 14)
    const btn = (c: string, y: number, z: number) => cyl('x', 0.0055, 0.004, core(c, 0.4, 0, c, 0.35), [0.017, y, z], hand, 10)
    btn('#f2c21a', 0.026, -0.044)
    btn('#2f7df0', 0.012, -0.03)
    btn('#e6332a', 0.012, -0.058)
    btn('#3cc05a', -0.002, -0.044)
    box(0.004, 0.026, 0.008, core('#050506', 0.6), [0.017, 0.012, 0.044], undefined, hand)
    box(0.004, 0.008, 0.026, core('#050506', 0.6), [0.017, 0.012, 0.044], undefined, hand)
    // paddles
    both((s) => box(0.004, 0.03, 0.05, plastic, [-0.03, 0.012, s * 0.095], undefined, hand))
  }

  // ------------------------------------------------------------- speakers
  both((s) => {
    const p: V3 = [DB[0] + 0.03, DB[1] + 0.105, s * 0.265]
    cyl('x', 0.078, 0.02, plastic, p, undefined, 28)
    add(new THREE.TorusGeometry(0.078, 0.006, 8, 32).rotateY(Math.PI / 2), silver, [p[0] + 0.01, p[1], p[2]])
    cyl('x', 0.05, 0.04, black, [p[0] - 0.025, p[1], p[2]], undefined, 20, 0.07)
    cyl('x', 0.035, 0.025, blue, [p[0] - 0.055, p[1], p[2]], undefined, 18)
    cyl('x', 0.024, 0.008, black, [p[0] + 0.012, p[1], p[2]], undefined, 14)
    for (let i = 0; i < 5; i++) {
      const b = box(0.004, 0.006, 0.06, plastic, [p[0] + 0.012, p[1], p[2]])
      b.rotation.x = (i / 5) * Math.PI
      b.scale.z = 2.3
    }
  })

  // ------------------------------------------------------------- dashboard: screen, case, mainboard
  const dash = new THREE.Group()
  dash.position.set(0.43, 0.615, 0.22)
  dash.rotation.z = -0.24
  body.add(dash)
  // the case, as five walls so it can open to show the board
  const CW = 0.25
  const CH = 0.152
  const CD = 0.105
  box(CD, 0.008, CW, caseMat, [0, CH / 2, 0], undefined, dash)
  box(CD, 0.008, CW, caseMat, [0, -CH / 2, 0], undefined, dash)
  box(CD, CH, 0.008, caseMat, [0, 0, CW / 2], undefined, dash)
  box(CD, CH, 0.008, caseMat, [0, 0, -CW / 2], undefined, dash)
  box(0.006, CH, CW, caseMat, [CD / 2, 0, 0], undefined, dash)
  // bezel round the screen
  for (const [y, z, sy, sz] of [[0.064, 0, 0.026, CW], [-0.064, 0, 0.026, CW], [0, 0.107, 0.105, 0.036], [0, -0.107, 0.105, 0.036]] as const)
    box(0.008, sy, sz, core('#0c0c0e', 0.6), [-CD / 2, y, z], undefined, dash)
  cyl('x', 0.005, 0.022, silver, [-CD / 2 - 0.012, 0.03, -0.108], dash, 8)
  // the screen itself: the dashboard is drawn on this canvas
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 480
  const texture = keep(new THREE.CanvasTexture(canvas))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  const screenMat = keep(new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }))
  const screen = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.172, 0.1032)), screenMat)
  screen.position.set(-CD / 2 - 0.0045, 0, 0)
  screen.rotation.y = -Math.PI / 2
  dash.add(screen)
  // mainboard behind it, carrying the Teensy and the Pi
  const pcb = core('#0b2a1c', 0.5, 0.2, '#0c6a3c', 0.18)
  box(0.003, 0.13, 0.225, pcb, [-0.012, 0, 0], undefined, dash)
  const piMat = core('#1c7a3a', 0.5, 0.2, '#22b060', 0.3)
  box(0.004, 0.056, 0.085, piMat, [0.004, 0.022, 0.05], undefined, dash)
  box(0.016, 0.014, 0.018, silver, [0.014, 0.022, 0.086], undefined, dash)
  box(0.014, 0.016, 0.014, silver, [0.014, 0.04, 0.086], undefined, dash)
  box(0.003, 0.014, 0.014, core('#111113', 0.4, 0.3), [0.007, 0.02, 0.04], undefined, dash)
  const teensyMat = core('#16406a', 0.5, 0.2, '#2a8cff', 0.35)
  box(0.004, 0.018, 0.061, teensyMat, [0.004, -0.028, -0.05], undefined, dash)
  box(0.003, 0.009, 0.009, core('#111113', 0.4, 0.3), [0.007, -0.028, -0.05], undefined, dash)
  box(0.006, 0.008, 0.008, silver, [0.008, -0.028, -0.078], undefined, dash)
  // headers and connectors along the board's edge
  for (let i = 0; i < 7; i++) box(0.008, 0.01, 0.018, core('#e8e4d8', 0.6), [-0.006, -0.056, -0.09 + i * 0.03], undefined, dash)
  // the blue cable coiled on the pillar beside the dash, as in the photographs
  for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(0.062 + i * 0.004, 0.005, 6, 28), blue, [0.5, 0.64 - i * 0.004, 0.375 + i * 0.006], [0.2 * i, 1.2 + 0.1 * i, 0])

  // ------------------------------------------------------------- signal routes
  const T = ANCHOR.teensy
  const P = ANCHOR.pi
  const aL = (f: number, dz = 0, dy = 0): V3 => {
    const p = mix(aBase(-1), roofF(-1), f)
    return [p[0] + 0.02, p[1] + dy, p[2] + dz]
  }
  const aR = (f: number, dz = 0, dy = 0): V3 => {
    const p = mix(aBase(1), roofF(1), f)
    return [p[0] + 0.02, p[1] + dy, p[2] + dz]
  }
  const dashL: V3 = [DB[0] + 0.01, DB[1] - 0.02, -0.3]
  const dashM: V3 = [DB[0] + 0.01, DB[1] - 0.022, 0.06]
  const guardL = (o: number): V3[] => [aL(0.19, o), [0.12, 0.5 - 0.02, -0.43 - o], [-0.42, 0.5 - 0.02, -0.4 - o]]
  const wires: WireSpec[] = [
    // driver input
    { id: 'usb', kind: 'cmd', pts: [[0.52, 0.8, 0.0], [0.53, 0.72, 0.03], [0.49, 0.69, 0.1], T], spacing: 0.16, speed: 0.5 },
    // throttle: Teensy to the DAC, then the analog line to the controller, along the left side
    { id: 'throttle', kind: 'cmd', pts: [T, dashM, dashL, aL(DASH_F - 0.04), ...guardL(0), [-0.47, 0.42, -0.36], ANCHOR.esc], spacing: 0.3, speed: 0.75 },
    { id: 'escSerial', kind: 'tel', reverse: true, pts: [[T[0], T[1] + 0.02, T[2]], [dashM[0], dashM[1] + 0.02, dashM[2]], [dashL[0], dashL[1] + 0.02, dashL[2]], aL(DASH_F - 0.04, 0, 0.03), ...guardL(0.022), [-0.47, 0.44, -0.39], [ANCHOR.esc[0], ANCHOR.esc[1] + 0.02, ANCHOR.esc[2] - 0.03]], spacing: 0.42, speed: 0.6 },
    // steering: CAN down the left pillar to the ESP32, status back
    { id: 'canSet', kind: 'cmd', pts: [[T[0], T[1] - 0.015, T[2]], [dashM[0] + 0.02, dashM[1], dashM[2]], [dashL[0] + 0.02, dashL[1], dashL[2] - 0.02], aL(0.3, -0.02), aL(0.14, -0.02), ANCHOR.esp32], spacing: 0.22, speed: 0.7 },
    { id: 'canStatus', kind: 'tel', reverse: true, pts: [[T[0], T[1] - 0.03, T[2]], [dashM[0] + 0.04, dashM[1], dashM[2]], [dashL[0] + 0.04, dashL[1], dashL[2] - 0.04], aL(0.3, -0.045), aL(0.14, -0.045), [ANCHOR.esp32[0], ANCHOR.esp32[1], ANCHOR.esp32[2] - 0.02]], spacing: 0.22, speed: 0.7 },
    { id: 'pwm', kind: 'cmd', pts: [ANCHOR.esp32, [0.65, 0.31, -0.14], [ANCHOR.talon[0], ANCHOR.talon[1] + 0.02, ANCHOR.talon[2]]], spacing: 0.09, speed: 0.4 },
    { id: 'steerPower', kind: 'pwr', pts: [ANCHOR.talon, [0.72, 0.25, -0.1], [ANCHOR.cim[0], ANCHOR.cim[1] + 0.03, ANCHOR.cim[2] + 0.03]], r: 0.007, spacing: 0.08, speed: 0.4 },
    { id: 'pot', kind: 'tel', pts: [[ANCHOR.pot[0], ANCHOR.pot[1] + 0.06, ANCHOR.pot[2]], [0.6, 0.38, -0.1], ANCHOR.esp32], spacing: 0.09, speed: 0.4 },
    // telemetry to the Pi
    { id: 'uart', kind: 'tel', pts: [T, [T[0] + 0.03, (T[1] + P[1]) / 2 + 0.03, (T[2] + P[2]) / 2], P], r: 0.004, spacing: 0.05, speed: 0.22 },
    { id: 'bms', kind: 'tel', pts: [ANCHOR.bms, [0.7, 0.2, 0.36], aR(0.1, 0.02), aR(DASH_F - 0.06, 0.02), [0.47, 0.66, 0.33], P], spacing: 0.3, speed: 0.55 },
    // contactor coil, and the traction feed it switches
    { id: 'contactor', kind: 'cmd', pts: [[T[0] + 0.02, T[1], T[2]], [0.49, 0.67, 0.36], aR(DASH_F - 0.08, 0.045), aR(0.08, 0.045), [0.5, 0.14, 0.41], [0.0, 0.14, 0.43], ANCHOR.contactor], spacing: 0.3, speed: 0.6 },
    { id: 'traction', kind: 'pwr', pts: [[-0.04, 0.24, 0.12], [-0.09, 0.26, 0.22], ANCHOR.contactor, [-0.2, 0.25, 0.34], [-0.33, 0.27, 0.2], [-0.35, 0.3, -0.2], [-0.42, 0.37, -0.3], [ANCHOR.esc[0] + 0.11, ANCHOR.esc[1], ANCHOR.esc[2]]], r: 0.012, spacing: 0.16, speed: 0.9 },
    // three phases to the motor
    ...[-1, 0, 1].map(
      (i): WireSpec => ({
        id: `phase${i + 1}`,
        kind: 'pwr',
        pts: [[ANCHOR.esc[0] - 0.05 + i * 0.045, ANCHOR.esc[1] + 0.03, ANCHOR.esc[2] + 0.07], [-0.56 + i * 0.04, 0.52, -0.16], [-0.55 + i * 0.035, 0.56, -0.02], [-0.55 + i * 0.03, 0.535, 0.03]],
        r: 0.009,
        spacing: 0.1,
        speed: 0.8,
      }),
    ),
  ]

  // loose wiring down the pillars, as built: dark looms that the signal routes run beside
  const loom = std('#1a1012', 0.7, 0)
  tube([dashEnd(-1), aL(0.3, 0.012), aL(0.12, 0.012)], loom, { r: 0.006, cast: false })
  tube([dashEnd(1), aR(0.3, -0.012), aR(0.1, -0.012)], loom, { r: 0.006, cast: false })

  // ------------------------------------------------------------- pose and ghosting
  const m4 = new THREE.Matrix4()
  const q4 = new THREE.Quaternion()
  const v4 = new THREE.Vector3()
  const one = new THREE.Vector3(1, 1, 1)
  const zAxis = new THREE.Vector3(0, 0, 1)
  function setChain(offset: number) {
    for (let i = 0; i < LINKS; i++) {
      const c = chainPath.at((i + offset / (chainPath.length / LINKS)) / LINKS)
      q4.setFromAxisAngle(zAxis, c.a)
      v4.set(c.x, c.y, i % 2 ? 0.0035 : -0.0035)
      chain.setMatrixAt(i, m4.compose(v4, q4, one))
    }
    chain.instanceMatrix.needsUpdate = true
  }
  setChain(0)

  let ghostBody = -1
  let ghostCase = -1
  function setGhost(list: THREE.MeshStandardMaterial[], u: number, floor: number) {
    for (const m of list) {
      const base = m.userData.opacity as number
      const see = u > 0.002
      const wasTransparent = m.transparent
      m.transparent = see || base < 1
      if (m.transparent !== wasTransparent) m.needsUpdate = true
      m.opacity = base * (1 - (1 - floor) * u)
      m.depthWrite = u < 0.4 && base >= 1
    }
  }

  return {
    root,
    body,
    wires,
    leds,
    screen: { canvas, texture },
    pose({ steer, roll, frontSpin, rearSpin, chain: ch, fans: fa }) {
      body.rotation.x = roll
      for (const w of wheels) {
        if (w.steer) w.steer.rotation.y = steer
        w.spin.rotation.z = -(w.front ? frontSpin : rearSpin)
      }
      rearAxle.rotation.z = -rearSpin
      axleSprocket.rotation.z = 0
      motorSprocket.rotation.z = -rearSpin * (0.112 / 0.032)
      tieRod.position.z = -Math.sin(steer) * 0.09
      hand.rotation.x = steer * 3.2
      for (const f of fans) f.rotation.x = fa
      setChain(ch)
    },
    ghost(b, c) {
      if (Math.abs(b - ghostBody) > 0.002) setGhost(bodyMats, (ghostBody = b), 0.07)
      const cc = Math.max(b, c)
      if (Math.abs(cc - ghostCase) > 0.002) setGhost(caseMats, (ghostCase = cc), 0.1)
    },
    dispose() {
      for (const d of disposables) d.dispose()
    },
  }
}

// ------------------------------------------------------------------ helpers

/** A polyline with its corners rounded off, as one curve. */
function rounded(pts: V3[], bend: number) {
  const P = pts.map((p) => new THREE.Vector3(...p))
  const path = new THREE.CurvePath<THREE.Vector3>()
  let from = P[0]
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1]
    const b = P[i]
    const c = P[i + 1]
    const r = Math.min(bend, a.distanceTo(b) * 0.45, b.distanceTo(c) * 0.45)
    const inP = b.clone().addScaledVector(a.clone().sub(b).normalize(), r)
    const outP = b.clone().addScaledVector(c.clone().sub(b).normalize(), r)
    path.add(new THREE.LineCurve3(from, inP))
    path.add(new THREE.QuadraticBezierCurve3(inP, b, outP))
    from = outP
  }
  path.add(new THREE.LineCurve3(from, P[P.length - 1]))
  return path
}

/** White tape wound round a red tube. */
function stripes(red: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#f1eee8'
  g.fillRect(0, 0, 64, 64)
  g.strokeStyle = red
  g.lineWidth = 15
  for (let k = -2; k <= 2; k++) {
    g.beginPath()
    g.moveTo(k * 64 - 8, -8)
    g.lineTo(k * 64 + 72, 72)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Radiator fins. */
function fins() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#08080a'
  g.fillRect(0, 0, 128, 64)
  g.fillStyle = '#4a4a50'
  for (let x = 0; x < 128; x += 3) g.fillRect(x, 0, 1, 64)
  g.fillStyle = '#1c1c20'
  for (let y = 6; y < 64; y += 10) g.fillRect(0, y, 128, 3)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** A sprocket: a toothed disc in the xy plane, `depth` thick, with an optional hole. */
function gear(r: number, teeth: number, toothH: number, depth: number, hole = 0) {
  const s = new THREE.Shape()
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2
    const da = (Math.PI * 2) / teeth
    const pt = (a: number, rr: number) => [Math.cos(a) * rr, Math.sin(a) * rr] as const
    const p = [pt(a0, r - toothH), pt(a0 + da * 0.3, r), pt(a0 + da * 0.5, r), pt(a0 + da * 0.8, r - toothH)]
    p.forEach(([x, y], k) => (i === 0 && k === 0 ? s.moveTo(x, y) : s.lineTo(x, y)))
  }
  s.closePath()
  if (hole > 0) {
    // lightening holes
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const h = new THREE.Path()
      h.absarc(Math.cos(a) * hole, Math.sin(a) * hole, r * 0.2, 0, Math.PI * 2, true)
      s.holes.push(h)
    }
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 })
  g.translate(0, 0, -depth / 2)
  return g
}

/** The closed path of a chain round two sprockets, by arc length. */
function beltPath(c1: readonly [number, number], r1: number, c2: readonly [number, number], r2: number) {
  const dx = c2[0] - c1[0]
  const dy = c2[1] - c1[1]
  const d = Math.hypot(dx, dy)
  const base = Math.atan2(dy, dx)
  const phi = Math.acos((r1 - r2) / d)
  // tangent points: at angle base ± phi on both circles
  const pt = (c: readonly [number, number], r: number, a: number) => [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r] as const
  const a1 = base + phi
  const a2 = base - phi
  const s1 = Math.hypot(pt(c2, r2, a1)[0] - pt(c1, r1, a1)[0], pt(c2, r2, a1)[1] - pt(c1, r1, a1)[1])
  const arc2 = 2 * phi * r2 // round the far side of c2, from a1 back through `base` to a2
  const arc1 = (2 * Math.PI - 2 * phi) * r1
  const length = s1 * 2 + arc1 + arc2
  return {
    length,
    at(u: number) {
      let s = (((u % 1) + 1) % 1) * length
      if (s < s1) {
        const p = pt(c1, r1, a1)
        const q = pt(c2, r2, a1)
        const k = s / s1
        return { x: p[0] + (q[0] - p[0]) * k, y: p[1] + (q[1] - p[1]) * k, a: Math.atan2(q[1] - p[1], q[0] - p[0]) }
      }
      s -= s1
      if (s < arc2) {
        const a = a1 - s / r2
        const p = pt(c2, r2, a)
        return { x: p[0], y: p[1], a: a - Math.PI / 2 }
      }
      s -= arc2
      if (s < s1) {
        const p = pt(c2, r2, a2)
        const q = pt(c1, r1, a2)
        const k = s / s1
        return { x: p[0] + (q[0] - p[0]) * k, y: p[1] + (q[1] - p[1]) * k, a: Math.atan2(q[1] - p[1], q[0] - p[0]) }
      }
      s -= s1
      const a = a2 - s / r1
      const p = pt(c1, r1, a)
      return { x: p[0], y: p[1], a: a - Math.PI / 2 }
    },
  }
}
