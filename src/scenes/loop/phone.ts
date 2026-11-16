import * as THREE from 'three'

/**
 * An iPhone 16 Pro running Arm Pilot, held in a see-through right hand.
 * Built in the phone's ARKit camera frame: x toward the bottom edge, y toward the right side
 * (seen from the front), z out of the screen. Metres, at the real size: 149.6 x 71.5 x 8.25 mm.
 */

const L = 0.1496
const W = 0.0715
const D = 0.00825
const R = 0.0115 // corner radius of the body, seen from the front

function rounded(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

export type Phone = {
  group: THREE.Group
  /**
   * body: how much of the phone is on screen; ghost: the see-through hand; wrap: 0 holding the phone,
   * 1 closed round the wand's handle; engaged: thumb down; grip: slider 0..1.
   */
  set(v: { body: number; ghost: number; wrap: number; engaged: boolean; grip: number; dt: number }): void
  /** The hand's 21 joints (MediaPipe order) in the group's frame, as drawn this frame. */
  landmarks(): THREE.Vector3[]
}

/** MediaPipe's 21 hand landmarks as bones. */
export const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
]

export function buildPhone(o: {
  fill: THREE.Material
  line: (c: THREE.Color, opacity: number) => THREE.LineBasicMaterial
  keep: <X extends { dispose(): void }>(x: X) => X
  fg: THREE.Color
  accent: THREE.Color
  tint: THREE.Color
}): Phone {
  const { keep, fg, accent, tint } = o
  const root = new THREE.Group()
  const g = new THREE.Group() // the phone itself
  root.add(g)
  const body = o.line(fg, 0.85)
  const faint = o.line(fg, 0.4)
  const acc = o.line(accent, 0.9)
  const mats: { m: THREE.Material & { opacity: number }; a: number }[] = [
    { m: body, a: 0.85 },
    { m: faint, a: 0.4 },
    { m: acc, a: 0.9 },
  ]
  const add = (geo: THREE.BufferGeometry, line: THREE.LineBasicMaterial, threshold = 30, parent: THREE.Object3D = g) => {
    keep(geo)
    const m = new THREE.Mesh(geo, o.fill)
    const e = new THREE.LineSegments(keep(new THREE.EdgesGeometry(geo, threshold)), line)
    parent.add(m, e)
    return { m, e }
  }

  // titanium body: a rounded slab with softened edges
  {
    const bevel = 0.0011
    const geo = new THREE.ExtrudeGeometry(rounded(L - 2 * bevel, W - 2 * bevel, R - bevel), {
      depth: D - 2 * bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 10,
    })
    geo.translate(0, 0, -(D - 2 * bevel) / 2)
    add(geo, body, 40)
  }

  // the display, black glass with thin borders, and the Dynamic Island
  const screenMat = keep(new THREE.MeshBasicMaterial({ color: tint.clone().lerp(fg, 0.045), transparent: true }))
  const screen = new THREE.Mesh(keep(new THREE.ShapeGeometry(rounded(L - 0.0024, W - 0.0024, R - 0.0012), 10)), screenMat)
  screen.position.z = D / 2 + 0.0002
  g.add(screen)
  mats.push({ m: screenMat, a: 1 })
  const islandMat = keep(new THREE.MeshBasicMaterial({ color: 0x050506, transparent: true }))
  const island = new THREE.Mesh(keep(new THREE.ShapeGeometry(rounded(0.0062, 0.0209, 0.0031), 8)), islandMat)
  island.position.set(-L / 2 + 0.0012 + 0.0025 + 0.0031, 0, D / 2 + 0.0004)
  g.add(island)
  mats.push({ m: islandMat, a: 1 })

  // Arm Pilot: the thumb pad that engages the arm, and the gripper slider
  const padMat = keep(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.2 }))
  const pad = new THREE.Mesh(keep(new THREE.CircleGeometry(0.0125, 32)), padMat)
  pad.position.set(0.045, 0.014, D / 2 + 0.0005)
  g.add(pad)
  {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 48; i++) pts.push(new THREE.Vector3(Math.cos((i / 48) * Math.PI * 2) * 0.0125, Math.sin((i / 48) * Math.PI * 2) * 0.0125, 0))
    const ring = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(pts)), acc)
    ring.position.copy(pad.position)
    g.add(ring)
  }
  const slider = new THREE.Line(
    keep(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.05, -0.02, D / 2 + 0.0005), new THREE.Vector3(0.05, -0.02, D / 2 + 0.0005)])),
    faint,
  )
  g.add(slider)
  const knobMat = keep(new THREE.MeshBasicMaterial({ color: fg, transparent: true }))
  const knob = new THREE.Mesh(keep(new THREE.CircleGeometry(0.0052, 20)), knobMat)
  knob.position.set(0, -0.02, D / 2 + 0.0006)
  g.add(knob)
  mats.push({ m: knobMat, a: 1 })

  // camera plateau on the back, top left as seen from behind: three lenses, flash and LiDAR
  {
    const plateau = new THREE.ExtrudeGeometry(rounded(0.0375, 0.0375, 0.0085), { depth: 0.0012, bevelEnabled: false, curveSegments: 8 })
    plateau.translate(0, 0, -D / 2 - 0.0012)
    const cam = new THREE.Group()
    cam.position.set(-L / 2 + 0.0046 + 0.0188, W / 2 - 0.0046 - 0.0188, 0)
    g.add(cam)
    add(plateau, body, 30, cam)
    const lens = (x: number, y: number, r: number, h: number) => {
      const c = new THREE.CylinderGeometry(r, r, h, 24)
      c.rotateX(Math.PI / 2)
      c.translate(x, y, -D / 2 - 0.0012 - h / 2)
      add(c, body, 30, cam)
    }
    lens(-0.0085, 0.0085, 0.0068, 0.0022)
    lens(0.0085, 0.0085, 0.0068, 0.0022)
    lens(-0.0085, -0.0085, 0.0068, 0.0022)
    lens(0.009, -0.0095, 0.0024, 0.0006)
    lens(0.0098, -0.0012, 0.0022, 0.0006)
  }

  // buttons: Action and volume on the left, side button and Camera Control on the right
  const btn = (x: number, len: number, side: number, depth = 0.0007) => {
    const b = new THREE.BoxGeometry(len, depth * 2, 0.0028)
    b.translate(x, side * (W / 2 + depth * 0.4), 0)
    add(b, faint, 30)
  }
  btn(-L / 2 + 0.031, 0.0068, -1)
  btn(-L / 2 + 0.047, 0.0125, -1)
  btn(-L / 2 + 0.063, 0.0125, -1)
  btn(-L / 2 + 0.052, 0.0195, 1)
  btn(0.0085, 0.017, 1, 0.0003)

  // ---------------------------------------------------------------- the hand
  // A right hand under the phone, fingers round its left edge, thumb over the right edge onto the pad.
  // It is built on the same 21 joints the camera trackers find, so the later sections can strip the
  // skin away and leave its joints, and close the same hand round the marker wand's handle.
  const zb = -D / 2 // the back of the phone
  const FINGER_X = [-0.006, 0.015, 0.036, 0.056] // index to little finger, top of the phone to bottom
  const THUMB_BASE = new THREE.Vector3(0.078, 0.03, zb - 0.012)
  const pose = (wrap: boolean) => {
    const out: THREE.Vector3[] = [new THREE.Vector3(0.088, -0.003, zb - 0.021)]
    const thumb = wrap
      ? [[0, 0, 0], [-0.014, 0.004, 0.017], [-0.026, -0.008, 0.024], [-0.033, -0.02, 0.022]]
      : [[0, 0, 0], [-0.016, 0.009, 0.014], [-0.027, -0.004, 0.024], [-0.033, -0.016, 0.029]]
    for (const t of thumb) out.push(THUMB_BASE.clone().add(new THREE.Vector3(t[0], t[1], t[2])))
    for (const x of FINGER_X) {
      const f = wrap
        ? [[x + 0.01, -0.016, zb - 0.026], [x + 0.004, -0.032, -0.008], [x, -0.022, 0.014], [x - 0.002, -0.006, 0.021]]
        : [[x + 0.01, -0.016, zb - 0.026], [x + 0.004, -0.04, zb - 0.02], [x, -W / 2 - 0.009, zb - 0.004], [x - 0.002, -W / 2 - 0.004, D / 2 + 0.002]]
      for (const q of f) out.push(new THREE.Vector3(q[0], q[1], q[2]))
    }
    return out
  }
  const ON_PHONE = pose(false)
  const ON_HANDLE = pose(true)
  const RADII = [0.02, 0.0105, 0.0098, 0.009, 0.0085]
  ;[0.0088, 0.0092, 0.0088, 0.0076].forEach((r) => RADII.push(r, r * 0.95, r * 0.88, r * 0.82))

  const handMat = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uColor: { value: fg }, uOpacity: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV; varying float vX;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          vX = (modelMatrix * vec4(position, 1.0)).x;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV; varying float vX;
        uniform vec3 uColor; uniform float uOpacity;
        void main(){
          float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
          gl_FragColor = vec4(uColor, (0.05 + 0.55 * rim) * uOpacity);
          #include <colorspace_fragment>
        }`,
    }),
  )
  const forearmMat = keep(handMat.clone())
  forearmMat.fragmentShader = handMat.fragmentShader.replace(
    'gl_FragColor = vec4(uColor, (0.05 + 0.55 * rim) * uOpacity);',
    'gl_FragColor = vec4(uColor, (0.05 + 0.55 * rim) * uOpacity * (1.0 - smoothstep(0.03, 0.11, vLocal)));',
  ).replace('varying float vX;', 'varying float vX; varying float vLocal;')
  forearmMat.vertexShader = handMat.vertexShader.replace('varying float vX;', 'varying float vX; varying float vLocal;').replace('vX = ', 'vLocal = position.y + 0.5 * 0.12; vX = ')
  forearmMat.uniforms = { uColor: { value: fg }, uOpacity: { value: 1 } }
  const handRoot = new THREE.Group()
  root.add(handRoot)
  // the palm and forearm stay put; the fingers and thumb are drawn from the joints each frame
  const palm = new THREE.Mesh(keep(new THREE.SphereGeometry(1, 28, 18)), handMat)
  palm.scale.set(0.05, 0.04, 0.015)
  palm.position.set(0.05, -0.006, zb - 0.017)
  const forearm = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.025, 0.027, 0.12, 20, 1, true)), forearmMat)
  {
    const a = new THREE.Vector3(0.085, -0.002, zb - 0.02)
    const b = new THREE.Vector3(0.2, 0.004, zb - 0.05)
    const d = b.clone().sub(a)
    forearm.scale.y = d.length() / 0.12
    forearm.position.copy(a).addScaledVector(d, 0.5)
    forearm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
  }
  handRoot.add(palm, forearm)
  const ballGeo = keep(new THREE.SphereGeometry(1, 14, 10))
  const tubeGeo = keep(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true))
  const DRAWN = BONES.filter(([a, b]) => !(a === 0 || (a === 5 && b === 9) || (a === 9 && b === 13) || (a === 13 && b === 17)))
  const balls = ON_PHONE.map((_, i) => {
    const m = new THREE.Mesh(ballGeo, handMat)
    m.scale.setScalar(RADII[i])
    m.visible = i > 0
    handRoot.add(m)
    return m
  })
  const tubes = DRAWN.map(() => {
    const m = new THREE.Mesh(tubeGeo, handMat)
    handRoot.add(m)
    return m
  })
  for (const m of [palm, forearm, ...balls, ...tubes]) m.renderOrder = 5
  let lift = 0
  const cur = ON_PHONE.map((v) => v.clone())
  const Y = new THREE.Vector3(0, 1, 0)
  const liftQ = new THREE.Quaternion()
  const tmp = new THREE.Vector3()

  return {
    group: root,
    set({ body, ghost, wrap, engaged, grip, dt }) {
      g.visible = body > 0.01
      for (const { m, a } of mats) m.opacity = a * body
      padMat.opacity = (engaged ? 0.85 : 0.12) * body
      knob.position.x = -0.05 + 0.1 * grip
      handRoot.visible = ghost > 0.01
      handMat.uniforms.uOpacity.value = ghost
      forearmMat.uniforms.uOpacity.value = ghost
      // the thumb lifts off the pad when the operator lets go: eased, so a scrub does not snap it
      lift += ((engaged ? 0 : 1) - lift) * Math.min(1, dt * 10)
      liftQ.setFromEuler(new THREE.Euler(-0.42 * lift * (1 - wrap), 0, 0.12 * lift * (1 - wrap)))
      for (let i = 0; i < 21; i++) {
        cur[i].copy(ON_PHONE[i]).lerp(ON_HANDLE[i], wrap)
        if (i >= 2 && i <= 4) cur[i].sub(THUMB_BASE).applyQuaternion(liftQ).add(THUMB_BASE)
      }
      if (!handRoot.visible) return
      cur.forEach((v, i) => balls[i].position.copy(v))
      DRAWN.forEach(([a, b], k) => {
        const A = cur[a]
        tmp.subVectors(cur[b], A)
        const len = tmp.length()
        const r = Math.min(RADII[a], RADII[b])
        tubes[k].scale.set(r, len, r)
        tubes[k].position.copy(A).addScaledVector(tmp, 0.5)
        tubes[k].quaternion.setFromUnitVectors(Y, tmp.normalize())
      })
    },
    landmarks() {
      return cur
    },
  }
}
