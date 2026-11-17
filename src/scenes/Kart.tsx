import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { m, useMotionValueEvent, useTransform } from 'motion/react'
import { reducedMotion, useNearViewport, useSceneProgress } from '../lib/motion'
import { afterLoad, webgl2 } from '../lib/gpu'
import { img } from '../lib/media'
import { kartScene as T } from '../content'
import { ANCHOR } from './kart/frame'
import type { FrameInfo, Stage } from './kart/stage'
import { ACT, seg } from './kart/timeline'

const DEAD = new Error('scene left before it loaded')

const ACCENT = '#ff4a3d'
const TINT = '#150808'
const KIND = { cmd: '#f4efe6', tel: '#39d8c0', pwr: '#ff5a3c' } as const
const MAX_TAGS = Math.max(...T.stops.map((s) => s.tags.length))

/** The kart in 3D: drifting through a turn, then slowed almost to a stop while the camera goes round it. */
export function KartScene() {
  const [mode, setMode] = useState<'stage' | 'still'>('stage')
  useEffect(() => {
    if (reducedMotion() || !webgl2()) setMode('still')
  }, [])
  return mode === 'stage' ? <StageScene onFail={() => setMode('still')} /> : <StillScene />
}

function StageScene({ onFail }: { onFail: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<Stage | null>(null)
  const card = useRef<HTMLDivElement>(null)
  const cardNo = useRef<HTMLSpanElement>(null)
  const cardTitle = useRef<HTMLHeadingElement>(null)
  const cardSpec = useRef<HTMLParagraphElement>(null)
  const cardText = useRef<HTMLParagraphElement>(null)
  const tags = useRef<(HTMLSpanElement | null)[]>([])
  const leaders = useRef<(SVGLineElement | null)[]>([])
  const bus = useRef<HTMLDivElement>(null)
  const busRows = useRef<(HTMLLIElement | null)[]>([])
  const busVals = useRef<(HTMLElement | null)[]>([])
  const note = useRef<HTMLParagraphElement>(null)
  const shown = useRef(-2)
  const progress = useSceneProgress(ref)
  const near = useNearViewport(ref, '120% 0px')
  const keep = useNearViewport(ref, '300% 0px')
  const [gen, setGen] = useState(0)
  const visible = useNearViewport(ref, '0px')

  useEffect(() => {
    if (!near || stage.current) return
    let dead = false
    afterLoad()
      .then(() => {
        if (dead) throw DEAD
        return import('./kart/stage')
      })
      .then(({ createStage }) => createStage(canvas.current!, { accent: ACCENT, tint: TINT, mobile: window.matchMedia('(max-width: 820px)').matches }))
      .then((s) => {
        if (dead) return s.dispose()
        stage.current = s
        s.onFrame(update)
        s.jump(progress.get())
        s.setActive(true)
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
    stage.current.dispose()
    stage.current = null
    ref.current?.classList.remove('on')
    setGen((g) => g + 1)
  }, [keep]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stage.current?.dispose(), [])
  useEffect(() => stage.current?.setActive(visible), [visible])
  useMotionValueEvent(progress, 'change', (v) => stage.current?.set(v))

  // screenshots and debugging: window.__kart(0.4) holds the scene at that progress
  useEffect(() => {
    const w = window as unknown as { __kart?: (t: number) => void }
    w.__kart = (t) => stage.current?.jump(t)
    return () => void delete w.__kart
  }, [])

  function update({ p, state: s, stop, level }: FrameInfo) {
    const box = ref.current?.querySelector('.scene-sticky') as HTMLElement | null
    if (!box) return
    const W = box.clientWidth
    const narrow = W < 820 || W < box.clientHeight

    // the card for this stop
    if (stop !== shown.current) {
      shown.current = stop
      const c = card.current
      if (c) {
        c.classList.toggle('in', stop >= 0)
        if (stop >= 0) {
          const st = T.stops[stop]
          cardNo.current!.textContent = `${String(stop + 1).padStart(2, '0')} / ${String(T.stops.length).padStart(2, '0')}`
          cardTitle.current!.textContent = st.title
          cardSpec.current!.textContent = st.spec
          cardText.current!.textContent = st.text
          c.classList.remove('swap')
          void c.offsetWidth
          c.classList.add('swap')
        }
      }
      const cur = stop >= 0 ? T.stops[stop].tags : []
      tags.current.forEach((el, i) => el && (el.textContent = cur[i]?.label ?? ''))
    }

    // part labels
    const cur = stop >= 0 ? T.stops[stop].tags : []
    for (let i = 0; i < MAX_TAGS; i++) {
      const el = tags.current[i]
      const ln = leaders.current[i]
      if (!el || !ln) continue
      const tag = cur[i]
      const q = tag && stage.current?.project(ANCHOR[tag.at as keyof typeof ANCHOR])
      if (!q) {
        el.style.opacity = '0'
        ln.style.opacity = '0'
        continue
      }
      const up = i % 2 === 0
      const lx = q.x + (narrow ? 26 : 54) * (i === 1 ? -1 : 1)
      const ly = q.y + (up ? -1 : 1) * (narrow ? 44 : 62) - i * 8
      const left = i === 1
      el.style.opacity = '1'
      el.style.transform = `translate3d(${(left ? lx - el.offsetWidth - 6 : lx + 6).toFixed(1)}px, ${(ly - 10).toFixed(1)}px, 0)`
      ln.setAttribute('x1', q.x.toFixed(1))
      ln.setAttribute('y1', q.y.toFixed(1))
      ln.setAttribute('x2', lx.toFixed(1))
      ln.setAttribute('y2', ly.toFixed(1))
      ln.style.opacity = '0.75'
    }

    // the bus monitor, from the wheel onward
    if (bus.current) bus.current.classList.toggle('in', stop >= 4)
    if (stop >= 4) {
      const steerDeg = (-s.steer * 180) / Math.PI
      const cdeg = Math.round(steerDeg * 100)
      const seqNo = Math.floor(s.t * 50) & 255
      const sign = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v)
      const vals = [
        `steer ${Math.abs(steerDeg * 3.2).toFixed(0)}° ${steerDeg >= 0 ? 'R' : 'L'}  thr ${(s.throttle * 100).toFixed(0)}%`,
        `${(0.5 + 3.8 * s.throttle).toFixed(2)} V`,
        `${sign(cdeg)} cdeg  seq ${seqNo}`,
        `${T.active}  ${sign(cdeg - 38)} cdeg`,
        `${T.drive}  ${(s.v * 2.237).toFixed(0)} ${T.mph}`,
        `${(74.2 - 1.3 * s.throttle).toFixed(1)} V  ${(40 + 170 * s.throttle).toFixed(0)} A`,
      ]
      T.bus.forEach((b, i) => {
        const v = busVals.current[i]
        if (v && v.textContent !== vals[i]) v.textContent = vals[i]
        busRows.current[i]?.classList.toggle('on', (level[b.wire] ?? 0) > 0.5)
      })
    }
    if (note.current) note.current.style.opacity = (1 - seg(p, ACT.slow[0], ACT.slow[1])).toFixed(3)
  }

  return (
    <div ref={ref} className="scene kart3d" style={{ height: '1500vh' }}>
      <div className="scene-sticky kart3d-sticky">
        <canvas key={gen} ref={canvas} className="kart3d-canvas" aria-hidden />


        <svg className="kart3d-leaders" aria-hidden>
          {Array.from({ length: MAX_TAGS }, (_, i) => (
            <line key={i} ref={(el) => void (leaders.current[i] = el)} />
          ))}
        </svg>
        {Array.from({ length: MAX_TAGS }, (_, i) => (
          <span key={i} className="kart3d-tag" ref={(el) => void (tags.current[i] = el)} aria-hidden />
        ))}

        <div ref={card} className="kart3d-card">
          <span ref={cardNo} className="kart3d-kicker" />
          <h3 ref={cardTitle}>{T.stops[0].title}</h3>
          <p ref={cardSpec} className="kart3d-spec">
            {T.stops[0].spec}
          </p>
          <p ref={cardText}>{T.stops[0].text}</p>
        </div>

        <div ref={bus} className="kart3d-bus" aria-hidden>
          <div className="kart3d-legend">
            {(Object.keys(T.kinds) as (keyof typeof T.kinds)[]).map((k) => (
              <span key={k}>
                <i style={{ background: KIND[k] }} />
                {T.kinds[k]}
              </span>
            ))}
          </div>
          <ol>
            {T.bus.map((b, i) => (
              <li key={b.wire} ref={(el) => void (busRows.current[i] = el)} style={{ ['--k' as string]: KIND[b.kind] }}>
                <strong>{b.bus}</strong>
                <span>{b.what}</span>
                <em ref={(el) => void (busVals.current[i] = el)} />
              </li>
            ))}
          </ol>
        </div>

        <p ref={note} className="kart3d-note">
          {T.modelNote}
        </p>

        {/* the same words for readers who cannot see the canvas */}
        <ol className="sr-only">
          {T.stops.map((s) => (
            <li key={s.title}>
              {s.title}. {s.spec}. {s.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

const M = '/media/kart/'
const CARDS: { src: string; w: number; alt: string; cap?: string; contain?: boolean }[] = [
  { src: M + 'kart-night.webp', w: 1.55, alt: 'The kart at night, its frame lit red by LED strips' },
  { src: M + 'kart-dash-mounted.webp', w: 1.55, alt: 'The dashboard running on the kart, mounted under the steering wheel' },
  { src: M + 'dashboard-ui.webp', w: 1.72, contain: true, alt: 'The kart dashboard: speed gauge and map', cap: 'Dashboard, React on a Raspberry Pi' },
  { src: M + 'pcb-mainboard-isometric.webp', w: 1.5, alt: 'Render of the custom mainboard', cap: 'Custom mainboard' },
  { src: M + 'pcb-mainboard-connectors-closeup.webp', w: 0.95, alt: 'Close-up of mainboard connectors', cap: 'Power, CAN, LEDs' },
]

/** Reduce Motion or no WebGL: the photographs, on a track pinned while you scroll. */
function StillScene() {
  const ref = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [dist, setDist] = useState(0)
  const progress = useSceneProgress(ref)
  useLayoutEffect(() => {
    const measure = () => track.current && setDist(Math.max(0, track.current.scrollWidth - window.innerWidth))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  const x = useTransform(progress, [0.05, 0.95], [0, -dist])
  return (
    <div ref={ref} className="scene" style={{ height: `calc(100svh + ${dist}px)` }}>
      <div className="scene-sticky kart-sticky">
        <m.div ref={track} className="kart-track" style={{ x }}>
          {CARDS.map((c, i) => (
            <figure key={i} className="kart-card" style={{ ['--w' as string]: c.w }}>
              <div className={`kart-frame${c.contain ? ' contain' : ''}`}>
                <img {...img(c.src, '(max-width: 820px) 70vw, 45vw')} alt={c.alt} loading="lazy" decoding="async" />
              </div>
              {c.cap && <figcaption>{c.cap}</figcaption>}
            </figure>
          ))}
        </m.div>
      </div>
    </div>
  )
}
