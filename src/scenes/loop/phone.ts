import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

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
  /** w: how much the phone is on screen (tracker crossfade); engaged: thumb down; grip: slider 0..1. */
  set(w: number, engaged: boolean, grip: number, dt: number): void
}

export function buildPhone(o: {
  fill: THREE.Material
  line: (c: THREE.Color, opacity: number) => THREE.LineBasicMaterial
  keep: <X extends { dispose(): void }>(x: X) => X
  fg: THREE.Color
  accent: THREE.Color
  tint: THREE.Color
}): Phone {
  const { keep, fg, accent, tint } = o
  const g = new THREE.Group()
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
  // a right hand under the phone, fingers round the left side, thumb over the right edge onto the pad
  const cap = (a: number[], b: number[], r: number) => {
    const A = new THREE.Vector3(a[0], a[1], a[2])
    const B = new THREE.Vector3(b[0], b[1], b[2])
    const d = B.clone().sub(A)
    const c = new THREE.CapsuleGeometry(r, d.length(), 6, 14)
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()))
    c.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2)
    return c.index ? c.toNonIndexed() : c
  }
  const ell = (c: number[], r: number[]) => {
    const s = new THREE.SphereGeometry(1, 28, 18)
    s.scale(r[0], r[1], r[2])
    s.translate(c[0], c[1], c[2])
    return s.toNonIndexed()
  }
  const zb = -D / 2 // the back of the phone
  const handParts = [
    ell([0.05, -0.006, zb - 0.017], [0.05, 0.04, 0.015]), // palm, under the lower half
    cap([0.085, -0.002, zb - 0.02], [0.2, 0.004, zb - 0.05], 0.025), // wrist and forearm, toward the operator
  ]
  // four fingers wrapping the left edge, tips resting on its rim
  ;[
    [-0.006, 0.0088],
    [0.015, 0.0092],
    [0.036, 0.0088],
    [0.056, 0.0076],
  ].forEach(([x, r]) => {
    const p = [
      [x + 0.01, -0.016, zb - 0.026],
      [x + 0.004, -0.04, zb - 0.02],
      [x, -W / 2 - 0.009, zb - 0.004],
      [x - 0.002, -W / 2 - 0.004, D / 2 + 0.002],
    ]
    for (let i = 0; i < 3; i++) handParts.push(cap(p[i], p[i + 1], r * (1 - i * 0.08)))
  })
  const handGeo = keep(
    mergeGeometries(
      handParts.map((h) => {
        for (const k of Object.keys(h.attributes)) if (k !== 'position' && k !== 'normal') h.deleteAttribute(k)
        return h
      }),
    )!,
  )
  handParts.forEach((h) => h.dispose())
  // the thumb pivots at its base, so it can lift off the pad when the operator lets go
  const thumbBase = new THREE.Vector3(0.078, 0.03, zb - 0.012)
  const thumbParts = [
    cap([0, 0, 0], [-0.016, 0.009, 0.014], 0.0105),
    cap([-0.016, 0.009, 0.014], [-0.027, -0.004, 0.024], 0.0095),
    cap([-0.027, -0.004, 0.024], [-0.033, -0.016, 0.029], 0.0086),
  ]
  const thumbGeo = keep(
    mergeGeometries(
      thumbParts.map((h) => {
        for (const k of Object.keys(h.attributes)) if (k !== 'position' && k !== 'normal') h.deleteAttribute(k)
        return h
      }),
    )!,
  )
  thumbParts.forEach((h) => h.dispose())

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
          vX = position.x;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV; varying float vX;
        uniform vec3 uColor; uniform float uOpacity;
        void main(){
          float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
          float a = (0.05 + 0.55 * rim) * uOpacity;
          a *= 1.0 - smoothstep(0.12, 0.2, vX); // the forearm fades out
          gl_FragColor = vec4(uColor, a);
          #include <colorspace_fragment>
        }`,
    }),
  )
  const hand = new THREE.Mesh(handGeo, handMat)
  hand.renderOrder = 5
  g.add(hand)
  const thumb = new THREE.Mesh(thumbGeo, handMat)
  thumb.renderOrder = 5
  const thumbPivot = new THREE.Group()
  thumbPivot.position.copy(thumbBase)
  thumbPivot.add(thumb)
  g.add(thumbPivot)
  let lift = 0

  return {
    group: g,
    set(w, engaged, grip, dt) {
      g.visible = w > 0.01
      for (const { m, a } of mats) m.opacity = a * w
      padMat.opacity = (engaged ? 0.85 : 0.12) * w
      knob.position.x = -0.05 + 0.1 * grip
      handMat.uniforms.uOpacity.value = w
      // thumb up when the operator lets go: eased, so a scrub does not snap it
      const want = engaged ? 0 : 1
      lift += (want - lift) * Math.min(1, dt * 10)
      thumbPivot.rotation.set(-0.42 * lift, 0, 0.12 * lift)
    },
  }
}
