import { useEffect, useRef, useState } from 'react'
import VERT from '../shaders/plate.vert.glsl?raw'
import FRAG from '../shaders/plate.frag.glsl?raw'
import { reducedMotion, useNearViewport } from '../lib/motion'

// The shaders are emulsion's own, copied unchanged from github.com/benmross/emulsion at 0d89967.
// This file is a smaller renderer around them: no export, no controls beyond plate and seed.

type Plate = Record<string, number | string | boolean>

const DEFAULTS: Plate = {
  shape: 0, scale: 1, angle: 0, soft: 0.3, warp: 0.45, detail: 3.4, mottle: 0.35, posx: -0.05, posy: 0,
  bands: 2, blur: 0, streak: 0, streakang: 0,
  exposure: 0.05, contrast: 1.35, black: 0.05, gamma: 1, vignette: 0.35, gloss: 0,
  c0: '#000000', c1: '#6E7076', c2: '#F2F2F0', mid: 0.5, invert: false,
  grain: 0.16, gsize: 1.3, gdens: 0.9, gresp: 0.75, chroma: false,
  tex: 0, texamt: 0.35, texscale: 1, flow: 0.35, seed: 0.37,
}

// A selection of emulsion's own plates, values as they ship.
const PLATES: { name: string; p: Plate }[] = [
  { name: 'Satin', p: { shape: 2, scale: 1.1, angle: -22, soft: 0.4, warp: 0.75, detail: 3.6, mottle: 0.2, posx: 0, exposure: 0, contrast: 1.2, black: 0.04, vignette: 0.15, grain: 0.28, gsize: 1, gdens: 1, gresp: 0.85, c0: '#0A0507', c1: '#7A4552', c2: '#FFE0D2' } },
  { name: 'Chrome', p: { shape: 6, scale: 1, soft: 0.4, warp: 0.85, detail: 3.2, mottle: 0.15, posx: 0, bands: 3, blur: 0.06, contrast: 1.45, black: 0.03, vignette: 0.15, gloss: 0.55, grain: 0.12, gsize: 1, gdens: 0.85, gresp: 0.5, exposure: 0, c0: '#03080E', c1: '#4E6E8C', c2: '#CFE2F2' } },
  { name: 'Oil', p: { shape: 6, scale: 1.35, angle: 20, soft: 0.4, warp: 1.2, detail: 4, mottle: 0.2, posx: 0, bands: 5, blur: 0.13, exposure: 0, contrast: 1.15, black: 0.02, vignette: 0.2, gloss: 0.3, grain: 0.18, gsize: 1.1, gdens: 1, gresp: 0.7, c0: '#05010A', c1: '#A0219C', c2: '#7FF6FF' } },
  { name: 'Shaft', p: { shape: 1, scale: 1.15, angle: -38, soft: 0.5, warp: 0.3, detail: 3, mottle: 0.5, exposure: 0, contrast: 1.35, black: 0.06, gamma: 1.1, vignette: 0.2, grain: 0.2, gsize: 1.1, gdens: 0.95, gresp: 0.6, tex: 1, texamt: 0.35, texscale: 1.1, c0: '#060302', c1: '#5A2E06', c2: '#FFCF87' } },
  { name: 'Dune', p: { shape: 3, scale: 1.2, angle: -12, soft: 0.4, warp: 0.55, detail: 4.2, mottle: 0.3, posx: 0, exposure: -0.1, contrast: 1.45, black: 0.08, gamma: 1.1, vignette: 0.4, grain: 0.22, gsize: 1.2, gdens: 0.9, gresp: 0.8, tex: 2, texamt: 0.25, texscale: 1, c0: '#0A0705', c1: '#6A4B32', c2: '#F4E3C8' } },
  { name: 'Bloom', p: { shape: 7, scale: 1.05, soft: 0.4, warp: 0.55, detail: 3.4, mottle: 0.25, posx: 0, blur: 0.24, exposure: -0.3, contrast: 1.2, black: 0.14, gamma: 1.35, vignette: 0.55, grain: 0.17, gsize: 1.2, gdens: 1, gresp: 0.35, c0: '#08040A', c1: '#7A2140', c2: '#FFD9A8' } },
  { name: 'Haze', p: { shape: 7, scale: 1.9, angle: 24, soft: 0.5, warp: 0.35, detail: 2.6, mottle: 0.2, posx: 0.1, posy: -0.1, blur: 0.5, streak: 0.3, streakang: 20, exposure: -0.55, contrast: 0.85, black: 0.02, gamma: 1.45, vignette: 0.25, grain: 0.2, gsize: 1.1, gdens: 1, gresp: 0.3, c0: '#030706', c1: '#3C6B5C', c2: '#E6F2E4' } },
]

// Behind the name at the top of the page: Satin, turned down to the site's own greys.
const HERO: Plate = { ...PLATES[0].p, exposure: -0.5, vignette: 0.6, grain: 0.15, c0: '#0c0c0d', c1: '#34332f', c2: '#b9b5aa', flow: 0.25 }

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

type Draw = (p: Plate, w: number, h: number, ps: number, phase: number) => void

function makeRenderer(canvas: HTMLCanvasElement): Draw | null {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' })
  if (!gl) return null
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link')
  gl.useProgram(prog)
  gl.bindVertexArray(gl.createVertexArray())
  const loc: Record<string, WebGLUniformLocation | null> = {}
  const U = (n: string) => (n in loc ? loc[n] : (loc[n] = gl.getUniformLocation(prog, n)))
  const F: [string, string][] = [
    ['uScale', 'scale'], ['uAngle', 'angle'], ['uSoft', 'soft'], ['uWarp', 'warp'], ['uDetail', 'detail'],
    ['uMottle', 'mottle'], ['uPosX', 'posx'], ['uPosY', 'posy'], ['uExp', 'exposure'], ['uCon', 'contrast'],
    ['uBlack', 'black'], ['uGam', 'gamma'], ['uVig', 'vignette'], ['uTexAmt', 'texamt'], ['uTexScale', 'texscale'],
    ['uGrain', 'grain'], ['uGSize', 'gsize'], ['uGDens', 'gdens'], ['uGResp', 'gresp'], ['uBands', 'bands'],
    ['uBlur', 'blur'], ['uStreak', 'streak'], ['uStreakAng', 'streakang'], ['uGloss', 'gloss'], ['uMotion', 'flow'], ['uMid', 'mid'],
  ]
  return (p, w, h, ps, phase) => {
    if (gl.isContextLost()) return
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    gl.viewport(0, 0, w, h)
    gl.uniform2f(U('uRes'), w, h)
    gl.uniform1f(U('uPS'), ps)
    gl.uniform1f(U('uSeed'), p.seed as number)
    gl.uniform1i(U('uShape'), (p.shape as number) | 0)
    gl.uniform1i(U('uTex'), (p.tex as number) | 0)
    gl.uniform1i(U('uInvert'), p.invert ? 1 : 0)
    gl.uniform1i(U('uChroma'), p.chroma ? 1 : 0)
    for (const [u, k] of F) gl.uniform1f(U(u), p[k] as number)
    gl.uniform1f(U('uPhase'), phase)
    gl.uniform3fv(U('uC0'), hex(p.c0 as string))
    gl.uniform3fv(U('uC1'), hex(p.c1 as string))
    gl.uniform3fv(U('uC2'), hex(p.c2 as string))
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}

/**
 * A live emulsion plate filling its parent. Renders below display resolution and at most
 * 30 frames a second, and only while on screen; a full-screen fBm shader is not free.
 */
function Field({ plate, seed, className, quality = 0.7, active = true }: { plate: Plate; seed: number; className?: string; quality?: number; active?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const near = useNearViewport(canvas, '0px')
  const [failed, setFailed] = useState(false)
  const state = useRef({ plate, seed, dirty: true })
  state.current = { plate, seed, dirty: true }
  const draw = useRef<Draw | null>(null)
  useEffect(() => {
    if (!canvas.current || draw.current) return
    try {
      draw.current = makeRenderer(canvas.current)
    } catch {
      draw.current = null
    }
    if (!draw.current) setFailed(true)
  }, [])
  useEffect(() => {
    const c = canvas.current
    const d = draw.current
    if (!c || !d || !near || !active) return
    const still = reducedMotion()
    const loopMs = 9000
    let raf = 0
    let last = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (now - last < 33) return
      // with reduced motion the plate holds still, so only redraw when it or the seed changes
      if (still && !state.current.dirty) return
      state.current.dirty = false
      last = now
      const r = c.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const s = Math.min(quality * dpr, 1600 / Math.max(r.width, 1))
      const w = Math.max(2, Math.round(r.width * s))
      const h = Math.max(2, Math.round(r.height * s))
      const phase = still ? 0 : ((now % loopMs) / loopMs) * Math.PI * 2
      d({ ...DEFAULTS, ...state.current.plate, seed: state.current.seed }, w, h, s, phase)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [near, quality, active])
  return (
    <canvas
      ref={canvas}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block', background: failed ? 'radial-gradient(ellipse at 40% 40%, #34332f, #0c0c0d 70%)' : '#0c0c0d' }}
    />
  )
}

export function EmulsionField(_: { preset: 'hero' }) {
  return <Field plate={HERO} seed={0.37} quality={0.5} />
}

const CYCLE_MS = 5000
const FADE_MS = 1400

/**
 * Two stacked canvases so one plate can fade into the next. Plates cycle on their own while the
 * section is on screen, until a plate is picked by hand.
 */
export function EmulsionScene() {
  const [i, setI] = useState(0)
  const [layers, setLayers] = useState<[number, number]>([0, 0])
  const [front, setFront] = useState<0 | 1>(0)
  const [fading, setFading] = useState(false)
  const [auto, setAuto] = useState(true)
  const [seed, setSeed] = useState(0.37)
  const drag = useRef<{ x: number; seed: number } | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const visible = useNearViewport(wrap, '0px')
  const plate = PLATES[i]

  const show = (j: number) => {
    if (j === i) return
    const back = (front === 0 ? 1 : 0) as 0 | 1
    setLayers((l) => {
      const n: [number, number] = [...l] as [number, number]
      n[back] = j
      return n
    })
    setFront(back)
    setFading(true)
    setI(j)
  }
  useEffect(() => {
    if (!fading) return
    const t = setTimeout(() => setFading(false), FADE_MS + 100)
    return () => clearTimeout(t)
  }, [fading, front])
  useEffect(() => {
    if (!auto || !visible) return
    const t = setTimeout(() => show((i + 1) % PLATES.length), CYCLE_MS)
    return () => clearTimeout(t)
  })
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', plate.p.c2 as string)
  }, [plate])
  return (
    <div className="emulsion">
      <div
        ref={wrap}
        className="emulsion-stage"
        data-cursor="Drag"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, seed }
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const dx = (e.clientX - drag.current.x) / (wrap.current?.clientWidth || 1)
          setSeed((((drag.current.seed + dx * 0.6) % 1) + 1) % 1)
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {([0, 1] as const).map((k) => (
          <div key={k} className="emulsion-layer" style={{ opacity: front === k ? 1 : 0, zIndex: front === k ? 2 : 1, transitionDuration: `${FADE_MS}ms` }}>
            <Field plate={PLATES[layers[k]].p} seed={seed} quality={0.75} active={front === k || fading} />
          </div>
        ))}
      </div>
      <div className="emulsion-bar">
        <div className="emulsion-plates" role="radiogroup" aria-label="Plate">
          {PLATES.map((p, j) => (
            <button
              key={p.name}
              role="radio"
              aria-checked={i === j}
              className={i === j ? 'on' : ''}
              onClick={() => {
                setAuto(false)
                show(j)
              }}
            >
              <i style={{ background: `linear-gradient(90deg, ${p.p.c0}, ${p.p.c1}, ${p.p.c2})` }} />
              {p.name}
            </button>
          ))}
        </div>
        <span className="emulsion-seed">seed {seed.toFixed(3)}</span>
      </div>
    </div>
  )
}
