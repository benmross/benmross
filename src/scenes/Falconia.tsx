import { useEffect, useRef, useState } from 'react'
import { useMotionValueEvent, useScroll } from 'motion/react'
import { reducedMotion, useNearViewport, useSceneProgress } from '../lib/motion'
import { afterLoad, webgl2, whenIdle } from '../lib/gpu'
import { img } from '../lib/media'
import type { Flight } from './falconia/flight'

const M = '/media/falconia/'

/**
 * What the flight is showing, named in the caption from each progress value on: the
 * wireframe, the altimetry colouring over the second half of the dive, the scan once the
 * camera levels off, the rover on the flat beyond the ridges, and the symposium photo.
 */
const PHASES = [
  { label: 'Wireframe', from: 0 },
  { label: 'Altimetry', from: 0.15 },
  { label: 'Scan', from: 0.33 },
  { label: 'Rover', from: 0.4 },
  { label: 'Symposium', from: 0.82 },
] as const

/** The one photo left: Ben at the symposium, which the model shrinks onto at the end. */
const FINALE = { src: 'symposium.webp', alt: 'Ben speaking at the Johns Hopkins APL XR Symposium, July 2025' } as const

/** The symposium photo's aspect, and the white projection screen at its right, as fractions of the photo. */
const FINALE_AR = 2000 / 1251
const SCREEN = { x0: 0.845, y0: 0.006, x1: 0.998, y1: 0.535 }
/** Finale timing in scroll progress: the photo appears, grows to the middle while the model shrinks onto its screen, then the model fades. */
const FIN = { show: [0.82, 0.86], grow: [0.86, 0.97], fade: [0.95, 0.995] } as const

const seg = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)))
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

const DEAD = new Error('scene left before it loaded')

const ACCENT = '#d9be98'
const TINT = '#11100c'

/** A drone flight over the scan of the terrain table, ending on the symposium photo. */
export function FalconiaScene() {
  const [mode, setMode] = useState<'flight' | 'layers'>('flight')
  useEffect(() => {
    if (reducedMotion() || !webgl2()) setMode('layers')
  }, [])
  return mode === 'flight' ? <FlightScene onFail={() => setMode('layers')} /> : <LayersScene />
}

function FlightScene({ onFail }: { onFail: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)
  const finaleRef = useRef<HTMLDivElement>(null)
  const flight = useRef<Flight | null>(null)
  const progress = useSceneProgress(ref)
  const { scrollYProgress: entry } = useScroll({ target: ref, offset: ['start end', 'start start'] })
  const near = useNearViewport(ref, '120% 0px')
  const keep = useNearViewport(ref, '300% 0px')
  const [gen, setGen] = useState(0)
  const visible = useNearViewport(ref, '0px')
  // read when a build finishes: it may finish while the section is still off screen
  const visibleNow = useRef(false)
  visibleNow.current = visible
  const [step, setStep] = useState(0)
  const stepRef = useRef(0)

  // load three.js and the models once the section is close
  useEffect(() => {
    if (!near || flight.current) return
    let dead = false
    afterLoad()
      .then(() => {
        if (dead) throw DEAD
        return import('./falconia/flight')
      })
      .then(({ createFlight }) =>
        createFlight(canvasRef.current!, { accent: ACCENT, tint: TINT, mobile: window.matchMedia('(max-width: 820px)').matches }),
      )
      .then((f) => {
        if (dead) return f.dispose()
        flight.current = f
        f.set(progress.get(), entry.get())
        f.onFrame((t) => layoutFrame(f, t))
        f.setActive(visibleNow.current)
        canvasRef.current?.classList.add('on')
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
    if (keep || !flight.current) return
    // disposing a scene can take a few hundred milliseconds, so it waits for a gap between frames
    return whenIdle(() => {
      flight.current?.dispose()
      flight.current = null
      ref.current?.classList.remove('on')
      setGen((g) => g + 1)
    })
  }, [keep]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => flight.current?.dispose(), [])
  useEffect(() => flight.current?.setActive(visible), [visible])

  useMotionValueEvent(progress, 'change', (v) => flight.current?.set(v, entry.get()))
  useMotionValueEvent(entry, 'change', (e) => flight.current?.set(progress.get(), e))

  // debugging and screenshots: window.__falconia(0.4) holds the flight at that progress
  useEffect(() => {
    const w = window as unknown as { __falconia?: (t: number, snap?: boolean) => void }
    w.__falconia = (t, snap) => (snap ? flight.current?.jump(t, 1) : flight.current?.set(t, 1))
    ;(window as unknown as { __falconiaSample?: unknown }).__falconiaSample = (t: number) => flight.current?.sample(t)
    ;(window as unknown as { __falconiaPick?: unknown }).__falconiaPick = (x: number, y: number) => flight.current?.pick(x, y)
    return () => void delete w.__falconia
  }, [])

  function layoutFrame(f: Flight, t: number) {
    const cv = canvasRef.current
    if (!cv) return
    const W = cv.clientWidth
    const H = cv.clientHeight
    layoutFinale(f, t, W, H, W < 820)
    let now = 0
    PHASES.forEach((p, i) => {
      if (t >= p.from) now = i
    })
    if (now !== stepRef.current) {
      stepRef.current = now
      setStep(now)
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

  return (
    <div ref={ref} className="scene" style={{ height: '1000vh' }}>
      <div className="scene-sticky fal3-sticky">
        <div ref={finaleRef} className="fal3-finale">
          <img {...img(M + FINALE.src, '(max-width: 820px) 100vw, 84vw')} alt={FINALE.alt} loading="lazy" decoding="async" />
        </div>
        <div ref={modelRef} className="fal3-model">
          <canvas key={gen} ref={canvasRef} className="fal3-canvas" aria-hidden />
        </div>
        <div className="scene-caption" aria-hidden>
          {PHASES.map((p, i) => (
            <span key={p.label} className={i === step ? 'on' : ''}>
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Without WebGL, or with Reduce Motion: the symposium photo on its own. */
function LayersScene() {
  return (
    <div className="scene">
      <div className="fal-sticky fal-still">
        <div className="fal-stage">
          <div className="fal-layer">
            <img {...img(M + FINALE.src, '(max-width: 820px) 100vw, 84vw')} alt={FINALE.alt} loading="lazy" decoding="async" style={{ objectFit: 'cover' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
