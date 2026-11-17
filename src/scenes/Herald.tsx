import { useEffect, useRef, useState } from 'react'
import { heraldScene as T } from '../content'
import { reducedMotion, seg, useNearViewport, useSceneProgress } from '../lib/motion'
import type { Cloud } from './herald/cloud'
import { layout, type Layout, type Rect } from './herald/layout'
import { JOB_HOURS, PH, stateAt, type State } from './herald/timeline'

function webgl() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

/** One cloud of light that becomes a timeline, then clusters that answer a question, then a clock. */
export function HeraldScene() {
  const [mode, setMode] = useState<'stage' | 'still'>('stage')
  useEffect(() => {
    if (reducedMotion() || !webgl()) setMode('still')
  }, [])
  return mode === 'stage' ? <Stage onFail={() => setMode('still')} /> : <Still />
}

function Still() {
  return (
    <div className="scene hc-still">
      <img src="/media/herald/still.webp" alt={T.label} loading="lazy" />
    </div>
  )
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) })
const show = (el: HTMLElement | SVGElement | null | undefined, o: number) => {
  if (!el) return
  const v = o.toFixed(3)
  if (el.style.opacity !== v) el.style.opacity = v
  el.style.visibility = o < 0.002 ? 'hidden' : 'visible'
}
const at = (el: HTMLElement | null | undefined, x: number, y: number) => {
  if (el) el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
}
const clock12 = (h: number) => {
  const hh = Math.floor(h) % 24
  const mm = Math.floor((h - Math.floor(h)) * 60)
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`
}
/** Shows or removes an element from the flow, so hidden chat lines take no room. */
const flow = (el: HTMLElement | null | undefined, on: boolean) => {
  if (!el) return
  const d = on ? '' : 'none'
  if (el.style.display !== d) el.style.display = d
  show(el, on ? 1 : 0)
}
const typed = (s: string, u: number) => s.slice(0, Math.round(s.length * u))

function Stage({ onFail }: { onFail: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const cloud = useRef<Cloud | null>(null)
  const L = useRef<Layout | null>(null)
  const mouse = useRef<[number, number]>([-1e4, -1e4])
  const hold = useRef<number | null>(null)
  const progress = useSceneProgress(ref)
  const near = useNearViewport(ref, '120% 0px')
  const visible = useNearViewport(ref, '0px')
  const [step, setStep] = useState(0)

  const intro = useRef<HTMLParagraphElement>(null)
  const lineHead = useRef<HTMLParagraphElement>(null)
  const lanes = useRef<(HTMLSpanElement | null)[]>([])
  const axis = useRef<HTMLDivElement>(null)
  const groups = useRef<(HTMLSpanElement | null)[]>([])
  const ev = useRef<(HTMLDivElement | null)[]>([])
  const chat = useRef<HTMLDivElement>(null)
  const status = useRef<HTMLSpanElement>(null)
  const qa = useRef<HTMLDivElement>(null)
  const q = useRef<HTMLDivElement>(null)
  const thinking = useRef<HTMLDivElement>(null)
  const ans = useRef<HTMLDivElement>(null)
  const ansText = useRef<HTMLSpanElement>(null)
  const ansMore = useRef<HTMLDivElement>(null)
  const night = useRef<HTMLDivElement>(null)
  const jobs = useRef<(HTMLDivElement | null)[]>([])
  const digest = useRef<HTMLDivElement>(null)
  const dial = useRef<SVGSVGElement>(null)
  const hand = useRef<SVGLineElement>(null)
  const handDot = useRef<SVGCircleElement>(null)
  const sleep = useRef<SVGPathElement>(null)
  const hours = useRef<(HTMLSpanElement | null)[]>([])
  const time = useRef<HTMLDivElement>(null)
  const timeText = useRef<HTMLSpanElement>(null)
  const note = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (!near || cloud.current) return
    let dead = false
    let raf = 0
    let ro: ResizeObserver | null = null
    import('./herald/cloud')
      .then(({ createCloud }) => {
        if (dead) return
        const mobile = window.matchMedia('(max-width: 820px)').matches
        const c = createCloud(canvas.current!, mobile ? 12000 : 26000)
        cloud.current = c
        const size = () => {
          const b = box.current!
          L.current = layout(b.clientWidth, b.clientHeight)
          c.resize(L.current, Math.min(window.devicePixelRatio || 1, 2))
          placeStatic(L.current)
        }
        size()
        ro = new ResizeObserver(size)
        ro.observe(box.current!)
        const loop = (t: number) => {
          raf = requestAnimationFrame(loop)
          if (!running.current || !L.current) return
          const s = stateAt(hold.current ?? progress.get())
          const fx = frame(s, L.current)
          c.render(s, { time: t / 1000, mouse: mouse.current, ...fx })
        }
        raf = requestAnimationFrame(loop)
        ref.current?.classList.add('on')
      })
      .catch((e) => {
        console.error(e)
        if (!dead) onFail()
      })
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [near]) // eslint-disable-line react-hooks/exhaustive-deps

  const running = useRef(false)
  useEffect(() => {
    running.current = visible
  }, [visible])
  useEffect(
    () => () => {
      cloud.current?.dispose()
      cloud.current = null
    },
    [],
  )

  // screenshots and debugging: window.__herald(0.5) holds the scene at that progress, null releases it
  useEffect(() => {
    const w = window as unknown as { __herald?: (t: number | null) => void }
    w.__herald = (t) => {
      hold.current = t
      running.current = true
    }
    return () => void delete w.__herald
  }, [])

  /** Things that move only when the layout changes. */
  function placeStatic(l: Layout) {
    l.line.lanes.forEach((y, i) => at(lanes.current[i], l.line.x0 - 18, y))
    if (axis.current) {
      axis.current.style.left = `${l.line.x0}px`
      axis.current.style.width = `${l.line.x1 - l.line.x0}px`
      axis.current.style.top = `${l.line.y1 + 18}px`
    }
    const hx = l.narrow ? 20 : l.line.x0
    at(lineHead.current, hx, l.line.y0 - (l.narrow ? 70 : 56))
    if (lineHead.current) lineHead.current.style.width = `${Math.min(l.W - hx - 20, 620)}px`
    l.clus.centers.forEach((c, i) => at(groups.current[i], c.x, c.y - c.s * 1.02 - 10))
    l.clus.ev.forEach((e, i) => {
      const el = ev.current[i]
      if (!el) return
      const right = e.x > l.W * 0.8
      el.classList.toggle('left', right)
      at(el, e.x + (right ? -14 : 14), e.y + 12)
    })
    at(intro.current, l.cloud.cx, l.cloud.cy + l.cloud.r * 1.12)
    const { cx, cy, r1 } = l.clock
    if (dial.current) {
      dial.current.setAttribute('viewBox', `0 0 ${l.W} ${l.H}`)
      const a0 = 0.02
      const a1 = (7 / 24) * Math.PI * 2
      const R = r1 + 22
      const p = (a: number) => `${(cx + Math.sin(a) * R).toFixed(1)} ${(cy - Math.cos(a) * R).toFixed(1)}`
      sleep.current?.setAttribute('d', `M ${p(a0)} A ${R} ${R} 0 0 1 ${p(a1)}`)
    }
    hours.current.forEach((el, i) => {
      const a = (i / 4) * Math.PI * 2
      const k = r1 + (l.narrow ? 24 : 50)
      at(el, cx + Math.sin(a) * k, cy - Math.cos(a) * k)
    })
    at(time.current, cx, cy)
  }

  /** Per frame: the overlay, and where the couriers fly from and to. */
  function frame(s: State, l: Layout) {
    const p = s.p
    setStep(p < PH.toLine[1] ? 0 : p < PH.toClus[1] ? 1 : p < PH.toClock[0] ? 2 : 3)

    show(intro.current, 1 - seg(p, 0.05, 0.09))
    const lineOn = seg(p, 0.13, 0.17) * (1 - seg(p, PH.toClus[0], PH.toClus[0] + 0.03))
    show(lineHead.current, lineOn)
    lanes.current.forEach((el) => show(el, lineOn))
    show(axis.current, lineOn)

    const clusOn = seg(p, PH.toClus[1] - 0.04, PH.toClus[1]) * (1 - seg(p, PH.toClock[0], PH.toClock[0] + 0.03))
    groups.current.forEach((el) => show(el, clusOn * (1 - 0.6 * s.evid)))
    ev.current.forEach((el, i) => show(el, clusOn * seg(s.evid, i * 0.12, i * 0.12 + 0.5)))

    // the chat: beside the clusters, then beside the clock
    const move = seg(p, PH.toClock[0], PH.toClock[1])
    const r = lerpRect(l.clus.chat, l.clock.chat, move * move * (3 - 2 * move))
    const c = chat.current
    if (c) {
      at(c, r.x, r.y)
      c.style.width = `${r.w.toFixed(1)}px`
      c.style.height = `${r.h.toFixed(1)}px`
    }
    show(c, seg(p, PH.toClus[1] - 0.03, PH.ask[0]))
    show(qa.current, 1 - seg(p, PH.toClock[0], PH.toClock[0] + 0.03))
    if (q.current) q.current.textContent = typed(T.question, s.typedQ) || '​'
    flow(q.current, s.typedQ > 0)
    flow(thinking.current, s.thinking)
    if (ansText.current) ansText.current.textContent = typed(T.answer, s.typedA)
    flow(ans.current, s.typedA > 0)
    show(ansMore.current, seg(s.typedA, 0.95, 1))
    if (ansMore.current) ansMore.current.style.display = s.typedA > 0.95 ? 'block' : 'none'
    const statusText = s.thinking || (s.typedA > 0 && s.typedA < 1) || (s.send > 0.05 && s.stage > 2.9) ? `${T.reading}…` : T.online
    if (status.current && status.current.textContent !== statusText) status.current.textContent = statusText

    // the night
    const ck = seg(p, PH.toClock[1] - 0.03, PH.toClock[1])
    show(night.current, ck)
    jobs.current.forEach((el, i) => flow(el, s.job >= i && i < T.jobs.length - 1))
    flow(digest.current, s.job >= T.jobs.length - 1)
    show(dial.current, ck)
    hours.current.forEach((el) => show(el, ck))
    show(time.current, ck)
    if (timeText.current) {
      const tt = clock12(s.hour)
      if (timeText.current.textContent !== tt) timeText.current.textContent = tt
    }
    const { cx, cy, r0, r1 } = l.clock
    const R = r1 + 14
    hand.current?.setAttribute('x1', String(cx + Math.sin(s.hand) * (r0 * 0.75)))
    hand.current?.setAttribute('y1', String(cy - Math.cos(s.hand) * (r0 * 0.75)))
    hand.current?.setAttribute('x2', String(cx + Math.sin(s.hand) * R))
    hand.current?.setAttribute('y2', String(cy - Math.cos(s.hand) * R))
    handDot.current?.setAttribute('cx', String(cx + Math.sin(s.hand) * R))
    handDot.current?.setAttribute('cy', String(cy - Math.cos(s.hand) * R))
    show(note.current, seg(p, PH.toClus[1] - 0.03, PH.ask[0]))

    // couriers carry each job's result to its line in the chat
    let from: [number, number] = [0, 0]
    let to: [number, number] = [0, 0]
    if (s.job >= 0) {
      const a = (JOB_HOURS[s.job] / 24) * Math.PI * 2 + 0.05
      const k = (r0 + r1) / 2
      from = [cx + Math.sin(a) * k, cy - Math.cos(a) * k]
      const target = s.job >= T.jobs.length - 1 ? digest.current : jobs.current[s.job]
      const b = box.current?.getBoundingClientRect()
      const t = target?.getBoundingClientRect()
      if (b && t && t.height > 0) to = [t.left - b.left + Math.min(40, t.width / 2), t.top - b.top + t.height / 2]
      else to = [r.x + 30, r.y + r.h / 2]
    }
    return { from, to }
  }

  return (
    <div ref={ref} className="scene hc" style={{ height: '1000vh' }}>
      <div
        ref={box}
        className="scene-sticky"
        onPointerMove={(e) => {
          const b = e.currentTarget.getBoundingClientRect()
          mouse.current = [e.clientX - b.left, e.clientY - b.top]
        }}
        onPointerLeave={() => (mouse.current = [-1e4, -1e4])}
      >
        <canvas ref={canvas} className="hc-canvas" role="img" aria-label={T.label} />

        <p ref={intro} className="hc-intro">
          {T.intro}
        </p>

        <p ref={lineHead} className="hc-head">
          {T.line}
        </p>
        {T.groups.map((g, i) => (
          <span key={g} ref={(el) => void (lanes.current[i] = el)} className="hc-lane">
            {g}
          </span>
        ))}
        <div ref={axis} className="hc-axis">
          <span>{T.past}</span>
          <span>{T.now}</span>
        </div>

        {T.groups.map((g, i) => (
          <span key={g} ref={(el) => void (groups.current[i] = el)} className="hc-group">
            {g}
          </span>
        ))}
        {T.evidence.map((e, i) => (
          <div key={e.src} ref={(el) => void (ev.current[i] = el)} className="hc-ev">
            <b>{e.src}</b>
            <span>{e.text}</span>
          </div>
        ))}

        <svg ref={dial} className="hc-dial" aria-hidden>
          <path ref={sleep} className="hc-sleep" />
          <line ref={hand} className="hc-hand" />
          <circle ref={handDot} r="4" className="hc-handdot" />
        </svg>
        {T.clockLabels.map((h, i) => (
          <span key={h} ref={(el) => void (hours.current[i] = el)} className="hc-hour">
            {h}
          </span>
        ))}
        <div ref={time} className="hc-time">
          <span ref={timeText} />
          <small>{T.tagline}</small>
        </div>

        <div ref={chat} className="hc-chat">
          <div className="hc-chat-top">
            <img src="/media/herald/orb.png" alt="" width="34" height="34" />
            <div>
              <b>{T.name}</b>
              <span ref={status}>{T.online}</span>
            </div>
          </div>
          <div className="hc-msgs">
            <div ref={qa} className="hc-thread">
              <div ref={q} className="hc-msg me" />
              <div ref={thinking} className="hc-msg hc-dots">
                <i />
                <i />
                <i />
              </div>
              <div ref={ans} className="hc-msg">
                <span ref={ansText} />
                <div ref={ansMore}>
                  <div className="hc-chips">
                    {T.chips.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                  <div className="hc-btns">
                    <span className="on">{T.buttons[0]}</span>
                    <span>{T.buttons[1]}</span>
                  </div>
                </div>
              </div>
            </div>
            <div ref={night} className="hc-thread hc-night">
              {T.jobs.slice(0, -1).map((j, i) => (
                <div key={j.text} ref={(el) => void (jobs.current[i] = el)} className="hc-job">
                  <time>{clock12(JOB_HOURS[i])}</time>
                  <b>{j.src}</b>
                  <span>{j.text}</span>
                </div>
              ))}
              <div ref={digest} className="hc-msg">
                {T.digest}
                <div className="hc-btns">
                  <span className="on">{T.digestButtons[0]}</span>
                  <span>{T.digestButtons[1]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p ref={note} className="hc-note">
          {T.note}
        </p>
        <div className="scene-caption" aria-hidden>
          {T.steps.map((s, i) => (
            <span key={s} className={i === step ? 'on' : ''}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
