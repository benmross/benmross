/**
 * The Raspberry Pi rover from the Falconia mission, built from the photogrammetry photo:
 * four knobbly tyres on pale rims, a dark chassis under a layer of grey LEGO, the Pi and
 * its blue HAT on top, a camera block at the front and a loose white ribbon cable.
 *
 * Modelled at one unit per body length with +z forward, then scaled into the scene. It
 * drives a closed loop, stopping briefly once a lap, and sits on the scan through its
 * four wheel contacts; its skid-steer wheels turn against each other in the bends.
 */
import * as THREE from 'three'

export type Rover = {
  group: THREE.Group
  /** Advance by dt seconds; `height(x, z)` is the world height of the surface there. */
  update(dt: number, height: (x: number, z: number) => number): void
  /** World position of the rover's centre, for checks. */
  where(): THREE.Vector3
  dispose(): void
}

const WHEEL_R = 0.22
const WHEEL_W = 0.17
const TRACK = 0.4 // half the distance between left and right wheel centres
const BASE = 0.3 // half the distance between front and rear axles

export function createRover(track: [number, number][], scale: number, speed: number): Rover {
  const group = new THREE.Group()
  const body = new THREE.Group() // pitch and roll live here, yaw on the group
  group.add(body)
  group.scale.setScalar(scale)

  const mats: THREE.Material[] = []
  const geos: THREE.BufferGeometry[] = []
  const mat = (color: number, rough = 0.75, extra: THREE.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra })
    mats.push(m)
    return m
  }
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = body) => {
    const g = new THREE.BoxGeometry(w, h, d)
    geos.push(g)
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }

  const tyre = mat(0x1a1a1a, 0.95)
  const rim = mat(0xd9d6cf, 0.45)
  const hub = mat(0x8d8a84, 0.5)
  const dark = mat(0x2a2b2e, 0.7)
  const lego = mat(0x9fa2a5, 0.55)
  const pcb = mat(0x2f6a3b, 0.6)
  const hat = mat(0x1d4c86, 0.5)
  const black = mat(0x0e0e0f, 0.6)
  const ribbon = mat(0xebeae5, 0.7, { side: THREE.DoubleSide })
  const red = mat(0xb3261e, 0.6)
  const led = mat(0x9b6cff, 0.4, { emissive: new THREE.Color(0x8a5cff), emissiveIntensity: 2.2 })

  // --- wheels: tyre, tread lugs, rim with spokes, hub
  const tyreGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 28)
  tyreGeo.rotateZ(Math.PI / 2)
  const lugGeo = new THREE.BoxGeometry(WHEEL_W * 0.9, 0.035, 0.05)
  const rimGeo = new THREE.CylinderGeometry(WHEEL_R * 0.66, WHEEL_R * 0.66, 0.02, 24)
  rimGeo.rotateZ(Math.PI / 2)
  const spokeGeo = new THREE.BoxGeometry(0.012, WHEEL_R * 1.2, 0.03)
  const hubGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12)
  hubGeo.rotateZ(Math.PI / 2)
  geos.push(tyreGeo, lugGeo, rimGeo, spokeGeo, hubGeo)
  const LUGS = 16
  const wheels: { spin: THREE.Group; side: number }[] = []
  for (const side of [-1, 1])
    for (const end of [-1, 1]) {
      const mount = new THREE.Group()
      mount.position.set(side * TRACK, WHEEL_R, end * BASE)
      body.add(mount)
      const spin = new THREE.Group()
      mount.add(spin)
      spin.add(new THREE.Mesh(tyreGeo, tyre))
      const lugs = new THREE.InstancedMesh(lugGeo, tyre, LUGS)
      const m4 = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      for (let i = 0; i < LUGS; i++) {
        const a = (i / LUGS) * Math.PI * 2
        q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), a)
        // alternate lugs lean one way and the other, like the chevron tread in the photo
        const off = (i % 2 ? 0.02 : -0.02) * side
        m4.compose(new THREE.Vector3(off, Math.cos(a) * WHEEL_R, Math.sin(a) * WHEEL_R), q, new THREE.Vector3(0.7, 1, 1))
        lugs.setMatrixAt(i, m4)
      }
      spin.add(lugs)
      const face = new THREE.Group()
      face.position.x = side * (WHEEL_W / 2 + 0.006)
      spin.add(face)
      face.add(new THREE.Mesh(rimGeo, rim))
      for (let k = 0; k < 5; k++) {
        const s = new THREE.Mesh(spokeGeo, rim)
        s.rotation.x = (k / 5) * Math.PI
        s.position.x = side * 0.012
        face.add(s)
      }
      const h = new THREE.Mesh(hubGeo, hub)
      h.position.x = side * 0.02
      face.add(h)
      wheels.push({ spin, side })
    }

  // --- chassis and the layers stacked on it
  box(0.56, 0.16, 0.8, dark, 0, 0.27, 0)
  box(0.62, 0.1, 0.84, lego, 0, 0.4, 0)
  {
    // studs along the two long edges of the LEGO layer
    const studGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.022, 10)
    geos.push(studGeo)
    const rows = [-0.26, -0.18, 0.18, 0.26]
    const cols = 10
    const studs = new THREE.InstancedMesh(studGeo, lego, rows.length * cols)
    const m4 = new THREE.Matrix4()
    let n = 0
    for (const x of rows)
      for (let c = 0; c < cols; c++) studs.setMatrixAt(n++, m4.makeTranslation(x, 0.461, -0.36 + (c * 0.72) / (cols - 1)))
    body.add(studs)
  }
  box(0.46, 0.11, 0.56, dark, 0, 0.505, -0.06) // battery and motor driver
  box(0.42, 0.02, 0.3, pcb, 0.0, 0.57, -0.08) // Raspberry Pi
  box(0.4, 0.025, 0.27, hat, 0.0, 0.605, -0.07) // the HAT
  box(0.33, 0.03, 0.03, black, -0.02, 0.632, -0.18) // header strip
  box(0.06, 0.05, 0.05, black, 0.13, 0.64, 0.02)
  // camera and sensor housing at the front, lens facing forward
  box(0.3, 0.2, 0.13, mat(0x3b3d40, 0.6), 0.02, 0.33, 0.46)
  {
    const lensGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16)
    lensGeo.rotateX(Math.PI / 2)
    geos.push(lensGeo)
    const lens = new THREE.Mesh(lensGeo, black)
    lens.position.set(-0.05, 0.36, 0.535)
    body.add(lens)
    const ledGeo = new THREE.SphereGeometry(0.016, 10, 8)
    geos.push(ledGeo)
    const l = new THREE.Mesh(ledGeo, led)
    l.position.set(0.08, 0.3, 0.53)
    body.add(l)
  }
  // the loose ribbon cable: off the HAT, up over the right side and down to the front
  {
    const c = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0.05, 0.62, -0.02),
        new THREE.Vector3(0.22, 0.74, 0.02),
        new THREE.Vector3(0.44, 0.7, 0.08),
        new THREE.Vector3(0.56, 0.52, 0.2),
        new THREE.Vector3(0.5, 0.36, 0.42),
        new THREE.Vector3(0.3, 0.3, 0.56),
      ],
      false,
      'centripetal',
    )
    const N = 40
    const W = 0.075
    const pos: number[] = []
    const idx: number[] = []
    const p = new THREE.Vector3()
    const t = new THREE.Vector3()
    const across = new THREE.Vector3()
    const ref = new THREE.Vector3(0, 0, 1)
    for (let i = 0; i <= N; i++) {
      c.getPoint(i / N, p)
      c.getTangent(i / N, t)
      // the ribbon's width lies across its path, twisting a little as it falls
      across.copy(ref).applyAxisAngle(t, (i / N) * 0.6).projectOnPlane(t).normalize().multiplyScalar(W / 2)
      pos.push(p.x - across.x, p.y - across.y, p.z - across.z, p.x + across.x, p.y + across.y, p.z + across.z)
      if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    geos.push(g)
    body.add(new THREE.Mesh(g, ribbon))
  }
  // a few jumper wires looping off the HAT
  for (const [m, pts] of [
    [red, [[-0.12, 0.62, -0.15], [-0.2, 0.72, -0.05], [-0.1, 0.7, 0.1], [0.0, 0.62, 0.05]]],
    [black, [[-0.05, 0.62, -0.17], [-0.18, 0.68, -0.25], [-0.28, 0.6, -0.12], [-0.22, 0.52, 0.04]]],
  ] as const) {
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 20, 0.008, 5)
    geos.push(g)
    body.add(new THREE.Mesh(g, m))
  }

  // a soft contact shadow, so it sits on the sand rather than floating over it
  {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 64
    const ctx = cv.getContext('2d')!
    const gr = ctx.createRadialGradient(32, 32, 4, 32, 32, 32)
    gr.addColorStop(0, 'rgba(0,0,0,0.55)')
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gr
    ctx.fillRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(cv)
    const sm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    mats.push(sm)
    const sg = new THREE.PlaneGeometry(1.25, 1.35)
    sg.rotateX(-Math.PI / 2)
    geos.push(sg)
    const sh = new THREE.Mesh(sg, sm)
    sh.position.y = 0.01
    sh.renderOrder = 3
    body.add(sh)
  }

  // --- the track and the drive cycle: one lap, eased away from and into a short stop
  const curve = new THREE.CatmullRomCurve3(
    track.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'centripetal',
  )
  const length = curve.getLength()
  const lap = length / speed
  const STOP = 1.4
  const cycle = lap + STOP
  const heading = (f: number) => {
    const t = curve.getTangentAt(f)
    return Math.atan2(t.x, t.z)
  }
  const startYaw = heading(0)
  /** Fraction of the lap and heading at cycle time c. */
  const pose = (c: number) => {
    const u = Math.min(1, c / lap)
    // pulls away and stops gently; the middle of the lap runs at about twice the average
    const f = u - Math.sin(2 * Math.PI * u) / (2 * Math.PI)
    const ff = f >= 1 ? 0 : f
    return { f: ff, yaw: heading(ff) }
  }

  let clock = 0
  let prevF = 0
  let prevYaw = startYaw
  let ready = false
  const P = new THREE.Vector3()
  const smoothed = { y: 0, pitch: 0, roll: 0 }
  const unwrap = (a: number, ref: number) => a + Math.round((ref - a) / (2 * Math.PI)) * 2 * Math.PI

  return {
    group,
    update(dt, height) {
      clock = (clock + dt) % cycle
      const { f, yaw: rawYaw } = pose(clock)
      const yaw = unwrap(rawYaw, prevYaw)
      curve.getPointAt(f, P)
      const fx = Math.sin(yaw)
      const fz = Math.cos(yaw)
      const rx = Math.cos(yaw)
      const rz = -Math.sin(yaw)
      const b = BASE * scale
      const w = TRACK * scale
      const hFront = (height(P.x + fx * b + rx * w, P.z + fz * b + rz * w) + height(P.x + fx * b - rx * w, P.z + fz * b - rz * w)) / 2
      const hBack = (height(P.x - fx * b + rx * w, P.z - fz * b + rz * w) + height(P.x - fx * b - rx * w, P.z - fz * b - rz * w)) / 2
      const hRight = (height(P.x + rx * w + fx * b, P.z + rz * w + fz * b) + height(P.x + rx * w - fx * b, P.z + rz * w - fz * b)) / 2
      const hLeft = (height(P.x - rx * w + fx * b, P.z - rz * w + fz * b) + height(P.x - rx * w - fx * b, P.z - rz * w - fz * b)) / 2
      const y = (hFront + hBack + hLeft + hRight) / 4
      const pitch = Math.atan2(hBack - hFront, 2 * b)
      const roll = Math.atan2(hRight - hLeft, 2 * w)
      // ride the scan's bumps with a little suspension rather than every triangle
      const k = ready ? 1 - Math.exp(-dt * 10) : 1
      smoothed.y += (y - smoothed.y) * k
      smoothed.pitch += (pitch - smoothed.pitch) * k
      smoothed.roll += (roll - smoothed.roll) * k
      ready = true
      group.position.set(P.x, smoothed.y, P.z)
      group.rotation.set(0, yaw, 0)
      body.rotation.set(smoothed.pitch, 0, smoothed.roll, 'XZY')
      // wheels: forward distance turns both sides alike; turning on the spot turns them against each other
      // it always drives nose first; the lap wraps from 1 back to 0
      let df = f - prevF
      if (df < -0.5) df += 1
      const forward = Math.max(0, df) * length
      const dyaw = yaw - prevYaw
      for (const wh of wheels) {
        // a left turn (positive yaw) drives the right side forward and the left side back
        const side = forward - wh.side * dyaw * TRACK * scale
        wh.spin.rotation.x += side / (WHEEL_R * scale)
      }
      prevF = f
      prevYaw = yaw
    },
    where() {
      return group.position
    },
    dispose() {
      for (const g of geos) g.dispose()
      for (const m of mats) {
        ;(m as THREE.MeshBasicMaterial).map?.dispose()
        m.dispose()
      }
    },
  }
}
