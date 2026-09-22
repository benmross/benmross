import { useRef, useState, type ReactNode } from 'react'
import { useMotionValueEvent } from 'motion/react'
import { reducedMotion, useCanvasLoop, useNearViewport, useSceneProgress } from '../lib/motion'

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, p: number) => void

/**
 * A tall section with a sticky, full-screen canvas. Scroll position through the section is the
 * `p` handed to `draw`; `t` is wall time for anything that should keep moving on its own.
 * `steps` label the phases along the bottom and light up as `p` passes each one.
 */
export function CanvasScene({
  height = '320vh',
  draw,
  steps,
  children,
  label,
}: {
  height?: string
  draw: Draw
  steps?: { at: number; label: string }[]
  children?: ReactNode
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const progress = useSceneProgress(ref)
  const near = useNearViewport(ref)
  const [step, setStep] = useState(0)
  const still = reducedMotion()
  useMotionValueEvent(progress, 'change', (v) => {
    if (!steps) return
    let s = 0
    steps.forEach((st, i) => v >= st.at && (s = i))
    setStep(s)
  })
  useCanvasLoop(canvas, near, (ctx, w, h, t) => draw(ctx, w, h, still ? 0 : t, progress.get()))
  return (
    <div ref={ref} className="scene" style={{ height }}>
      <div className="scene-sticky">
        <canvas ref={canvas} role="img" aria-label={label} style={{ width: '100%', height: '100%', display: 'block' }} />
        {children}
        {steps && (
          <div className="scene-caption" aria-hidden>
            {steps.map((s, i) => (
              <span key={s.label} className={i === step ? 'on' : ''}>
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
