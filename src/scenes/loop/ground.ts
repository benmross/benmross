import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * The Mars-like ground at the end of the Loop scene: noise terrain with craters, shaded by a
 * fixed sun, with rocks scattered off the flat ground. Pure geometry, built in a worker
 * (ground.worker.ts) so its ~50,000 noise samples never block the page.
 * World is the arm's: z up, metres, origin at the top of the turret.
 */

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
export const TABLE = { x: -2.9, y: 3.3, yaw: 0 }
{
  // screens face away from the rover, toward the operators, with the rover a little to the right of them
  const dx = TABLE.x - 2.2
  const dy = TABLE.y - 1.6
  TABLE.yaw = Math.atan2(dy, dx) - Math.PI / 2
}

export type GroundArrays = { position: Float32Array; normal: Float32Array; color: Float32Array }

export function buildGround(G: number, mobile: boolean): GroundArrays {
  const opts = { mobile }
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
  const merged = mergeGeometries([tg.toNonIndexed(), ...rocks.map((g) => (g.index ? g.toNonIndexed() : g))].map((g) => {
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k)
    return g
  }))!
  tg.dispose()
  rocks.forEach((g) => g.dispose())
  const out = {
    position: merged.attributes.position.array as Float32Array,
    normal: merged.attributes.normal.array as Float32Array,
    color: merged.attributes.color.array as Float32Array,
  }
  return out
}
