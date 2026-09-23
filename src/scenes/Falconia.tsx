import { useRef, useState } from 'react'
import { m, useMotionValueEvent, useTransform, type MotionValue } from 'motion/react'
import { useSceneProgress } from '../lib/motion'
import { img } from '../lib/media'

const M = '/media/falconia/'

/** The talk first, then each step of the digital twin in order, from a table of sand to a room you can stand in. */
const STEPS = [
  { src: 'symposium.webp', label: 'Symposium', alt: 'Ben speaking at the Johns Hopkins APL XR Symposium, July 2025', fit: 'cover' },
  { src: 'crop-01.webp', label: 'Terrain', alt: 'The physical terrain table from above: craters, a lava tube, dunes and a stream bed', fit: 'cover' },
  { src: 'crop-06.webp', label: 'Rover', alt: 'Photogrammetry scan of the Raspberry Pi rover', fit: 'contain' },
  { src: 'crop-08.webp', label: 'Tracking', alt: 'Overhead camera feed with AprilTag markers tracking the rover', fit: 'cover' },
  { src: 'crop-02.webp', label: 'Scan', alt: 'Textured photogrammetry scan of the terrain in ParaView', fit: 'contain' },
  { src: 'crop-05.webp', label: 'Altimetry', alt: 'Heightmap of the terrain rendered from altimetry data', fit: 'contain' },
  { src: 'crop-03.webp', label: 'VR', alt: 'The VR scene: the rover as a red sphere, with geocache markers', fit: 'contain' },
  { src: 'crop-07.webp', label: 'CAVE', alt: 'A silhouetted visitor in front of the CAVE projection screen', fit: 'cover' },
] as const

function Layer({ i, progress }: { i: number; progress: MotionValue<number> }) {
  const n = STEPS.length
  const a = i / n
  const b = a + 0.6 / n
  // each layer wipes up over the one before it, and settles from a slight zoom
  const clip = useTransform(progress, [a, b], i === 0 ? ['inset(0% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'] : ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'])
  const scale = useTransform(progress, [a, b + 1 / n], [1.15, 1])
  const s = STEPS[i]
  return (
    <m.div className="fal-layer" style={{ clipPath: clip, zIndex: i }}>
      <m.img {...img(M + s.src, '(max-width: 820px) 100vw, 84vw')} alt={s.alt} loading="lazy" decoding="async" style={{ scale, objectFit: s.fit }} />
    </m.div>
  )
}

export function FalconiaScene() {
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
