/**
 * The Loop section's timeline, shared by the WebGL stage and the page around it.
 * Scroll progress 0..1 is split into four acts; the arm always plays the baked
 * Arm Pilot track, at a track time chosen by `trackTime`.
 */

export const ACT = {
  intro: [0, 0.07],
  drive: [0.07, 0.64],
  trackers: [0.64, 0.84],
  wall: [0.84, 1],
} as const

/** Track seconds each act plays. The tracker comparison replays the pick and place once. */
const SPANS: { p: readonly [number, number]; t: [number, number] }[] = [
  { p: ACT.intro, t: [0, 0] },
  { p: ACT.drive, t: [0, 27] },
  { p: ACT.trackers, t: [1.7, 16.4] },
  { p: ACT.wall, t: [22.2, 27] },
]

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

/** Which tracker is on screen (fractional, for crossfades) at a scroll progress. */
export function trackerAt(p: number): number {
  const u = seg(p, ACT.trackers[0], ACT.trackers[1])
  return Math.min(TRACKER_COUNT - 1, u * TRACKER_COUNT)
}

/** The seat the arm view lands in at the end (Arm Operator, in content.ts loopScene.seats). */
export const ARM_SEAT = 1
