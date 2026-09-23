import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { m, useInView, useScroll, useTransform } from 'motion/react'
import { EASE } from '../lib/motion'

/** Sets the page accent and background tint while `ref` crosses the middle of the screen. */
export function useAccent(ref: RefObject<HTMLElement | null>, accent: string, tint: string) {
  const active = useInView(ref, { margin: '-48% 0px -48% 0px' })
  useEffect(() => {
    if (!active) return
    const root = document.documentElement
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--tint', tint)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tint)
  }, [active, accent, tint])
}

/** Headline whose lines rise out of a mask when it scrolls into view. */
export function Lines({ text, className, as = 'h2', delay = 0 }: { text: string | string[]; className?: string; as?: 'h1' | 'h2'; delay?: number }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' })
  const lines = Array.isArray(text) ? text : [text]
  const Tag = as
  return (
    <Tag ref={ref} className={className} aria-label={lines.join(' ')}>
      {lines.map((l, i) => (
        <span className="line" key={i} aria-hidden>
          <m.span
            initial={{ y: '105%' }}
            animate={inView ? { y: '0%' } : undefined}
            transition={{ duration: 1.1, ease: EASE, delay: delay + i * 0.09 }}
          >
            {l}
          </m.span>
        </span>
      ))}
    </Tag>
  )
}

/** Fades and lifts children in, once. */
export function Rise({ children, delay = 0, className, immediate }: { children: ReactNode; delay?: number; className?: string; immediate?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const inView = immediate || seen
  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      {children}
    </m.div>
  )
}

/**
 * Media that wipes open top to bottom when it enters, then drifts inside its frame as the page
 * scrolls, so the frame and the picture move at different speeds.
 */
export function Reveal({
  children,
  className,
  style,
  drift = 60,
  cursor,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  drift?: number
  cursor?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [-drift, drift])
  return (
    <m.div
      ref={ref}
      className={`reveal ${className ?? ''}`}
      style={style}
      data-cursor={cursor}
      initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
      animate={inView ? { clipPath: 'inset(0% 0% 0% 0%)' } : undefined}
      transition={{ duration: 1.4, ease: EASE }}
    >
      <m.div
        style={{ y, height: `calc(100% + ${drift * 2}px)`, marginTop: -drift }}
        initial={{ scale: 1.12 }}
        animate={inView ? { scale: 1 } : undefined}
        transition={{ duration: 1.8, ease: EASE }}
      >
        {children}
      </m.div>
    </m.div>
  )
}

/** A dot on the pointer that swells into a label over anything with data-cursor. */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [link, setLink] = useState(false)
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    document.body.classList.add('has-cursor')
    const move = (e: PointerEvent) => {
      if (ref.current) ref.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
      const t = e.target as HTMLElement | null
      const c = t?.closest<HTMLElement>('[data-cursor]')
      setLabel(c?.dataset.cursor || null)
      setLink(!c && !!t?.closest('a,button'))
    }
    window.addEventListener('pointermove', move)
    return () => {
      window.removeEventListener('pointermove', move)
      document.body.classList.remove('has-cursor')
    }
  }, [])
  return (
    <div ref={ref} className={`cursor ${label ? 'big' : link ? 'link' : ''}`} aria-hidden>
      <span>{label}</span>
    </div>
  )
}
