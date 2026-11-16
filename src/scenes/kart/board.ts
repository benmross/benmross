import * as THREE from 'three'

/**
 * The SMCSKart mainboard at its real size, built from public/media/kart/board.json, which
 * scripts/kart-board/extract.py reads out of the board's KiCad file
 * (github.com/PHS-SMCS/SMCSKart-Mainboard). The camera flies over it a few millimetres up,
 * so the copper is real geometry, raised into ridges, and the parts are modelled to size.
 *
 * Board frame, millimetres: x is KiCad x, z is KiCad y, y is height above the top copper.
 * model.ts boardToDash() places this frame behind the dashboard screen.
 */

export type BoardData = {
  outline: { x0: number; y0: number; x1: number; y1: number; r: number }
  nets: string[]
  /** x1, y1, x2, y2, width, net */
  tracks: [number, number, number, number, number, number][]
  /** x, y, size, drill, net */
  vias: [number, number, number, number, number][]
  zones: { net: number; pts: [number, number][] }[]
  /** x, y, w, h, shape (0 circle, 1 rect, 2 roundrect, 3 oval), rotation, drill, net */
  pads: [number, number, number, number, number, number, number, number][]
  parts: { ref: string; value: string; fp: string; at: [number, number, number]; side: 'F' | 'B'; box: [number, number, number, number]; pbox: [number, number, number, number] }[]
  silk: (['l' | 'r', number, number, number, number] | ['c', number, number, number] | ['t', number, number, number, number, string])[]
  /** track index, distance from the source at its start and at its end, kind (0 cmd, 1 tel, 2 pwr) */
  signals: [number, number, number, number][]
}

/** Copper height above the mask, exaggerated about four times so the traces read as ridges. */
export const COPPER = 0.14
const THICK = 1.6

export function loadBoard(): Promise<BoardData> {
  return fetch('/media/kart/board.json').then((r) => {
    if (!r.ok) throw new Error(`board.json ${r.status}`)
    return r.json()
  })
}

const SIG_VERT = /* glsl */ `
  attribute float aD;
  attribute float aKind;
  varying float vD;
  varying float vKind;
  varying vec2 vUv;
  void main() {
    vD = aD;
    vKind = aKind;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const SIG_FRAG = /* glsl */ `
  uniform vec3 uCmd, uTel, uPwr;
  uniform float uTime, uLevel;
  varying float vD;
  varying float vKind;
  varying vec2 vUv;
  void main() {
    vec3 col = vKind < 0.5 ? uCmd : vKind < 1.5 ? uTel : uPwr;
    float speed = vKind > 1.5 ? 16.0 : 24.0;
    float ph = fract((vD - uTime * speed) / 9.0);
    float head = smoothstep(0.7, 1.0, ph);
    head *= head;
    // soft across the trace, brightest on its crown
    float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
    float a = (0.12 + head * 2.4) * uLevel * smoothstep(0.0, 0.5, across);
    gl_FragColor = vec4(col * a, 1.0);
  }
`

export type Board = {
  group: THREE.Group
  signal: THREE.ShaderMaterial
  dispose(): void
}

export function buildBoard(d: BoardData, colors: { cmd: string; tel: string; pwr: string }, shadows: boolean): Board {
  const group = new THREE.Group()
  const disposables: { dispose(): void }[] = []
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x)
  const O = d.outline
  const W = O.x1 - O.x0
  const H = O.y1 - O.y0
  const cx = (O.x0 + O.x1) / 2
  const cz = (O.y0 + O.y1) / 2

  // ---------------------------------------------------------------- the bare board
  const shape = new THREE.Shape()
  {
    const r = O.r
    shape.moveTo(O.x0 + r, O.y0)
    shape.lineTo(O.x1 - r, O.y0)
    shape.quadraticCurveTo(O.x1, O.y0, O.x1, O.y0 + r)
    shape.lineTo(O.x1, O.y1 - r)
    shape.quadraticCurveTo(O.x1, O.y1, O.x1 - r, O.y1)
    shape.lineTo(O.x0 + r, O.y1)
    shape.quadraticCurveTo(O.x0, O.y1, O.x0, O.y1 - r)
    shape.lineTo(O.x0, O.y0 + r)
    shape.quadraticCurveTo(O.x0, O.y0, O.x0 + r, O.y0)
  }
  const slabGeo = keep(new THREE.ExtrudeGeometry(shape, { depth: THICK, bevelEnabled: false, curveSegments: 6 }))
  // shape is drawn in x/y; lay it into x/z with the top face at y = 0
  slabGeo.rotateX(Math.PI / 2)
  const fr4 = keep(new THREE.MeshStandardMaterial({ color: '#7a1712', roughness: 0.5 }))
  const slab = new THREE.Mesh(slabGeo, fr4)
  group.add(slab)

  // the top: solder mask over copper, pads, drills and silkscreen, painted once
  const PX = 22
  const tc = document.createElement('canvas')
  tc.width = Math.round(W * PX)
  tc.height = Math.round(H * PX)
  const g = tc.getContext('2d')!
  g.scale(PX, PX)
  g.translate(-O.x0, -O.y0)
  g.fillStyle = '#a81d16'
  g.fillRect(O.x0, O.y0, W, H)
  g.fillStyle = '#b8291f'
  for (const z of d.zones) {
    g.beginPath()
    z.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.closePath()
    g.fill()
  }
  // a faint weave, so the mask is not a flat colour at close range
  g.globalAlpha = 0.06
  g.strokeStyle = '#000'
  g.lineWidth = 0.05
  for (let x = Math.floor(O.x0); x < O.x1; x += 0.6) {
    g.beginPath()
    g.moveTo(x, O.y0)
    g.lineTo(x, O.y1)
    g.stroke()
  }
  for (let y = Math.floor(O.y0); y < O.y1; y += 0.6) {
    g.beginPath()
    g.moveTo(O.x0, y)
    g.lineTo(O.x1, y)
    g.stroke()
  }
  g.globalAlpha = 1
  g.lineCap = 'round'
  g.strokeStyle = '#c7392b'
  for (const [x1, y1, x2, y2, w] of d.tracks) {
    g.lineWidth = w * 1.5
    g.beginPath()
    g.moveTo(x1, y1)
    g.lineTo(x2, y2)
    g.stroke()
  }
  // silkscreen
  g.strokeStyle = g.fillStyle = '#f1ebe2'
  g.lineWidth = 0.15
  for (const s of d.silk) {
    if (s[0] === 'l' || s[0] === 'r') {
      const [, x1, y1, x2, y2] = s
      g.beginPath()
      if (s[0] === 'l') {
        g.moveTo(x1, y1)
        g.lineTo(x2, y2)
      } else g.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
      g.stroke()
    } else if (s[0] === 'c') {
      g.beginPath()
      g.arc(s[1], s[2], s[3], 0, Math.PI * 2)
      g.stroke()
    } else {
      const [, x, y, r, size, text] = s as ['t', number, number, number, number, string]
      g.save()
      g.translate(x, y)
      g.rotate((-r * Math.PI) / 180)
      g.font = `600 ${size * 1.25}px ui-monospace, Menlo, monospace`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      text.split('\n').forEach((line, i, all) => g.fillText(line, 0, (i - (all.length - 1) / 2) * size * 1.4))
      g.restore()
    }
  }
  // drills
  g.fillStyle = '#120806'
  for (const p of d.pads) {
    if (p[6] <= 0) continue
    g.beginPath()
    g.arc(p[0], p[1], p[6] / 2, 0, Math.PI * 2)
    g.fill()
  }
  for (const v of d.vias) {
    g.beginPath()
    g.arc(v[0], v[1], v[3] / 2, 0, Math.PI * 2)
    g.fill()
  }
  const topTex = keep(new THREE.CanvasTexture(tc))
  topTex.colorSpace = THREE.SRGBColorSpace
  topTex.anisotropy = 16
  topTex.generateMipmaps = true
  const topGeo = keep(new THREE.PlaneGeometry(W, H))
  topGeo.rotateX(-Math.PI / 2)
  const top = new THREE.Mesh(topGeo, keep(new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.42, metalness: 0.05 })))
  top.position.set(cx, 0.002, cz)
  if (shadows) top.receiveShadow = true
  group.add(top)

  const dummy = new THREE.Object3D()
  const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, n: number) => {
    const m = new THREE.InstancedMesh(keep(geo), mat, Math.max(1, n))
    m.count = n
    group.add(m)
    return m
  }

  // ---------------------------------------------------------------- copper ridges
  const ridgeMat = keep(new THREE.MeshStandardMaterial({ color: '#cf4433', roughness: 0.3, metalness: 0.05 }))
  {
    const T = d.tracks
    const bar = inst(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), ridgeMat, T.length)
    const caps = inst(new THREE.CylinderGeometry(0.5, 0.5, 1, 10).translate(0, 0.5, 0), ridgeMat, T.length * 2)
    T.forEach(([x1, y1, x2, y2, w], i) => {
      const L = Math.hypot(x2 - x1, y2 - y1)
      dummy.position.set((x1 + x2) / 2, 0, (y1 + y2) / 2)
      dummy.rotation.set(0, -Math.atan2(y2 - y1, x2 - x1), 0)
      dummy.scale.set(Math.max(L, 1e-3), COPPER, w)
      dummy.updateMatrix()
      bar.setMatrixAt(i, dummy.matrix)
      for (const [k, [x, y]] of ([[x1, y1], [x2, y2]] as const).entries()) {
        dummy.position.set(x, 0, y)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(w, COPPER, w)
        dummy.updateMatrix()
        caps.setMatrixAt(i * 2 + k, dummy.matrix)
      }
    })
  }

  // ---------------------------------------------------------------- pads and vias: bare gold
  const gold = keep(new THREE.MeshStandardMaterial({ color: '#c9a35a', roughness: 0.42, metalness: 0.85 }))
  const tin = keep(new THREE.MeshStandardMaterial({ color: '#9ea2a8', roughness: 0.5, metalness: 0.8 }))
  const holeMat = keep(new THREE.MeshBasicMaterial({ color: '#0a0505' }))
  {
    const round = d.pads.filter((p) => p[4] === 0 || p[4] === 3)
    const square = d.pads.filter((p) => p[4] === 1 || p[4] === 2)
    const disc = inst(new THREE.CylinderGeometry(0.5, 0.5, 1, 20).translate(0, 0.5, 0), gold, round.length + d.vias.length)
    round.forEach((p, i) => {
      dummy.position.set(p[0], 0, p[1])
      dummy.rotation.set(0, (p[5] * Math.PI) / 180, 0)
      dummy.scale.set(p[2], 0.06, p[3])
      dummy.updateMatrix()
      disc.setMatrixAt(i, dummy.matrix)
    })
    d.vias.forEach((v, i) => {
      dummy.position.set(v[0], 0, v[1])
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(v[2], 0.06, v[2])
      dummy.updateMatrix()
      disc.setMatrixAt(round.length + i, dummy.matrix)
    })
    const sq = inst(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), gold, square.length)
    square.forEach((p, i) => {
      dummy.position.set(p[0], 0, p[1])
      dummy.rotation.set(0, (p[5] * Math.PI) / 180, 0)
      dummy.scale.set(p[2], 0.06, p[3])
      dummy.updateMatrix()
      sq.setMatrixAt(i, dummy.matrix)
    })
    // drill holes on top of the pads, and a solder joint or pin end in every through-hole pad
    const drilled = d.pads.filter((p) => p[6] > 0)
    const holes = inst(new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2), holeMat, drilled.length + d.vias.length)
    const pins = inst(new THREE.CylinderGeometry(0.22, 0.5, 1, 10).translate(0, 0.5, 0), tin, drilled.length)
    drilled.forEach((p, i) => {
      dummy.position.set(p[0], 0.065, p[1])
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(p[6], 1, p[6])
      dummy.updateMatrix()
      holes.setMatrixAt(i, dummy.matrix)
      const r = Math.min(p[2], p[3]) * 0.8
      dummy.position.set(p[0], 0.06, p[1])
      dummy.scale.set(r, 0.7, r)
      dummy.updateMatrix()
      pins.setMatrixAt(i, dummy.matrix)
    })
    d.vias.forEach((v, i) => {
      dummy.position.set(v[0], 0.065, v[1])
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(v[3], 1, v[3])
      dummy.updateMatrix()
      holes.setMatrixAt(drilled.length + i, dummy.matrix)
    })
  }

  // ---------------------------------------------------------------- signals, along the real nets
  const signal = keep(
    new THREE.ShaderMaterial({
      vertexShader: SIG_VERT,
      fragmentShader: SIG_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uCmd: { value: new THREE.Color(colors.cmd) },
        uTel: { value: new THREE.Color(colors.tel) },
        uPwr: { value: new THREE.Color(colors.pwr) },
        uTime: { value: 0 },
        uLevel: { value: 1 },
      },
    }),
  )
  {
    const pos: number[] = []
    const uv: number[] = []
    const dd: number[] = []
    const kind: number[] = []
    const idx: number[] = []
    for (const [ti, da, db, k] of d.signals) {
      const [x1, y1, x2, y2, w] = d.tracks[ti]
      const L = Math.hypot(x2 - x1, y2 - y1) || 1e-3
      const ux = (x2 - x1) / L
      const uz = (y2 - y1) / L
      const hw = w * 0.9
      // run past both ends a little so joints between segments stay lit
      const e = w / 2
      const ax = x1 - ux * e
      const az = y1 - uz * e
      const bx = x2 + ux * e
      const bz = y2 + uz * e
      const y = COPPER + 0.004
      const base = pos.length / 3
      pos.push(ax - uz * hw, y, az + ux * hw, ax + uz * hw, y, az - ux * hw, bx - uz * hw, y, bz + ux * hw, bx + uz * hw, y, bz - ux * hw)
      uv.push(0, 0, 0, 1, 1, 0, 1, 1)
      dd.push(da, da, db, db)
      kind.push(k, k, k, k)
      idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3)
    }
    const sg = keep(new THREE.BufferGeometry())
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    sg.setAttribute('aD', new THREE.Float32BufferAttribute(dd, 1))
    sg.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1))
    sg.setIndex(idx)
    const m = new THREE.Mesh(sg, signal)
    m.renderOrder = 3
    group.add(m)
  }

  // ---------------------------------------------------------------- parts
  const M = (color: string, rough = 0.55, metal = 0) => keep(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }))
  const blackPl = M('#2a2a2f', 0.55)
  const darkPl = M('#1e1e22', 0.5)
  const steel = M('#a7abb1', 0.42, 0.85)
  // the jack shells: little to reflect in here, so a full metal would read as a black slab
  const shell = M('#c6c9ce', 0.38, 0.35)
  const tab = M('#8e9298', 0.5, 0.85)
  const resin = M('#d8b88c', 0.55)
  const discMat = M('#d27a2c', 0.5)
  const capBlue = M('#2453b0', 0.4, 0.1)
  const capTop = M('#bfc3c8', 0.3, 0.8)
  const teensyGreen = M('#0f9a63', 0.45)
  const chip = M('#1a1a1c', 0.4)
  const breakoutRed = M('#c0161c', 0.5)
  const breakoutGreen = M('#1f7a3c', 0.5)
  const orange = M('#f0a868', 0.5)
  const potBlue = M('#2a5fd0', 0.45)
  const brass = M('#d6b25a', 0.3, 0.9)
  const piGreen = M('#2a8a43', 0.5)
  const band = [M('#5a3a1a'), M('#d02020'), M('#222222'), M('#d8a020')]

  const boxG = keep(new THREE.BoxGeometry(1, 1, 1))
  const cylG = keep(new THREE.CylinderGeometry(0.5, 0.5, 1, 24))
  const leadG = keep(new THREE.CylinderGeometry(0.25, 0.25, 1, 6))
  /** A box in a footprint's frame: centre x, z, bottom y, size. */
  const bx = (parent: THREE.Object3D, mat: THREE.Material, x: number, z: number, y0: number, sx: number, sy: number, sz: number) => {
    const m = new THREE.Mesh(boxG, mat)
    m.position.set(x, y0 + sy / 2, z)
    m.scale.set(sx, sy, sz)
    if (shadows) m.castShadow = m.receiveShadow = true
    parent.add(m)
    return m
  }
  const cy = (parent: THREE.Object3D, mat: THREE.Material, x: number, z: number, y0: number, r: number, h: number, axis: 'y' | 'x' | 'z' = 'y') => {
    const m = new THREE.Mesh(cylG, mat)
    m.scale.set(r * 2, h, r * 2)
    if (axis === 'x') {
      m.rotation.z = Math.PI / 2
      m.position.set(x, y0, z)
    } else if (axis === 'z') {
      m.rotation.x = Math.PI / 2
      m.position.set(x, y0, z)
    } else m.position.set(x, y0 + h / 2, z)
    if (shadows) m.castShadow = m.receiveShadow = true
    parent.add(m)
    return m
  }
  const lead = (parent: THREE.Object3D, x: number, z: number, h: number, r = 0.3) => {
    const m = new THREE.Mesh(leadG, steel)
    m.scale.set(r * 4, h, r * 4)
    m.position.set(x, h / 2, z)
    parent.add(m)
  }

  for (const p of d.parts) {
    const fp = new THREE.Group()
    fp.position.set(p.at[0], 0, p.at[1])
    fp.rotation.y = (p.at[2] * Math.PI) / 180
    // footprints without a courtyard fall back to their pads, with a margin
    const thin = p.box[2] - p.box[0] < 3 || p.box[3] - p.box[1] < 3
    const [b0x, b0z, b1x, b1z] = thin ? [p.pbox[0] - 1.5, p.pbox[1] - 1.5, p.pbox[2] + 1.5, p.pbox[3] + 1.5] : p.box
    const bw = b1x - b0x
    const bd = b1z - b0z
    const bcx = (b0x + b1x) / 2
    const bcz = (b0z + b1z) / 2
    const n = p.fp
    if (p.side === 'B') {
      // the Raspberry Pi hangs on the back, on its 40-pin socket
      if (p.ref === 'J1') {
        fp.rotation.y = 0
        fp.position.set(0, 0, 0)
        bx(fp, blackPl, 32.5, 5.3, -THICK - 8.5, 51, 8.5, 5.1)
        bx(fp, piGreen, 34, 31.5, -THICK - 8.5 - 1.4, 85, 1.4, 56)
        bx(fp, steel, 70, 50, -THICK - 8.5 - 1.4 - 16, 21, 16, 17)
        bx(fp, chip, 30, 30, -THICK - 8.5 - 1.4 - 1.2, 15, 1.2, 15)
      } else continue
    } else if (n.startsWith('R_Axial')) {
      const L = 7.62
      cy(fp, resin, L / 2, 0, 1.8, 1.25, 6.3, 'x')
      for (let i = 0; i < 4; i++) cy(fp, band[i], L / 2 - 2.0 + i * (i === 3 ? 1.35 : 0.9), 0, 1.8, 1.29, 0.45, 'x')
      lead(fp, 0, 0, 1.8)
      lead(fp, L, 0, 1.8)
      const top = new THREE.Mesh(leadG, steel)
      top.rotation.z = Math.PI / 2
      top.scale.set(1.2, L, 1.2)
      top.position.set(L / 2, 1.8, 0)
      fp.add(top)
    } else if (n.startsWith('C_Disc')) {
      const D = parseFloat(n.match(/D([\d.]+)mm/)![1])
      const Wd = parseFloat(n.match(/W([\d.]+)mm/)![1])
      const disc = cy(fp, discMat, 2.5, 0, 2.2 + D / 2, D / 2, Wd * 0.7, 'z')
      disc.scale.y = Wd * 0.7
      lead(fp, 0, 0, 2.6)
      lead(fp, 5, 0, 2.6)
    } else if (n.startsWith('C_Radial')) {
      const D = parseFloat(n.match(/D([\d.]+)mm/)![1])
      const Hh = parseFloat(n.match(/H([\d.]+)mm/)![1])
      const P = parseFloat(n.match(/P([\d.]+)mm/)![1])
      cy(fp, capBlue, P / 2, 0, 0.4, D / 2, Hh)
      cy(fp, capTop, P / 2, 0, 0.4 + Hh, D / 2 - 0.15, 0.12)
      bx(fp, M('#dfe4ee', 0.5), P / 2 - D / 2 + 0.3, 0, 0.6, 0.8, Hh - 0.6, D * 0.5)
    } else if (n.startsWith('TO-220')) {
      // body on the courtyard's front, metal tab behind and above it
      bx(fp, blackPl, 2.54, bcz + 0.6, 0.5, 10, 9.2, 4.4)
      const t = bx(fp, tab, 2.54, bcz - 1.3, 0.5, 10, 15.5, 1.27)
      cy(fp, holeMat, 2.54, bcz - 1.3, 12.6, 1.8, 1.4, 'z')
      void t
      for (const x of [0, 2.54, 5.08]) lead(fp, x, 0, 0.6, 0.25)
    } else if (n.startsWith('DIP-8')) {
      bx(fp, blackPl, 3.81, 3.81, 0.6, 6.35, 3.3, 9.6)
      cy(fp, darkPl, 1.6, 0.4, 3.9, 0.5, 0.05)
      for (let i = 0; i < 4; i++) for (const x of [0, 7.62]) lead(fp, x, i * 2.54, 1.2, 0.22)
    } else if (n === 'Teensy41') {
      // two rows of sockets, and the Teensy standing on them
      bx(fp, blackPl, bcx, 7.62 + bcz - 7.62 - 7.62, 0, 61, 8.5, 2.5)
      bx(fp, blackPl, bcx, bcz + 7.62, 0, 61, 8.5, 2.5)
      const y = 8.5 + 2.5
      bx(fp, teensyGreen, bcx, bcz, y, 61, 1.6, 17.8)
      bx(fp, chip, bcx + 2, bcz, y + 1.6, 10, 1.2, 10)
      bx(fp, steel, bcx - 30.5 + 2.5, bcz, y + 1.6, 5.6, 2.8, 7.6)
      bx(fp, steel, bcx + 26, bcz, y + 1.6, 11, 1.8, 11.5)
      bx(fp, M('#e8e0d0', 0.4), bcx + 14, bcz - 4, y + 1.6, 3, 1.4, 3)
      // the pins through the sockets
      for (let i = 0; i < 24; i++) for (const s of [-1, 1]) bx(fp, steel, bcx - 29.2 + i * 2.54, bcz + s * 7.62, 8.5, 0.64, 2.5, 0.64)
    } else if (n.startsWith('PinHeader_1x06')) {
      // the MCP4725 breakout on its six pins
      for (let i = 0; i < 6; i++) bx(fp, steel, 0, i * 2.54, 0, 0.64, 9.5, 0.64)
      bx(fp, blackPl, 0, 6.35, 0, 2.5, 2.5, 15.2)
      bx(fp, breakoutRed, -5.5, 6.35, 9.5, 13, 1.6, 17.5)
      bx(fp, chip, -6, 6.35, 11.1, 3, 1, 3)
    } else if (n.startsWith('PinHeader_1x08')) {
      // the MPU-6050 breakout
      for (let i = 0; i < 8; i++) bx(fp, steel, 0, i * 2.54, 0, 0.64, 9.5, 0.64)
      bx(fp, blackPl, 0, 8.89, 0, 2.5, 2.5, 20.3)
      bx(fp, breakoutGreen, -7.5, 8.89, 9.5, 16, 1.6, 21)
      bx(fp, chip, -8, 8.89, 11.1, 4, 0.9, 4)
    } else if (n.includes('NEO-M9N')) {
      bx(fp, breakoutRed, bcx, bcz, 9, bw - 0.5, 1.6, bd - 0.5)
      bx(fp, M('#dfe2ea', 0.4, 0.6), bcx, bcz, 10.6, 10, 2.4, 12)
      bx(fp, brass, bcx + bw / 2 - 4, bcz - bd / 2 + 4, 10.6, 6, 6, 6)
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cy(fp, steel, bcx + sx * (bw / 2 - 2.5), bcz + sz * (bd / 2 - 2.5), 0, 1.2, 9)
    } else if (n.startsWith('RJ45')) {
      bx(fp, shell, bcx, bcz, 0, bw - 0.4, 13.5, bd - 0.4)
    } else if (n.startsWith('USB-A')) {
      // drawn in the board's frame: the receptacle runs from its pins out past the board edge
      fp.rotation.y = 0
      fp.position.set(0, 0, 0)
      bx(fp, shell, -31.5, 40.7, 0, 15, 7, 13.2)
      // stamped detail on the shell: a seam, two spring tabs, a rear lip
      const pressed = M('#8d9096', 0.45, 0.3)
      bx(fp, pressed, -31.5, 40.7, 7, 14, 0.06, 0.35)
      for (const v of [37.4, 44]) bx(fp, pressed, -34.5, v, 7, 4, 0.18, 1.6)
      bx(fp, pressed, -24.3, 40.7, 0, 0.6, 7.25, 13.4)
      bx(fp, chip, -38.6, 40.7, 1.4, 0.4, 4.2, 11)
      bx(fp, M('#f4f0e8', 0.5), -36.5, 40.7, 3.2, 4.5, 0.9, 10)
    } else if (n.startsWith('PWRM')) {
      bx(fp, darkPl, bcx, bcz, 0, bw - 0.6, 10.2, bd - 0.6)
    } else if (n.startsWith('CONN-TH_HB9500')) {
      bx(fp, orange, bcx, bcz, 0, bw - 0.4, 10, bd - 0.4)
    } else if (n.startsWith('Potentiometer')) {
      bx(fp, potBlue, bcx, bcz, 0, 6.7, 4.8, 6.7)
      cy(fp, brass, bcx + 2, bcz + 2, 4.8, 1, 0.8)
    } else if (n.startsWith('CONN-TH') || n.startsWith('Molex')) {
      bx(fp, blackPl, bcx, bcz, 0, bw - 0.4, 9.5, bd - 0.4)
    } else continue
    group.add(fp)
  }

  return {
    group,
    signal,
    dispose() {
      for (const x of disposables) x.dispose()
    },
  }
}
