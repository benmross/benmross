import { clamp01, easeInOut, seg } from '../../lib/motion'
import { hourAngle } from './layout'

/** Scroll progress at which each phase of the Herald scene starts and ends. */
export const PH = {
  toLine: [0.06, 0.17],
  scan: [0.18, 0.28],
  toClus: [0.28, 0.37],
  ask: [0.38, 0.42],
  think: [0.42, 0.47],
  evidence: [0.46, 0.5],
  pull: [0.5, 0.6],
  answer: [0.52, 0.6],
  toClock: [0.63, 0.72],
  night: [0.73, 0.96],
} as const

/** The overnight jobs, by hour of the clock (0 = midnight). The last one is the morning digest. */
export const JOB_HOURS = [0.5, 1.2, 2.1, 3.4, 5.3, 6.6, 7]
export const NIGHT_END = 7.25

export type State = {
  p: number
  stage: number
  scan: number
  wave: number
  evid: number
  pull: number
  typedQ: number
  typedA: number
  thinking: boolean
  hour: number
  hand: number
  job: number
  send: number
}

const ease = (p: number, [a, b]: readonly [number, number]) => easeInOut(seg(p, a, b))

export function stateAt(p: number): State {
  const stage = ease(p, PH.toLine) + ease(p, PH.toClus) + ease(p, PH.toClock)
  const hour = seg(p, PH.night[0], PH.night[1]) * NIGHT_END
  let job = -1
  JOB_HOURS.forEach((h, i) => hour >= h && (job = i))
  // each job sends its result for about three quarters of an hour of clock
  const send = job < 0 ? 0 : Math.sin(Math.PI * clamp01((hour - JOB_HOURS[job]) / 0.7)) * (stage > 2.9 ? 1 : 0)
  const think = seg(p, PH.think[0], PH.think[1])
  return {
    p,
    stage,
    scan: p > PH.scan[0] - 0.02 && p < PH.scan[1] + 0.02 ? seg(p, PH.scan[0], PH.scan[1]) : -1,
    wave: Math.sin(Math.PI * clamp01((p - PH.think[0]) / (PH.evidence[1] - PH.think[0]))) * (stage > 1.9 && stage < 2.1 ? 1 : 0),
    evid: seg(p, PH.evidence[0], PH.evidence[1]) * (1 - seg(p, PH.toClock[0], PH.toClock[0] + 0.03)),
    pull: Math.sin(Math.PI * seg(p, PH.pull[0], PH.pull[1])),
    typedQ: seg(p, PH.ask[0], PH.ask[1]),
    typedA: seg(p, PH.answer[0], PH.answer[1]),
    thinking: think > 0 && p < PH.answer[0],
    hour,
    hand: hourAngle(hour),
    job,
    send,
  }
}
