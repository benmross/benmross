import { useEffect, useRef, useState } from 'react'
import { m, useMotionValueEvent, useScroll, useTransform, type MotionValue } from 'motion/react'
import { reducedMotion, useNearViewport, useSceneProgress } from '../lib/motion'
import { img } from '../lib/media'
import type { Flight } from './falconia/flight'
import type { Vec3 } from './falconia/route'

const M = '/media/falconia/'

/**
 * In the order the flight meets them. Each photo is pinned to a place on the scan
 * (`at`, world units) and shown while scroll progress is inside `on`.
 */
const STEPS = [
  { src: 'crop-01.webp', label: 'Terrain', alt: 'The physical terrain table from above: craters, a lava tube, dunes and a stream bed', fit: 'cover', at: [0.2, 0.1, 0.3], on: [0.0, 0.13] },
  { src: 'crop-05.webp', label: 'Altimetry', alt: 'Heightmap of the terrain rendered from altimetry data', fit: 'contain', at: [-0.48, 0.24, -0.3], on: [0.11, 0.22] },
  { src: 'crop-02.webp', label: 'Scan', alt: 'Textured photogrammetry scan of the terrain in ParaView', fit: 'contain', at: [0.3, 0.1, 0.6], on: [0.22, 0.34] },
  { src: 'crop-06.webp', label: 'Rover', alt: 'Photogrammetry scan of the Raspberry Pi rover', fit: 'contain', at: [-0.55, 0.06, 0.95], on: [0.34, 0.46] },
  { src: 'crop-08.webp', label: 'Tracking', alt: 'Overhead camera feed with AprilTag markers tracking the rover', fit: 'cover', at: [0.05, 0.12, -0.05], on: [0.45, 0.57] },
  { src: 'crop-03.webp', label: 'VR', alt: 'The VR scene: the rover as a red sphere, with geocache markers', fit: 'contain', at: [0.6, 0.12, -0.64], on: [0.56, 0.68] },
  { src: 'crop-07.webp', label: 'CAVE', alt: 'A silhouetted visitor in front of the CAVE projection screen', fit: 'cover', at: [0.05, 0.3, -1.6], on: [0.67, 0.8] },
  { src: 'symposium.webp', label: 'Symposium', alt: 'Ben speaking at the Johns Hopkins APL XR Symposium, July 2025', fit: 'cover', at: [0, 0.05, 0], on: [0.82, 1.01], finale: true },
] as const

/** The symposium photo's aspect, and the white projection screen at its right, as fractions of the photo. */
const FINALE_AR = 2000 / 1251
const SCREEN = { x0: 0.845, y0: 0.006, x1: 0.998, y1: 0.535 }
/** Finale timing in scroll progress: the photo appears, grows to the middle while the model shrinks onto its screen, then the model fades. */
const FIN = { show: [0.82, 0.86], grow: [0.86, 0.97], fade: [0.95, 0.995] } as const

const seg = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)))
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

const ACCENT = '#d9be98'
const TINT = '#11100c'

function webgl() {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

/** A drone flight over the scan of the terrain table, with the photos pinned along the route. */
export function FalconiaScene() {
  const [mode, setMode] = useState<'flight' | 'layers'>('flight')
  useEffect(() => {
    if (reducedMotion() || !webgl()) setMode('layers')
  }, [])
  return mode === 'flight' ? <FlightScene onFail={() => setMode('layers')} /> : <LayersScene />
}

function FlightScene({ onFail }: { onFail: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)
  const finaleRef = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLElement | null)[]>([])
  const leaders = useRef<(SVGLineElement | null)[]>([])
  const dots = useRef<(SVGCircleElement | null)[]>([])
  const flight = useRef<Flight | null>(null)
  const progress = useSceneProgress(ref)
  const { scrollYProgress: entry } = useScroll({ target: ref, offset: ['start end', 'start start'] })
  const near = useNearViewport(ref, '120% 0px')
  const visible = useNearViewport(ref, '0px')
  const [step, setStep] = useState(0)
  const stepRef = useRef(0)

  // load three.js and the models once the section is close
  useEffect(() => {
    if (!near || flight.current) return
    let dead = false
    import('./falconia/flight')
      .then(({ createFlight }) =>
        createFlight(canvasRef.current!, { accent: ACCENT, tint: TINT, mobile: window.matchMedia('(max-width: 820px)').matches }),
      )
      .then((f) => {
        if (dead) return f.dispose()
        flight.current = f
        f.set(progress.get(), entry.get())
        f.onFrame((t) => layoutCards(f, t))
        f.setActive(true)
        canvasRef.current?.classList.add('on')
      })
      .catch((e) => {
        console.error(e)
        if (!dead) onFail()
      })
    return () => {
      dead = true
    }
  }, [near]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => flight.current?.dispose(), [])
  useEffect(() => flight.current?.setActive(visible), [visible])

  useMotionValueEvent(progress, 'change', (v) => flight.current?.set(v, entry.get()))
  useMotionValueEvent(entry, 'change', (e) => flight.current?.set(progress.get(), e))

  // debugging and screenshots: window.__falconia(0.4) holds the flight at that progress
  useEffect(() => {
    const w = window as unknown as { __falconia?: (t: number, snap?: boolean) => void }
    w.__falconia = (t, snap) => (snap ? flight.current?.jump(t, 1) : flight.current?.set(t, 1))
    ;(window as unknown as { __falconiaSample?: unknown }).__falconiaSample = (t: number) => flight.current?.sample(t)
    return () => void delete w.__falconia
  }, [])

  // what each card is actually showing; eased in time so a fast scroll past a card's
  // stretch of the route cannot flash it on for a frame
  const shown = useRef<number[]>(STEPS.map(() => 0))
  const lastFrame = useRef(0)

  function layoutCards(f: Flight, t: number) {
    const cv = canvasRef.current
    if (!cv) return
    const box = { width: cv.clientWidth, height: cv.clientHeight }
    const now = performance.now()
    const dt = Math.min(0.1, (now - lastFrame.current) / 1000)
    lastFrame.current = now
    const W = box.width
    const H = box.height
    const narrow = W < 820
    let best = -1
    let bestA = 0
    STEPS.forEach((s, i) => {
      const el = cards.current[i]
      const line = leaders.current[i]
      const dot = dots.current[i]
      const [a, b] = s.on
      if ('finale' in s) {
        if (t >= a && 1 > bestA) ((bestA = 1), (best = i))
        return
      }
      if (!el || !line || !dot) return
      const want = Math.max(0, Math.min(1, (t - a) / 0.03, (b - t) / 0.03))
      const prev = shown.current[i]
      // in over at least 0.3 s, out over at least 0.2 s
      const alpha = want > prev ? Math.min(want, prev + dt / 0.3) : Math.max(want, prev - dt / 0.2)
      shown.current[i] = alpha
      if (want > bestA) ((bestA = want), (best = i))
      const p = alpha > 0 ? f.project(s.at) : null
      if (alpha <= 0) {
        el.style.opacity = '0'
        line.style.opacity = '0'
        dot.style.opacity = '0'
        return
      }
      const cw = el.offsetWidth
      const ch = el.offsetHeight
      const right = i % 2 === 0
      // a fixed slot on one side, nudged by where its place on the scan is on screen
      const px = p ? p.x : W / 2
      const py = p ? p.y : H / 2
      let x = narrow ? (right ? W - cw - 14 : 14) : right ? W * 0.96 - cw : W * 0.04
      let y = narrow ? H * 0.1 : H * 0.5 - ch / 2
      x += (px - W / 2) * 0.06
      y += (py - H / 2) * 0.05
      const rise = (1 - Math.min(1, (t - a) / 0.04)) * 24
      el.style.opacity = alpha.toFixed(3)
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + rise).toFixed(1)}px, 0)`
      // leader from the card edge nearest the pinned point
      const onScreen = p && p.x > -40 && p.x < W + 40 && p.y > -40 && p.y < H + 40
      if (onScreen) {
        const ex = p.x > x + cw / 2 ? x + cw : x
        const ey = Math.max(y + rise + 10, Math.min(y + rise + ch - 10, p.y))
        line.setAttribute('x1', ex.toFixed(1))
        line.setAttribute('y1', ey.toFixed(1))
        line.setAttribute('x2', p.x.toFixed(1))
        line.setAttribute('y2', p.y.toFixed(1))
        dot.setAttribute('cx', p.x.toFixed(1))
        dot.setAttribute('cy', p.y.toFixed(1))
        line.style.opacity = (alpha * 0.7).toFixed(3)
        dot.style.opacity = alpha.toFixed(3)
      } else {
        line.style.opacity = '0'
        dot.style.opacity = '0'
      }
    })
    layoutFinale(f, t, W, H, narrow)
    if (best >= 0 && best !== stepRef.current) {
      stepRef.current = best
      setStep(best)
    }
  }

  /**
   * The ending: the symposium photo grows from its card slot to the middle of the screen,
   * and the model shrinks onto the white projection screen behind Ben, then fades.
   */
  function layoutFinale(f: Flight, t: number, W: number, H: number, narrow: boolean) {
    const fin = finaleRef.current
    const mod = modelRef.current
    if (!fin || !mod) return
    if (t < FIN.show[0]) {
      fin.style.opacity = '0'
      mod.style.transform = ''
      mod.style.clipPath = ''
      mod.style.opacity = ''
      return
    }
    const fw = narrow ? W - 24 : Math.min(W * 0.84, 1180, H * 0.74 * FINALE_AR)
    const sw = narrow ? W * 0.64 : Math.min(W * 0.25, 400)
    const sx = narrow ? 14 : W * 0.04
    const sy = narrow ? H * 0.1 : H * 0.5 - sw / FINALE_AR / 2
    const e = easeInOut(seg(t, FIN.grow[0], FIN.grow[1]))
    const iw = sw + (fw - sw) * e
    const ix = sx + ((W - fw) / 2 - sx) * e
    const iy = sy + ((H - fw / FINALE_AR) / 2 - sy) * e
    fin.style.width = `${fw.toFixed(1)}px`
    fin.style.opacity = seg(t, FIN.show[0], FIN.show[1]).toFixed(3)
    fin.style.transform = `translate3d(${ix.toFixed(1)}px, ${iy.toFixed(1)}px, 0) scale(${(iw / fw).toFixed(4)})`

    // the screen in the photo, where it is right now
    const ih = iw / FINALE_AR
    const rx = ix + iw * SCREEN.x0
    const ry = iy + ih * SCREEN.y0
    const rw = iw * (SCREEN.x1 - SCREEN.x0)
    const rh = ih * (SCREEN.y1 - SCREEN.y0)
    const b = f.bounds()
    if (!b || b.w < 1 || b.h < 1) return
    const sEnd = Math.min(rw / b.w, rh / b.h) * 0.9
    const sc = 1 + (sEnd - 1) * e
    // the model's centre travels to the screen's centre
    const bx = b.x + b.w / 2
    const by = b.y + b.h / 2
    const cx = bx + (rx + rw / 2 - bx) * e
    const cy = by + (ry + rh / 2 - by) * e
    const tx = cx - bx * sc
    const ty = cy - by * sc
    mod.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${sc.toFixed(4)})`
    // clip to the screen, in the model layer's own coordinates, closing in as it lands
    const k = e * e
    const top = ((ry - ty) / sc) * k
    const left = ((rx - tx) / sc) * k
    const right = (W - (rx + rw - tx) / sc) * k
    const bottom = (H - (ry + rh - ty) / sc) * k
    mod.style.clipPath = `inset(${Math.max(0, top).toFixed(1)}px ${Math.max(0, right).toFixed(1)}px ${Math.max(0, bottom).toFixed(1)}px ${Math.max(0, left).toFixed(1)}px)`
    mod.style.opacity = (1 - seg(t, FIN.fade[0], FIN.fade[1])).toFixed(3)
  }

  const fin = STEPS[STEPS.length - 1]
  return (
    <div ref={ref} className="scene" style={{ height: '1000vh' }}>
      <div className="scene-sticky fal3-sticky">
        <div ref={finaleRef} className="fal3-finale">
          <img {...img(M + fin.src, '(max-width: 820px) 100vw, 84vw')} alt={fin.alt} loading="lazy" decoding="async" />
        </div>
        <div ref={modelRef} className="fal3-model">
          <canvas ref={canvasRef} className="fal3-canvas" aria-hidden />
        </div>
        <svg className="fal3-leaders" aria-hidden>
          {STEPS.map((s, i) => (
            <g key={s.label}>
              <line ref={(el) => void (leaders.current[i] = el)} />
              <circle ref={(el) => void (dots.current[i] = el)} r="3.5" />
            </g>
          ))}
        </svg>
        {STEPS.map((s, i) =>
          'finale' in s ? null : (
          <figure key={s.label} className="fal3-card" ref={(el) => void (cards.current[i] = el)}>
            <img {...img(M + s.src, '(max-width: 820px) 64vw, 30vw')} alt={s.alt} loading="lazy" decoding="async" />
            <figcaption>{s.label}</figcaption>
          </figure>
          ),
        )}
        <div className="scene-caption" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s.label} className={i === step ? 'on' : ''}>
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Without WebGL, or with Reduce Motion: the photos stacked, each wiping up over the last. */
function Layer({ i, progress }: { i: number; progress: MotionValue<number> }) {
  const n = STEPS.length
  const a = i / n
  const b = a + 0.6 / n
  const clip = useTransform(progress, [a, b], i === 0 ? ['inset(0% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'] : ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'])
  const scale = useTransform(progress, [a, b + 1 / n], [1.15, 1])
  const s = STEPS[i]
  return (
    <m.div className="fal-layer" style={{ clipPath: clip, zIndex: i }}>
      <m.img {...img(M + s.src, '(max-width: 820px) 100vw, 84vw')} alt={s.alt} loading="lazy" decoding="async" style={{ scale, objectFit: s.fit }} />
    </m.div>
  )
}

function LayersScene() {
  const ref = useRef<HTMLDivElement>(null)
  const progress = useSceneProgress(ref)
  const [step, setStep] = useState(0)
  useMotionValueEvent(progress, 'change', (v) => setStep(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length * 0.999 + 0.4))))
  return (
    <div ref={ref} className="scene" style={{ height: `${STEPS.length * 70 + 60}vh` }}>
      <div className="scene-sticky fal-sticky">
        <div className="fal-stage">
          {STEPS.map((_, i) => (
            <Layer key={i} i={i} progress={progress} />
          ))}
        </div>
        <div className="scene-caption" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s.label} className={i === step ? 'on' : ''}>
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
