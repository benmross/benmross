import { useLayoutEffect, useRef, useState } from 'react'
import { m, useTransform } from 'motion/react'
import { useSceneProgress } from '../lib/motion'
import { img } from '../lib/media'

const M = '/media/kart/'

const CARDS: { kind: 'img'; src: string; w: number; alt: string; cap?: string; contain?: boolean }[] = [
  { kind: 'img', src: M + 'kart-night.webp', w: 1.55, alt: 'The kart at night, its frame lit red by LED strips' },
  { kind: 'img', src: M + 'kart-dash-mounted.webp', w: 1.55, alt: 'The dashboard running on the kart, mounted under the steering wheel' },
  { kind: 'img', src: M + 'dashboard-ui.webp', w: 1.72, contain: true, alt: 'The kart dashboard: speed gauge and map', cap: 'Dashboard, React on a Raspberry Pi' },
  { kind: 'img', src: M + 'pcb-mainboard-isometric.webp', w: 1.5, alt: 'Render of the custom mainboard', cap: 'Custom mainboard' },
  { kind: 'img', src: M + 'pcb-mainboard-connectors-closeup.webp', w: 0.95, alt: 'Close-up of mainboard connectors', cap: 'Power, CAN, LEDs' },
]

export function KartScene() {
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
