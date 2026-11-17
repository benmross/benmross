import { useEffect, useRef, useState } from 'react'
import { useMotionValueEvent } from 'motion/react'
import { reducedMotion, useNearViewport, useSceneProgress } from '../lib/motion'
import { afterLoad, webgl2, whenIdle } from '../lib/gpu'
import { img } from '../lib/media'
import { loopScene as T } from '../content'
import type { FrameInfo, PanelSizes, Stage } from './loop/stage'
import { ACT, WALL, easeInOut, seg, trackerAt } from './loop/timeline'

const DEAD = new Error('scene left before it loaded')

const ACCENT = '#a493ff'
const TINT = '#0c0b14'

type Rect = { x: number; y: number; w: number; h: number }
const lerpRect = (a: Rect, b: Rect, u: number): Rect => ({
  x: a.x + (b.x - a.x) * u,
  y: a.y + (b.y - a.y) * u,
  w: a.w + (b.w - a.w) * u,
  h: a.h + (b.h - a.h) * u,
})
const place = (el: HTMLElement | null, r: Rect) => {
  if (!el) return
  el.style.transform = `translate3d(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px, 0)`
  el.style.width = `${r.w.toFixed(1)}px`
  el.style.height = `${r.h.toFixed(1)}px`
}

/** The arm controller and the console: a scroll-driven replay of an Arm Pilot session. */
export function LoopScene() {
  const [mode, setMode] = useState<'stage' | 'still'>('stage')
  useEffect(() => {
    if (reducedMotion() || !webgl2()) setMode('still')
  }, [])
  return mode === 'stage' ? <StageScene onFail={() => setMode('still')} /> : <StillScene />
}

/** Screen layout, by scroll progress: the two views, then the arm view alone, full screen. */
function layout(p: number, W: number, H: number) {
  const narrow = W < 820 || W < H
  const op: Rect = narrow ? { x: 0, y: H * 0.06, w: W, h: H * 0.32 } : { x: 0, y: 0, w: W * 0.36, h: H }
  const arm0: Rect = narrow ? { x: 0, y: H * 0.38, w: W, h: H * 0.5 } : { x: W * 0.36, y: 0, w: W * 0.64, h: H }
  const e = easeInOut(seg(p, WALL.panel[0], WALL.panel[1]))
  return { narrow, op, arm: lerpRect(arm0, { x: 0, y: 0, w: W, h: H }, e), e }
}

function StageScene({ onFail }: { onFail: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const armCanvas = useRef<HTMLCanvasElement>(null)
  const opCanvas = useRef<HTMLCanvasElement>(null)
  const armBox = useRef<HTMLDivElement>(null)
  const opBox = useRef<HTMLDivElement>(null)
  const hud = useRef<HTMLDivElement>(null)
  const chip = useRef<HTMLSpanElement>(null)
  const chipDot = useRef<HTMLElement>(null)
  const note = useRef<HTMLParagraphElement>(null)
  const notesBox = useRef<HTMLDivElement>(null)
  const trackBox = useRef<HTMLDivElement>(null)
  const trackRows = useRef<(HTMLLIElement | null)[]>([])
  const gauges = useRef<(HTMLDivElement | null)[]>([])
  const labels = useRef<(HTMLSpanElement | null)[]>([])
  const leaders = useRef<(SVGLineElement | null)[]>([])
  const wallHead = useRef<HTMLDivElement>(null)
  const stage = useRef<Stage | null>(null)
  const progress = useSceneProgress(ref)
  const near = useNearViewport(ref, '120% 0px')
  const keep = useNearViewport(ref, '300% 0px')
  const [gen, setGen] = useState(0)
  const visible = useNearViewport(ref, '0px')
  // read when a build finishes: it may finish while the section is still off screen
  const visibleNow = useRef(false)
  visibleNow.current = visible

  // The sticky box's size, kept by a ResizeObserver so the frame loop never reads layout.
  const boxSize = useRef<[number, number]>([0, 0])
  useEffect(() => {
    const box = ref.current?.querySelector('.scene-sticky') as HTMLElement | null
    if (!box) return
    boxSize.current = [box.clientWidth, box.clientHeight]
    const ro = new ResizeObserver(([e]) => {
      const b = e.borderBoxSize?.[0]
      boxSize.current = b ? [b.inlineSize, b.blockSize] : [box.clientWidth, box.clientHeight]
    })
    ro.observe(box)
    return () => ro.disconnect()
  }, [])
  // Joint labels never change their text, so each is measured once.
  const widths = useRef(new WeakMap<HTMLElement, number>())
  const widthOf = (el: HTMLElement) => {
    let w = widths.current.get(el)
    if (!w) widths.current.set(el, (w = el.offsetWidth))
    return w
  }
  const lastNote = useRef(-1)

  useEffect(() => {
    if (!near || stage.current) return
    let dead = false
    afterLoad()
      .then(() => {
        if (dead) throw DEAD
        return import('./loop/stage')
      })
      .then(({ createStage }) =>
        createStage(armCanvas.current!, opCanvas.current!, { accent: ACCENT, tint: TINT, mobile: window.matchMedia('(max-width: 820px)').matches }),
      )
      .then((s) => {
        if (dead) return s.dispose()
        stage.current = s
        s.onFrame(update)
        s.jump(progress.get())
        s.setActive(visibleNow.current)
        ref.current?.classList.add('on')
      })
      .catch((e) => {
        if (e === DEAD) return
        console.error(e)
        if (!dead) onFail()
      })
    return () => {
      dead = true
    }
  }, [near, gen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Far away, release the scene and its GPU context; it is rebuilt on a fresh canvas when it comes close again.
  useEffect(() => {
    if (keep || !stage.current) return
    // disposing a scene can take a few hundred milliseconds, so it waits for a gap between frames
    return whenIdle(() => {
      stage.current?.dispose()
      stage.current = null
      ref.current?.classList.remove('on')
      setGen((g) => g + 1)
    })
  }, [keep]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stage.current?.dispose(), [])
  useEffect(() => stage.current?.setActive(visible), [visible])
  useMotionValueEvent(progress, 'change', (v) => stage.current?.set(v))

  // screenshots and debugging: window.__loop(0.4) holds the scene at that progress
  useEffect(() => {
    const w = window as unknown as { __loop?: (t: number) => void }
    w.__loop = (t) => stage.current?.jump(t)
    return () => void delete w.__loop
  }, [])

  function update({ p, s, vel, spec, source }: FrameInfo): PanelSizes | void {
    const [W, H] = boxSize.current
    if (!W || !H) return
    const L = layout(p, W, H)
    place(opBox.current, L.op)
    place(armBox.current, L.arm)
    const inWall = seg(p, WALL.panel[0], WALL.panel[0] + 0.02)
    if (opBox.current) {
      opBox.current.style.opacity = (1 - seg(p, WALL.panel[0], WALL.panel[1] - 0.01)).toFixed(3)
      opBox.current.style.visibility = p > WALL.panel[1] ? 'hidden' : 'visible'
    }
    if (hud.current) hud.current.style.opacity = (1 - inWall).toFixed(3)

    // status chip
    if (chip.current && chipDot.current) {
      const limit = s.engaged && s.limit
      const text = !s.engaged ? T.holding : !s.reachable ? T.outOfReach : limit ? T.atLimit : T.following
      if (chip.current.textContent !== text) chip.current.textContent = text
      chipDot.current.dataset.state = !s.engaged ? 'off' : !s.reachable || limit ? 'warn' : 'on'
    }

    // the drive notes, then the tracker list
    const inTrackers = p >= ACT.trackers[0] - 0.005
    if (notesBox.current) notesBox.current.style.opacity = inTrackers ? '0' : '1'
    if (trackBox.current) trackBox.current.style.opacity = inTrackers ? '1' : '0'
    if (!inTrackers && note.current) {
      let i = 0
      T.notes.forEach((n, k) => s.t >= n.from - 0.05 && (i = k))
      if (p < ACT.drive[0]) i = 0
      if (i !== lastNote.current) {
        lastNote.current = i
        note.current.textContent = T.notes[i].text
        note.current.classList.remove('in')
        void note.current.offsetWidth
        note.current.classList.add('in')
      }
    }
    if (inTrackers) {
      const k = Math.min(3, Math.floor(trackerAt(p) + 0.15))
      trackRows.current.forEach((r, i) => r?.classList.toggle('on', i === k))
    }

    // joint gauges
    spec.limits_deg.forEach(([lo, hi], j) => {
      const g = gauges.current[j]
      if (!g) return
      const deg = (s.joints[j] * 180) / Math.PI
      const u = (deg - lo) / (hi - lo)
      const sp = Math.min(1, Math.abs(vel[j]) / ((spec.max_speed_deg * Math.PI) / 180))
      const atLimit = (s.limit >> j) & 1
      g.style.setProperty('--u', u.toFixed(4))
      g.style.setProperty('--sp', sp.toFixed(3))
      g.dataset.limit = atLimit ? '1' : '0'
      g.dataset.capped = sp > 0.96 ? '1' : '0'
      const val = g.querySelector('b')
      if (val) val.textContent = `${deg >= 0 ? '+' : ''}${deg.toFixed(0)}°`
    })
    const src = hud.current?.querySelector('.loop-src')
    if (src) src.textContent = source === 'recorded' ? T.recorded : T.scripted

    // joint labels, in the opening
    const la = Math.min(seg(p, 0.012, 0.03), 1 - seg(p, 0.085, 0.11))
    const pts = la > 0 ? stage.current?.jointPoints() : null
    T.joints.forEach((_, j) => {
      const el = labels.current[j]
      const ln = leaders.current[j]
      if (!el || !ln) return
      const q = pts && stage.current?.project(pts[j])
      if (!q) {
        el.style.opacity = '0'
        ln.style.opacity = '0'
        return
      }
      const x = q.x + L.arm.x
      const y = q.y + L.arm.y
      const left = j % 2 === 1
      const lx = x + (left ? -1 : 1) * (60 + j * 6)
      const ly = y - 34 - (j === 4 ? 20 : 0)
      el.style.opacity = la.toFixed(3)
      el.style.transform = `translate3d(${(left ? lx - widthOf(el) - 4 : lx + 4).toFixed(1)}px, ${(ly - 9).toFixed(1)}px, 0)`
      ln.setAttribute('x1', x.toFixed(1))
      ln.setAttribute('y1', y.toFixed(1))
      ln.setAttribute('x2', lx.toFixed(1))
      ln.setAttribute('y2', ly.toFixed(1))
      ln.style.opacity = (la * 0.7).toFixed(3)
    })

    // the base station title
    if (wallHead.current) wallHead.current.style.opacity = seg(p, WALL.title[0], WALL.title[1]).toFixed(3)
    // the operator panel's 1px border (right when wide, bottom when narrow) comes out of its canvas
    return { arm: [L.arm.w, L.arm.h], op: L.narrow ? [L.op.w, L.op.h - 1] : [L.op.w - 1, L.op.h] }
  }

  return (
    <div ref={ref} className="scene loop" style={{ height: '900vh' }}>
      <div className="scene-sticky loop-sticky">
        <div ref={wallHead} className="loop-wall-head">
          <h3>{T.wallTitle}</h3>
          <p>{T.wallNote}</p>
        </div>

        <div ref={opBox} className="loop-op">
          <canvas key={gen} ref={opCanvas} className="loop-canvas" aria-hidden />
          <div className="loop-tag">
            <span className="loop-panel">{T.operator}</span>
            <span className="loop-chip">
              <i ref={chipDot} data-state="off" />
              <span ref={chip}>{T.holding}</span>
            </span>
          </div>
        </div>
        <div ref={armBox} className="loop-arm">
          <canvas key={gen} ref={armCanvas} className="loop-canvas" aria-hidden />
        </div>

        <svg className="loop-leaders" aria-hidden>
          {T.joints.map((j, i) => (
            <line key={j} ref={(el) => void (leaders.current[i] = el)} />
          ))}
        </svg>
        {T.joints.map((j, i) => (
          <span key={j} className="loop-label" ref={(el) => void (labels.current[i] = el)} aria-hidden>
            {j}
          </span>
        ))}

        <div ref={hud} className="loop-hud">
          <span className="loop-panel loop-panel-arm">{T.arm}</span>
          <div ref={notesBox} className="loop-notes">
            <p ref={note} className="in">
              {T.notes[0].text}
            </p>
          </div>
          <div ref={trackBox} className="loop-trackers">
            <h4>{T.trackersTitle}</h4>
            <ol>
              {T.trackers.map((t, i) => (
                <li key={t.name} ref={(el) => void (trackRows.current[i] = el)}>
                  <strong>{t.name}</strong>
                  <span>{t.how}</span>
                  <em>{t.status}</em>
                </li>
              ))}
            </ol>
          </div>
          <div className="loop-gauges" aria-hidden>
            {T.joints.map((j, i) => (
              <div key={j} className="loop-gauge" ref={(el) => void (gauges.current[i] = el)}>
                <span>{j}</span>
                <div className="bar">
                  <i />
                  <s />
                </div>
                <b>+0°</b>
                <em>{T.capped}</em>
              </div>
            ))}
            <p className="loop-src">{T.scripted}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Reduce Motion or no WebGL: a still of the controller driving the simulated arm, and the tracker list. */
function StillScene() {
  return (
    <div className="loop-still">
      <figure>
        <img {...img('/media/loop/arm-pilot-sim.webp', '(max-width: 820px) 100vw, 70vw')} alt={T.fallbackAlt} loading="lazy" decoding="async" />
        <figcaption>{T.fallbackCaption}</figcaption>
      </figure>
      <div className="loop-trackers static">
        <h4>{T.trackersTitle}</h4>
        <ol>
          {T.trackers.map((t) => (
            <li key={t.name} className="on">
              <strong>{t.name}</strong>
              <span>{t.how}</span>
              <em>{t.status}</em>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
