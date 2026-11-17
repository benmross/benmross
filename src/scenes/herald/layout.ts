import { rng } from '../../lib/motion'

/**
 * Where everything sits on screen in each of the four arrangements of the cloud. The WebGL points
 * and the DOM overlay both read this, so a label always sits on the points it names.
 *
 * Nothing here is real data: the points are a made-up spread whose only job is to read as a lot of
 * information. Groups, density and the hourly profile are shaped by hand.
 */

export const GROUPS = ['Messages', 'Mail', 'Calendar', 'Canvas', 'Opportunities', 'GitHub', 'Location', 'Health'] as const
/** Share of points per group. */
const WEIGHT = [0.27, 0.15, 0.12, 0.06, 0.08, 0.06, 0.06, 0.2]
/** Where each lane's history starts on the timeline, 0 = the far past, 1 = today. */
const LANE_START = [0.02, 0.38, 0.45, 0.52, 0.6, 0.4, 0.66, 0.3]
/** Hand-drawn shape of a night and day of scheduled work, by hour. */
const HOURLY = [0.35, 1, 0.55, 0.18, 0.1, 0.2, 0.3, 0.42, 0.38, 0.12, 0.1, 0.1, 0.4, 0.5, 0.3, 0.2, 0.6, 0.48, 0.78, 0.72, 0.6, 0.55, 0.15, 0.32]

/** Evidence for the sample answer: group and where in its cluster, in cluster radii. */
export const EVIDENCE = [
  { g: 3, dx: -0.35, dy: 0.25 },
  { g: 1, dx: 0.45, dy: -0.35 },
  { g: 2, dx: -0.2, dy: 0.5 },
  { g: 0, dx: -0.35, dy: 0.4 },
  { g: 6, dx: 0.2, dy: 0.35 },
]
/** Points 0..4 are the evidence; the next COURIERS carry it to the answer, and later carry each job's result. */
export const COURIERS = 900
export const FIRST_COURIER = EVIDENCE.length

export type Rect = { x: number; y: number; w: number; h: number }
export type Layout = {
  W: number
  H: number
  narrow: boolean
  cloud: { cx: number; cy: number; r: number }
  line: { x0: number; x1: number; y0: number; y1: number; lanes: number[]; laneH: number }
  clus: { centers: { x: number; y: number; s: number }[]; ev: { x: number; y: number }[]; chat: Rect; answer: { x: number; y: number } }
  clock: { cx: number; cy: number; r0: number; r1: number; log: Rect; chat: Rect }
}

export function layout(W: number, H: number): Layout {
  const narrow = W < 820 || W < H * 0.9
  const m = Math.min(W, H)
  const cloud = { cx: W / 2, cy: H * (narrow ? 0.46 : 0.5), r: m * (narrow ? 0.34 : 0.27) }

  const line = narrow
    ? { x0: W * 0.28, x1: W * 0.94, y0: H * 0.2, y1: H * 0.8 }
    : { x0: W * 0.17, x1: W * 0.93, y0: H * 0.18, y1: H * 0.8 }
  const laneH = (line.y1 - line.y0) / GROUPS.length
  const lanes = GROUPS.map((_, i) => line.y0 + laneH * (i + 0.5))

  // clusters, as fractions of the field they live in
  const field: Rect = narrow ? { x: W * 0.04, y: H * 0.1, w: W * 0.92, h: H * 0.44 } : { x: W * 0.36, y: H * 0.1, w: W * 0.6, h: H * 0.8 }
  const spots = narrow
    ? [[0.5, 0.5], [0.28, 0.16], [0.75, 0.2], [0.85, 0.55], [0.18, 0.55], [0.78, 0.88], [0.5, 0.86], [0.2, 0.88]]
    : [[0.42, 0.5], [0.55, 0.13], [0.15, 0.24], [0.88, 0.3], [0.5, 0.86], [0.88, 0.8], [0.82, 0.55], [0.1, 0.74]]
  const sz = [0.17, 0.13, 0.12, 0.08, 0.1, 0.07, 0.08, 0.14]
  const fs = Math.min(field.w, field.h * 1.3)
  const centers = spots.map(([u, v], i) => ({ x: field.x + u * field.w, y: field.y + v * field.h, s: sz[i] * fs * 0.6 }))
  const ev = EVIDENCE.map((e) => ({ x: centers[e.g].x + e.dx * centers[e.g].s, y: centers[e.g].y + e.dy * centers[e.g].s }))
  const chat: Rect = narrow
    ? { x: W * 0.05, y: H * 0.57, w: W * 0.9, h: H * 0.36 }
    : { x: W * 0.05, y: H * 0.17, w: Math.min(W * 0.27, 400), h: H * 0.66 }
  const answer = narrow ? { x: chat.x + chat.w / 2, y: chat.y + 40 } : { x: chat.x + chat.w, y: chat.y + chat.h * 0.45 }

  const clock = narrow
    ? (() => {
        const r1 = Math.min(W * 0.4, H * 0.22)
        return { cx: W / 2, cy: H * 0.31, r0: r1 * 0.58, r1, log: { x: W * 0.06, y: H * 0.56, w: W * 0.88, h: H * 0.1 }, chat: { x: W * 0.05, y: H * 0.64, w: W * 0.9, h: H * 0.3 } }
      })()
    : (() => {
        const r1 = Math.min(H * 0.36, W * 0.24)
        return {
          cx: W * 0.37,
          cy: H * 0.52,
          r0: r1 * 0.58,
          r1,
          log: { x: W * 0.66, y: H * 0.2, w: W * 0.28, h: H * 0.62 },
          chat: { x: W * 0.66, y: H * 0.2, w: Math.min(W * 0.28, 400), h: H * 0.62 },
        }
      })()

  return { W, H, narrow, cloud, line: { ...line, lanes, laneH }, clus: { centers, ev, chat, answer }, clock }
}

/** Per-point random numbers. Fixed per point, so a resize rebuilds the same picture. */
export function seeds(n: number) {
  const r = rng(2026)
  const s = new Float32Array(n * 8)
  for (let i = 0; i < s.length; i++) s[i] = r()
  return s
}

const gauss = (a: number, b: number) => Math.sqrt(-2 * Math.log(Math.max(a, 1e-6))) * Math.cos(2 * Math.PI * b)

/** Clock angle, clockwise from midnight at the top, for an hour of the day. */
export const hourAngle = (h: number) => (h / 24) * Math.PI * 2

let hourCdf: number[] | null = null
function hourOf(u: number) {
  if (!hourCdf) {
    const t = HOURLY.reduce((a, b) => a + b, 0)
    let c = 0
    hourCdf = HOURLY.map((v) => (c += v / t))
  }
  const h = hourCdf.findIndex((c) => u <= c)
  return h < 0 ? 23 : h
}

/** Builds the four position sets for n points. */
export function positions(L: Layout, n: number, s: Float32Array) {
  const cloud = new Float32Array(n * 3)
  const line = new Float32Array(n * 2)
  const clus = new Float32Array(n * 2)
  const clock = new Float32Array(n * 2)
  const group = new Float32Array(n)
  const tag = new Float32Array(n)
  const cdf: number[] = []
  WEIGHT.reduce((a, w) => (cdf.push(a + w), a + w), 0)

  for (let i = 0; i < n; i++) {
    const r = (k: number) => s[i * 8 + k]
    let g = cdf.findIndex((c) => r(0) <= c)
    if (g < 0) g = GROUPS.length - 1
    if (i < EVIDENCE.length) g = EVIDENCE[i].g
    group[i] = g
    tag[i] = i < EVIDENCE.length ? 1 + i : i < FIRST_COURIER + COURIERS ? 10 + ((i - FIRST_COURIER) % EVIDENCE.length) : 0

    // a ball, denser in the middle; z is for the slow turn
    const th = r(1) * Math.PI * 2
    const ph = Math.acos(2 * r(2) - 1)
    const rad = L.cloud.r * Math.pow(r(3), 0.9) * (0.85 + 0.15 * r(4))
    cloud[i * 3] = L.cloud.cx + rad * Math.sin(ph) * Math.cos(th)
    cloud[i * 3 + 1] = L.cloud.cy + rad * Math.sin(ph) * Math.sin(th) * 0.92
    cloud[i * 3 + 2] = rad * Math.cos(ph)

    // timeline: denser toward today, with bursts, on a lane per group
    const start = LANE_START[g]
    let u = start + (1 - start) * Math.pow(r(5), 0.45)
    const burst = Math.sin(u * 37 + g * 3) * Math.sin(u * 11 + g)
    if (burst > 0.55 && r(6) < 0.5) u = Math.min(1, u + (r(7) - 0.5) * 0.01)
    const { x0, x1, lanes, laneH } = L.line
    line[i * 2] = x0 + u * (x1 - x0)
    line[i * 2 + 1] = lanes[g] + gauss(r(6), r(7)) * laneH * 0.15

    // clusters, with some points strung between neighbours like threads
    const c = L.clus.centers[g]
    if (r(4) < 0.09 && i >= FIRST_COURIER + COURIERS) {
      const o = L.clus.centers[(g + 1 + Math.floor(r(5) * 3)) % GROUPS.length]
      const t = r(6)
      const bow = Math.sin(t * Math.PI) * 0.18
      clus[i * 2] = c.x + (o.x - c.x) * t - (o.y - c.y) * bow + gauss(r(7), r(1)) * 3
      clus[i * 2 + 1] = c.y + (o.y - c.y) * t + (o.x - c.x) * bow + gauss(r(2), r(3)) * 3
    } else {
      const k = Math.min(1.25, Math.abs(gauss(r(5), r(7))) * 0.45)
      const a = r(6) * Math.PI * 2
      clus[i * 2] = c.x + Math.cos(a) * k * c.s
      clus[i * 2 + 1] = c.y + Math.sin(a) * k * c.s * 0.85
    }
    if (i < EVIDENCE.length) {
      clus[i * 2] = L.clus.ev[i].x
      clus[i * 2 + 1] = L.clus.ev[i].y
    }

    // clock: a ring shaped by the hourly profile, and a bright core at the centre
    const { cx, cy, r0, r1 } = L.clock
    if (r(3) < 0.11) {
      const a = r(1) * Math.PI * 2
      const k = Math.pow(r(2), 1.6) * r0 * 0.62
      clock[i * 2] = cx + Math.cos(a) * k
      clock[i * 2 + 1] = cy + Math.sin(a) * k
    } else {
      const h = hourOf(r(5))
      const a = hourAngle(h + r(6))
      const k = r0 + 10 + Math.pow(r(7), 1.5) * (r1 - r0 - 10) * (0.3 + 0.7 * HOURLY[h])
      clock[i * 2] = cx + Math.sin(a) * k
      clock[i * 2 + 1] = cy - Math.cos(a) * k
    }
  }
  return { cloud, line, clus, clock, group, tag }
}
