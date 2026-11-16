import { useEffect, useRef, useState } from 'react'
import { useMotionValueEvent } from 'motion/react'
import { reducedMotion, useNearViewport, useSceneProgress } from '../lib/motion'
import { img } from '../lib/media'
import { loopScene as T } from '../content'
import type { FrameInfo, Stage } from './loop/stage'
import { ACT, ARM_SEAT, easeInOut, seg, trackerAt } from './loop/timeline'

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

function webgl() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

/** The arm controller and the console: a scroll-driven replay of an Arm Pilot session. */
export function LoopScene() {
  const [mode, setMode] = useState<'stage' | 'still'>('stage')
  useEffect(() => {
    if (reducedMotion() || !webgl()) setMode('still')
  }, [])
  return mode === 'stage' ? <StageScene onFail={() => setMode('still')} /> : <StillScene />
}

/** Screen layout, by scroll progress: the two views, then the console wall the arm view lands in. */
function layout(p: number, W: number, H: number) {
  const narrow = W < 820 || W < H
  const op: Rect = narrow ? { x: 0, y: H * 0.06, w: W, h: H * 0.32 } : { x: 0, y: 0, w: W * 0.36, h: H }
  const arm0: Rect = narrow ? { x: 0, y: H * 0.38, w: W, h: H * 0.5 } : { x: W * 0.36, y: 0, w: W * 0.64, h: H }
  const gap = Math.max(6, W * 0.008)
  const mh = Math.min(H * (narrow ? 0.5 : 0.66), (((W * 0.95 - 4 * gap) / 5) * 16) / 9)
  const mw = (mh * 9) / 16
  const x0 = (W - (5 * mw + 4 * gap)) / 2
  const y0 = Math.max(narrow ? 120 : 150, (H - mh) / 2 + (narrow ? 30 : 40))
  const monitors: Rect[] = [0, 1, 2, 3, 4].map((i) => ({ x: x0 + i * (mw + gap), y: y0, w: mw, h: mh }))
  const m = monitors[ARM_SEAT]
  const arm1: Rect = { x: m.x + mw * 0.025, y: m.y + mh * 0.135, w: mw * 0.95, h: mh * 0.42 }
  const e = easeInOut(seg(p, 0.86, 0.95))
  return { narrow, op, arm: lerpRect(arm0, arm1, e), monitors, mw, e }
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
  const wall = useRef<HTMLDivElement>(null)
  const wallHead = useRef<HTMLDivElement>(null)
  const monitors = useRef<(HTMLDivElement | null)[]>([])
  const miniJoints = useRef<(HTMLElement | null)[]>([])
  const bw = useRef<(HTMLElement | null)[]>([])
  const stage = useRef<Stage | null>(null)
  const progress = useSceneProgress(ref)
  const near = useNearViewport(ref, '120% 0px')
  const visible = useNearViewport(ref, '0px')
  const lastNote = useRef(-1)

  useEffect(() => {
    if (!near || stage.current) return
    let dead = false
    import('./loop/stage')
      .then(({ createStage }) =>
        createStage(armCanvas.current!, opCanvas.current!, { accent: ACCENT, tint: TINT, mobile: window.matchMedia('(max-width: 820px)').matches }),
      )
      .then((s) => {
        if (dead) return s.dispose()
        stage.current = s
        s.onFrame(update)
        s.jump(progress.get())
        s.setActive(true)
        ref.current?.classList.add('on')
      })
      .catch((e) => {
        console.error(e)
        if (!dead) onFail()
      })
    return () => {
      dead = true
    }
  }, [near]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stage.current?.dispose(), [])
  useEffect(() => stage.current?.setActive(visible), [visible])
  useMotionValueEvent(progress, 'change', (v) => stage.current?.set(v))

  // screenshots and debugging: window.__loop(0.4) holds the scene at that progress
  useEffect(() => {
    const w = window as unknown as { __loop?: (t: number) => void }
    w.__loop = (t) => stage.current?.jump(t)
    return () => void delete w.__loop
  }, [])

  function update({ p, s, vel, spec, source }: FrameInfo) {
    const box = ref.current?.querySelector('.scene-sticky') as HTMLElement | null
    if (!box) return
    const W = box.clientWidth
    const H = box.clientHeight
    const L = layout(p, W, H)
    place(opBox.current, L.op)
    place(armBox.current, L.arm)
    const inWall = seg(p, ACT.wall[0], ACT.wall[0] + 0.03)
    if (opBox.current) opBox.current.style.opacity = (1 - inWall).toFixed(3)
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
      const mj = miniJoints.current[j]
      if (mj) mj.style.setProperty('--u', u.toFixed(4))
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
      el.style.transform = `translate3d(${(left ? lx - el.offsetWidth - 4 : lx + 4).toFixed(1)}px, ${(ly - 9).toFixed(1)}px, 0)`
      ln.setAttribute('x1', x.toFixed(1))
      ln.setAttribute('y1', y.toFixed(1))
      ln.setAttribute('x2', lx.toFixed(1))
      ln.setAttribute('y2', ly.toFixed(1))
      ln.style.opacity = (la * 0.7).toFixed(3)
    })

    // the console wall
    if (wall.current) wall.current.style.visibility = p > ACT.wall[0] ? 'visible' : 'hidden'
    if (p > ACT.wall[0]) {
      if (wall.current) wall.current.style.setProperty('--mw', `${L.mw.toFixed(1)}px`)
      L.monitors.forEach((r, i) => {
        const el = monitors.current[i]
        if (!el) return
        place(el, r)
        const a = seg(p, 0.85 + Math.abs(i - ARM_SEAT) * 0.012, 0.875 + Math.abs(i - ARM_SEAT) * 0.012)
        el.style.opacity = a.toFixed(3)
      })
      if (wallHead.current) {
        wallHead.current.style.opacity = seg(p, 0.9, 0.93).toFixed(3)
        wallHead.current.style.transform = `translate3d(${L.monitors[0].x.toFixed(1)}px, ${(L.monitors[0].y - (L.narrow ? 70 : 84)).toFixed(1)}px, 0)`
      }
      // camera bitrates drift a little, deterministically with scroll
      bw.current.forEach((b, i) => {
        if (!b) return
        const u = 0.55 + 0.35 * Math.abs(Math.sin(i * 1.7 + p * 40 + Math.sin(p * 13 + i)))
        b.style.setProperty('--u', u.toFixed(3))
      })
    }
  }

  return (
    <div ref={ref} className="scene loop" style={{ height: '900vh' }}>
      <div className="scene-sticky loop-sticky">
        <div ref={wall} className="loop-wall" aria-hidden>
          <div ref={wallHead} className="loop-wall-head">
            <h3>{T.wallTitle}</h3>
            <p>{T.wallNote}</p>
          </div>
          {T.seats.map((seat, i) => (
            <div key={seat} className="loop-mon" ref={(el) => void (monitors.current[i] = el)}>
              <div className="mon-band">
                <div>
                  <small>Screen {i + 1} · Delivery</small>
                  <strong>{seat}</strong>
                </div>
                <span className="mon-cell">
                  <small>Link</small>−66
                </span>
                <span className="mon-cell">
                  <small>Battery</small>94
                </span>
                <span className="mon-stop">Stop</span>
              </div>
              <Monitor seat={i} joints={miniJoints} bw={bw} />
            </div>
          ))}
        </div>

        <div ref={opBox} className="loop-op">
          <canvas ref={opCanvas} className="loop-canvas" aria-hidden />
          <div className="loop-tag">
            <span className="loop-panel">{T.operator}</span>
            <span className="loop-chip">
              <i ref={chipDot} data-state="off" />
              <span ref={chip}>{T.holding}</span>
            </span>
          </div>
        </div>
        <div ref={armBox} className="loop-arm">
          <canvas ref={armCanvas} className="loop-canvas" aria-hidden />
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

/** The schematic contents of each console seat; text from content.ts. */
function Monitor({
  seat,
  joints,
  bw,
}: {
  seat: number
  joints: React.MutableRefObject<(HTMLElement | null)[]>
  bw: React.MutableRefObject<(HTMLElement | null)[]>
}) {
  if (seat === 0)
    return (
      <div className="mon-body">
        <div className="mon-tabs">
          <span className="on">Rover</span>
          <span>Network</span>
          <span>CAN and ROS</span>
        </div>
        <div className="mon-panel">
          <small>Readiness</small>
          <div className="mon-ready">
            {T.readiness.map((r) => (
              <span key={r}>
                {r}
                <em>OK</em>
              </span>
            ))}
          </div>
        </div>
        <div className="mon-panel grow">
          <small>Camera bandwidth</small>
          {T.cameras.map((c, i) => (
            <div key={c} className="mon-bw" ref={(el) => void (bw.current[i] = el)}>
              <span>{c}</span>
              <i />
            </div>
          ))}
        </div>
      </div>
    )
  if (seat === 1)
    return (
      <div className="mon-body">
        <div className="mon-tabs">
          <span>Cameras</span>
          <span className="on">Kinematics</span>
        </div>
        <div className="mon-panel mon-hole" />
        <div className="mon-panel grow">
          <small>Arm joints</small>
          {T.joints.map((j, i) => (
            <div key={j} className="mon-joint" ref={(el) => void (joints.current[i] = el)}>
              <span>{j}</span>
              <i />
            </div>
          ))}
        </div>
      </div>
    )
  if (seat === 2)
    return (
      <div className="mon-body">
        <div className="mon-tabs">
          <span className="on">Map</span>
          <span>Mission</span>
          <span>Terrain</span>
        </div>
        <div className="mon-panel grow">
          <svg viewBox="0 0 100 160" className="mon-map" preserveAspectRatio="xMidYMid slice">
            {[20, 40, 60, 80].map((x) => (
              <line key={'v' + x} x1={x} y1={0} x2={x} y2={160} />
            ))}
            {[20, 40, 60, 80, 100, 120, 140].map((y) => (
              <line key={'h' + y} x1={0} y1={y} x2={100} y2={y} />
            ))}
            <path d="M22 132 C 30 110, 52 112, 58 92 S 70 58, 78 40" className="route" />
            {[
              [22, 132],
              [58, 92],
              [78, 40],
            ].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r={3.2} />
            ))}
            <path d="M40 112 l5 -9 l5 9 z" className="rover" />
          </svg>
        </div>
      </div>
    )
  if (seat === 3)
    return (
      <div className="mon-body">
        <div className="mon-tabs">
          <span className="on">Flight</span>
          <span>Survey</span>
        </div>
        <div className="mon-panel grow mon-feed">
          <small>Drone</small>
        </div>
        <div className="mon-panel">
          <small>Battery</small>
          <div className="mon-bw static">
            <span>71%</span>
            <i />
          </div>
        </div>
      </div>
    )
  return (
    <div className="mon-body">
      <div className="mon-tabs">
        <span className="on">Drive</span>
        <span>Map</span>
      </div>
      <div className="mon-panel grow mon-feed">
        <small>Front (ZED)</small>
      </div>
      <div className="mon-split">
        <div className="mon-panel mon-feed">
          <small>Wheel FL</small>
        </div>
        <div className="mon-panel mon-feed">
          <small>Wheel FR</small>
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
