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
  drift: [0, 0.075],
  slow: [0.075, 0.165],
  tour: [0.165, 0.91],
  exit: [0.91, 1],
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

export type V3 = [number, number, number]
export type Key = {
  /** Scroll progress at which the camera is here, roughly: speed is smoothed across keys. */
  p: number
  /**
   * Which frame pos and look are in. body: the kart's own frame, metres (x forward, y up, z right).
   * dash: the dashboard case's frame, metres. board: the mainboard, millimetres (KiCad x, KiCad y,
   * height above the copper). model.ts converts.
   */
  frame: 'body' | 'dash' | 'board'
  pos: V3
  look: V3
  fov: number
  /** 0: the world's up. 1: the board's normal, so the board is the ground under the camera. */
  up?: number
  /** The card (content.ts kartScene.stops) this key carries. */
  stop?: number
}

/**
 * One continuous path round the kart and into its mainboard. The camera never stops: it slows
 * near a part and carries on, like the Falconia flight. stage.ts bakes these into a smoothed path.
 * Keys either side of a change of scale are spaced so neighbouring stretches are of similar length,
 * which keeps the spline from overshooting into the parts.
 */
export const KEYS: Key[] = [
  { p: 0.165, frame: 'body', pos: [-2.9, 1.0, 0.85], look: [0.0, 0.55, 0.0], fov: 40 },
  // motor and controller, low from the rear right
  { p: 0.225, frame: 'body', pos: [-1.6, 0.72, 0.66], look: [-0.55, 0.4, -0.04], fov: 38, stop: 0 },
  // up over the back to look down on the cooling loop
  { p: 0.285, frame: 'body', pos: [-1.3, 1.42, -0.05], look: [-0.5, 0.7, 0.05], fov: 38, stop: 1 },
  { p: 0.32, frame: 'body', pos: [-0.9, 1.0, 0.98], look: [-0.15, 0.42, 0.25], fov: 38 },
  // down the right side to the battery under the floor
  { p: 0.355, frame: 'body', pos: [0.15, 0.44, 1.22], look: [0.2, 0.24, 0.22], fov: 38, stop: 2 },
  { p: 0.39, frame: 'body', pos: [1.35, 0.5, 0.88], look: [0.65, 0.3, 0.05], fov: 38 },
  // round the nose, low, to the steering
  { p: 0.425, frame: 'body', pos: [1.52, 0.45, -0.52], look: [0.66, 0.27, -0.14], fov: 36, stop: 3 },
  { p: 0.46, frame: 'body', pos: [0.62, 0.95, -0.98], look: [0.3, 0.8, 0.0], fov: 38 },
  // up the left side to the wheel
  { p: 0.49, frame: 'body', pos: [-0.45, 1.16, -0.66], look: [0.3, 0.86, 0.02], fov: 38, stop: 4 },
  { p: 0.52, frame: 'body', pos: [-0.22, 1.04, -0.12], look: [0.36, 0.67, 0.18], fov: 38 },
  // the driver's view of the dashboard
  { p: 0.55, frame: 'body', pos: [0.1, 0.7, 0.21], look: [0.375, 0.628, 0.22], fov: 36, stop: 5 },
  // round the side of the case, to the gland the wheel's cable comes in through
  { p: 0.575, frame: 'dash', pos: [-0.13, 0.05, -0.2], look: [-0.03, 0.005, -0.125], fov: 40 },
  { p: 0.595, frame: 'dash', pos: [-0.045, 0.012, -0.175], look: [-0.019, 0.0, -0.12], fov: 46 },
  { p: 0.61, frame: 'dash', pos: [-0.0215, 0.0025, -0.142], look: [-0.0185, 0.0007, -0.11], fov: 56 },
  // through it: the camera is a few millimetres across now
  { p: 0.622, frame: 'dash', pos: [-0.0182, 0.0021, -0.127], look: [-0.0182, 0.0014, -0.1], fov: 66, up: 0.15 },
  { p: 0.634, frame: 'dash', pos: [-0.0172, 0.0026, -0.112], look: [-0.0178, 0.0012, -0.085], fov: 72, up: 0.45 },
  // over the USB receptacle the cable plugs into, and down onto the copper
  { p: 0.648, frame: 'board', pos: [-43, 41.8, 9.6], look: [-30, 41.6, 7], fov: 76, up: 0.85 },
  { p: 0.664, frame: 'board', pos: [-28, 42.8, 9.4], look: [-18, 42.6, 3], fov: 78, up: 1 },
  // along the USB data pair and in under the Teensy, between its rows of sockets
  { p: 0.68, frame: 'board', pos: [-18.5, 42.4, 3.4], look: [-6, 41.2, 2.8], fov: 80, up: 1, stop: 6 },
  { p: 0.698, frame: 'board', pos: [-3, 40.6, 4.0], look: [10, 40.2, 4.0], fov: 80, up: 1 },
  { p: 0.716, frame: 'board', pos: [14, 40.2, 4.2], look: [27, 40.4, 4.0], fov: 80, up: 1 },
  { p: 0.733, frame: 'board', pos: [31, 41.2, 3.6], look: [39, 47, 2.4], fov: 80, up: 1 },
  // out from under it, along the CAN pair to the transceiver
  { p: 0.75, frame: 'board', pos: [38.4, 50.6, 2.6], look: [45, 58, 2.2], fov: 78, up: 1 },
  { p: 0.767, frame: 'board', pos: [44.6, 57.4, 6.8], look: [50, 66, 4], fov: 76, up: 1 },
  { p: 0.784, frame: 'board', pos: [55.5, 68.5, 7.4], look: [52, 80, 7], fov: 74, up: 1 },
  // up past the CAN connectors and off the board
  { p: 0.8, frame: 'board', pos: [53, 74, 15], look: [44, 84, 10], fov: 70, up: 1 },
  { p: 0.815, frame: 'board', pos: [48, 92, 36], look: [34, 62, 0], fov: 64, up: 0.85 },
  { p: 0.832, frame: 'dash', pos: [0.07, 0.15, 0.04], look: [-0.01, 0.0, 0.0], fov: 54, up: 0.35 },
  { p: 0.852, frame: 'body', pos: [0.45, 1.6, 0.85], look: [0.2, 0.6, 0.12], fov: 46 },
  // every signal on the kart, from above and behind
  { p: 0.88, frame: 'body', pos: [-1.55, 2.35, 1.45], look: [0.06, 0.38, 0.0], fov: 40, stop: 7 },
  { p: 0.91, frame: 'body', pos: [-2.55, 0.72, 0.55], look: [0.2, 0.5, 0.0], fov: 44 },
]

/** Keys where the camera is inside the dashboard case: from the gland until it is clear of the case. */
export const INSIDE = { in: [13, 15], out: [26, 27] } as const
/** Keys between which the case, then the whole kart, goes see-through, and back. */
export const GHOST = { caseIn: [25, 27], bodyIn: [27, 29], bodyOut: [29, 30] } as const
