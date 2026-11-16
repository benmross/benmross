/**
 * The Kart section's timeline, shared by the WebGL stage and the page around it.
 *
 * Scroll progress 0..1 is mapped to kart time by `clock`: full speed through the
 * drift, about 1/26 speed for the tour round the kart, then full speed again as
 * it drives out of the turn. Everything the kart does (where it is, how far the
 * tail is out, what the wheel and pedals read) is a function of kart time, so the
 * scene is the same forwards and backwards.
 */

export const seg = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)))
export const smooth = (x: number) => x * x * (3 - 2 * x)
export const sm = (v: number, a: number, b: number) => smooth(seg(v, a, b))
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u

/** Scroll progress where each act starts and ends. */
export const ACT = {
  drift: [0, 0.085],
  slow: [0.085, 0.165],
  tour: [0.165, 0.87],
  exit: [0.87, 1],
} as const

/** Kart seconds per unit of scroll progress, in each phase. */
const RATE = { fast: 9.5, slow: 0.36, exit: 22 }
export const SLOW_FACTOR = RATE.slow / RATE.fast

function rate(p: number) {
  if (p < ACT.slow[0] - 0.015) return RATE.fast
  if (p < ACT.slow[1]) return lerp(RATE.fast, RATE.slow, sm(p, ACT.slow[0] - 0.015, ACT.slow[1] - 0.01))
  if (p < ACT.exit[0] - 0.005) return RATE.slow
  return lerp(RATE.slow, RATE.exit, sm(p, ACT.exit[0] - 0.005, 0.965))
}

const N = 4000
const CLOCK = new Float32Array(N + 1)
for (let i = 1; i <= N; i++) CLOCK[i] = CLOCK[i - 1] + rate((i - 0.5) / N) / N

/** Kart time in seconds at scroll progress p. */
export function clock(p: number) {
  const x = Math.max(0, Math.min(1, p)) * N
  const i = Math.min(N - 1, Math.floor(x))
  return lerp(CLOCK[i], CLOCK[i + 1], x - i)
}
/** How fast kart time is running at p, as a fraction of full speed. */
export const timeScale = (p: number) => Math.min(1, rate(p) / RATE.fast)

// ------------------------------------------------------------------ the drive

const SPEED = 12.5 // m/s through the turn, about 28 mph
const S0 = 14 // metres along the path at kart time 0
const T_EXIT = clock(ACT.exit[0])
const RADIUS = 11

/** Metres along the path, and speed, at kart time t. */
export function travel(t: number) {
  const dt = Math.max(0, t - T_EXIT)
  return { s: S0 + SPEED * t + 0.5 * 3.2 * dt * dt, v: SPEED + 3.2 * dt }
}

const curvature = (s: number) => (sm(s, 8, 13) - sm(s, 30, 36)) / RADIUS
/** How far the tail is out, radians: positive is nose into the (left) turn. */
export const slip = (s: number) => 0.58 * (sm(s, 10.5, 16.5) - sm(s, 29.5, 37)) - 0.075 * Math.sin(Math.PI * seg(s, 37, 45))

// the path, integrated once: x, z and heading against metres travelled
const DS = 0.05
const PATH_LEN = 120
const PN = Math.round(PATH_LEN / DS)
const PX = new Float32Array(PN + 1)
const PZ = new Float32Array(PN + 1)
const PH = new Float32Array(PN + 1)
for (let i = 1; i <= PN; i++) {
  const h = PH[i - 1] + curvature((i - 0.5) * DS) * DS
  PH[i] = h
  const hm = (h + PH[i - 1]) / 2
  PX[i] = PX[i - 1] + Math.cos(hm) * DS
  PZ[i] = PZ[i - 1] - Math.sin(hm) * DS
}

/** The line the kart follows: position (x, z) and heading at s metres. Heading turns left as it grows. */
export function pathAt(s: number) {
  const x = Math.max(0, Math.min(PN - 1.001, s / DS))
  const i = Math.floor(x)
  const u = x - i
  return { x: lerp(PX[i], PX[i + 1], u), z: lerp(PZ[i], PZ[i + 1], u), h: lerp(PH[i], PH[i + 1], u) }
}

/** Where the kart is and which way it faces after s metres. */
export function poseAtS(s: number) {
  const p = pathAt(s)
  return { x: p.x, z: p.z, h: p.h, yaw: p.h + slip(s), slip: slip(s) }
}

export type KartState = {
  t: number
  s: number
  /** m/s */
  v: number
  x: number
  z: number
  /** Direction of travel, and where the nose points. */
  heading: number
  yaw: number
  slip: number
  /** Road wheels against the body, radians, positive left. */
  steer: number
  roll: number
  throttle: number
  /** How hard the rear tyres are smoking, 0..1. */
  smoke: number
}

export function stateAt(t: number): KartState {
  const { s, v } = travel(t)
  const p = pathAt(s)
  const b = slip(s)
  const k = curvature(s)
  // opposite lock: the front wheels point where the kart is going, not where it is facing
  const steer = -0.78 * b + k * 1.3 * 1.6 + 0.05 * Math.sin(t * 9) * seg(Math.abs(b), 0, 0.2)
  return {
    t,
    s,
    v,
    x: p.x,
    z: p.z,
    heading: p.h,
    yaw: p.h + b,
    slip: b,
    steer,
    roll: 0.4 * k * (v / SPEED),
    throttle: Math.min(1, 0.55 + 0.6 * Math.abs(b) + 0.35 * seg(t, T_EXIT, T_EXIT + 0.6)),
    smoke: seg(Math.abs(b), 0.12, 0.45),
  }
}

// ------------------------------------------------------------------ the tour

export type Key = {
  /** Scroll progress at which the camera is here. */
  p: number
  /** Camera and what it looks at, in the kart's own frame: x forward, y up, z right, metres. */
  pos: [number, number, number]
  look: [number, number, number]
  fov: number
}

/**
 * The camera's route round the kart. Stop k of content.ts kartScene.stops is KEYS[k + 1].
 * The first key is the arrival behind the kart as time slows; the last is where it lets go.
 */
export const KEYS: Key[] = [
  { p: 0.165, pos: [-2.9, 1.0, 0.85], look: [0.0, 0.55, 0.0], fov: 40 },
  { p: 0.255, pos: [-1.72, 0.98, -0.72], look: [-0.56, 0.37, -0.04], fov: 36 },
  { p: 0.34, pos: [-1.32, 1.12, 0.62], look: [-0.56, 0.64, 0.06], fov: 36 },
  { p: 0.43, pos: [0.42, 0.4, 1.5], look: [0.24, 0.26, 0.0], fov: 38 },
  { p: 0.52, pos: [1.58, 0.52, -0.82], look: [0.66, 0.27, -0.12], fov: 36 },
  { p: 0.61, pos: [-0.6, 1.14, -0.66], look: [0.3, 0.84, 0.02], fov: 40 },
  { p: 0.7, pos: [0.0, 0.79, 0.13], look: [0.4, 0.62, 0.22], fov: 36 },
  { p: 0.79, pos: [-1.75, 2.5, 1.6], look: [0.06, 0.38, 0.0], fov: 40 },
  { p: 0.87, pos: [-2.5, 0.6, -0.55], look: [0.2, 0.5, 0.0], fov: 46 },
]

export const STOP_COUNT = KEYS.length - 2

/** Which stop's card is up at p, or -1 between acts. */
export function stopAt(p: number) {
  if (p < KEYS[0].p + 0.035 || p > KEYS[KEYS.length - 1].p - 0.02) return -1
  let best = 0
  for (let k = 1; k <= STOP_COUNT; k++) if (p >= (KEYS[k - 1].p + KEYS[k].p) / 2 - 0.004) best = k
  return best - 1
}

/** 0..1: how much of the kart is see-through. The whole kart for the signals overview. */
export const ghostAt = (p: number) => Math.min(sm(p, 0.725, 0.775), 1 - sm(p, 0.835, 0.868))
/** 0..1: the dashboard's case opens before the rest, to show the mainboard behind the screen. */
export const caseAt = (p: number) => Math.min(sm(p, 0.682, 0.712), 1 - sm(p, 0.84, 0.868))
