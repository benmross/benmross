import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useInView, useTransform } from 'motion/react'
import { EASE, useSceneProgress } from '../lib/motion'

const M = '/media/kart/'

/** The control stack as the repository documents it: one motion authority, an advisory dashboard. */
function Architecture() {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px -10% 0px -10%' })
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, strong = false, i = 0) => (
    <motion.g
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.8, ease: EASE, delay: 0.15 + i * 0.12 }}
    >
      <rect x={x} y={y} width={w} height={h} rx={10} fill={strong ? 'rgba(255,74,61,.12)' : 'rgba(236,235,228,.03)'} stroke={strong ? '#ff4a3d' : 'rgba(236,235,228,.3)'} />
      <text x={x + 14} y={y + 26} fill={strong ? '#ff4a3d' : '#ecebe4'} fontSize="15" fontWeight="700">{title}</text>
      <text x={x + 14} y={y + 46} fill="#8d8b84" fontSize="12">{sub}</text>
    </motion.g>
  )
  const wire = (d: string, label: string, lx: number, ly: number, dashed = false, i = 0) => (
    <g>
      <motion.path
        d={d}
        fill="none"
        stroke={dashed ? 'rgba(236,235,228,.4)' : '#ff4a3d'}
        strokeWidth={dashed ? 1.2 : 2}
        strokeDasharray={dashed ? '4 5' : undefined}
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : undefined}
        transition={{ duration: 1.1, ease: EASE, delay: 0.6 + i * 0.15 }}
      />
      <motion.text x={lx} y={ly} fill="#8d8b84" fontSize="11.5" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : undefined} transition={{ delay: 1 + i * 0.15 }}>
        {label}
      </motion.text>
    </g>
  )
  return (
    <svg ref={ref} viewBox="0 0 720 440" className="kart-arch" role="img" aria-label="Control architecture: a Raspberry Pi dashboard talks to a Teensy 4.1 over UART but cannot command motion; the Teensy drives the throttle and talks to an ESP32 steering controller over a 1 Mbps CAN bus.">
      <motion.rect
        x={16} y={16} width={220} height={140} rx={14} fill="none" stroke="rgba(236,235,228,.22)" strokeDasharray="3 6"
        initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : undefined} transition={{ delay: 1.4 }}
      />
      <motion.text x={30} y={144} fill="#8d8b84" fontSize="11" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : undefined} transition={{ delay: 1.5 }}>
        advisory only, can crash
      </motion.text>
      {box(30, 34, 190, 64, 'Raspberry Pi 4', 'React dashboard, 800×480', false, 0)}
      {box(260, 176, 200, 64, 'Teensy 4.1', 'sole motion authority', true, 1)}
      {box(500, 34, 200, 64, 'ESP32 “Steervo”', 'steer-by-wire PID', false, 2)}
      {box(500, 176, 200, 64, 'Talon SRX → CIM', 'steering motor', false, 3)}
      {box(260, 340, 200, 64, 'Throttle DAC → ESC', 'FarDriver motor controller', false, 4)}
      {box(30, 340, 190, 64, 'Watchdogs', 'state machine, pedals', false, 5)}
      {wire('M125 98 C125 150 200 208 260 208', 'UART telemetry', 120, 176, true, 0)}
      {wire('M460 208 C480 208 480 66 500 66', 'CAN 1 Mbps', 470, 132, false, 1)}
      {wire('M600 98 L600 176', '', 0, 0, false, 2)}
      {wire('M360 240 L360 340', '', 0, 0, false, 3)}
      {wire('M260 220 C230 240 180 300 125 340', '', 0, 0, false, 4)}
    </svg>
  )
}

const CARDS: { kind: 'img' | 'arch'; src?: string; w: number; alt?: string; cap?: string }[] = [
  { kind: 'img', src: M + 'dashboard-ui.webp', w: 1.6, alt: 'The kart dashboard: speed gauge and map', cap: 'Dashboard, React on a Raspberry Pi' },
  { kind: 'arch', w: 1.5, cap: 'Control architecture' },
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
        <motion.div ref={track} className="kart-track" style={{ x }}>
          {CARDS.map((c, i) => (
            <figure key={i} className="kart-card" style={{ ['--w' as string]: c.w }}>
              <div className="kart-frame">
                {c.kind === 'img' ? <img src={c.src} alt={c.alt} loading="lazy" /> : <Architecture />}
              </div>
              {c.cap && <figcaption>{c.cap}</figcaption>}
            </figure>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
