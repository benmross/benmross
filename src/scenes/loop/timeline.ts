/**
 * The Loop section's timeline, shared by the WebGL stage and the page around it.
 * Scroll progress 0..1 is split into four acts; the arm always plays the baked
 * Arm Pilot track, at a track time chosen by `trackTime`.
 */

export const ACT = {
  intro: [0, 0.07],
  drive: [0.07, 0.6],
  trackers: [0.6, 0.8],
  wall: [0.8, 1],
} as const

/** Inside the last act: the operator panel goes, the ground turns to terrain, the camera swings to the base station. */
export const WALL = {
  panel: [0.8, 0.835],
  terrain: [0.825, 0.88],
  swing: [0.865, 0.965],
  title: [0.94, 0.97],
} as const

/** Track seconds each act plays. Where two acts do not meet in time, the stage blends the arm across the seam. */
const SPANS: { p: readonly [number, number]; t: [number, number] }[] = [
  { p: ACT.intro, t: [0, 0] },
  { p: ACT.drive, t: [0, 22.4] },
  { p: ACT.trackers, t: [1.7, 17.6] },
  { p: ACT.wall, t: [17.6, 21.6] },
]

/** Scroll progress over which the arm blends from where the drive ended into the tracker replay. */
export const SEAM = { at: ACT.trackers[0], len: 0.03, from: 22.4 }

export const seg = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)))
export const smooth = (x: number) => x * x * (3 - 2 * x)
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

export function trackTime(p: number): number {
  for (const s of SPANS) {
    if (p <= s.p[1]) return s.t[0] + (s.t[1] - s.t[0]) * seg(p, s.p[0], s.p[1])
  }
  return SPANS[SPANS.length - 1].t[1]
}

export const TRACKER_COUNT = 4

/** Where the tracker comparison is, 0 at its start to 4 at its end: tracker k fills [k, k + 1). */
export function trackerAt(p: number): number {
  return seg(p, ACT.trackers[0], ACT.trackers[1]) * TRACKER_COUNT
}

/** The seat whose screen draws the arm live (Arm Operator, in content.ts loopScene.seats). */
export const ARM_SEAT = 1
