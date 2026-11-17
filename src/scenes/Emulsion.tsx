import { useEffect, useRef, useState } from 'react'
import { useNearViewport } from '../lib/motion'
import { emulsionPreview } from '../content'

/** Data Saver or a 2G/3G connection: keep the poster rather than stream a 3 MB loop. Chromium only reports this. */
function frugal() {
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return !!c && (c.saveData === true || /(^|-)2g|3g/.test(c.effectiveType ?? ''))
}

/** The Emulsion preview's shader loop is baked offline. */
function EmulsionField({ preset }: { preset: 'satin' }) {
  const video = useRef<HTMLVideoElement>(null)
  const visible = useNearViewport(video, '0px')
  // A poster attribute downloads at once even with preload="none", so it waits until the section is close.
  const near = useNearViewport(video, '150% 0px')
  const base = `/media/emulsion/${preset}`
  useEffect(() => {
    const node = video.current
    if (!node) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      if (motion.matches) {
        node.pause()
        if (node.hasAttribute('src')) {
          node.removeAttribute('src')
          node.load()
        }
        return
      }
      if (!visible || document.hidden || frugal()) {
        node.pause()
        return
      }
      // The lower section must not download its loop until it is visible.
      if (!node.hasAttribute('src')) node.src = `${base}-loop.mp4`
      node.muted = true
      // Autoplay can be declined by browser/power settings; keep the poster.
      void node.play().catch(() => {})
    }
    sync()
    motion.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      node.pause()
      motion.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [base, visible])
  return (
    <video
      ref={video}
      className="emulsion-background"
      poster={near ? `${base}-poster.webp` : undefined}
      preload="none"
      muted
      playsInline
      loop
      aria-hidden="true"
    />
  )
}

/** Actual app captures inside a device frame. */
export function EmulsionScene() {
  const [selected, setSelected] = useState(0)
  const [auto, setAuto] = useState(true)
  const wrap = useRef<HTMLDivElement>(null)
  const visible = useNearViewport(wrap, '0px')
  useEffect(() => {
    if (!auto || !visible) return
    const timer = setTimeout(() => setSelected((i) => (i + 1) % emulsionPreview.screens.length), 5000)
    return () => clearTimeout(timer)
  }, [auto, visible, selected])
  return (
    <div className="emulsion" ref={wrap}>
      <div className="emulsion-showcase">
        <div className="emulsion-ambient" aria-hidden="true">
          <EmulsionField preset="satin" />
        </div>
        <div className="emulsion-phone" role="group" aria-label={emulsionPreview.device}>
          <div className="emulsion-screen">
            {emulsionPreview.screens.map((screen, i) => (
              <img
                key={screen.name}
                src={screen.src}
                alt={screen.alt}
                width="900"
                height="1956"
                loading="lazy"
                decoding="async"
                aria-hidden={selected !== i}
                className={selected === i ? 'on' : ''}
              />
            ))}
          </div>
        </div>
        <div className="emulsion-gallery">
          <span>{emulsionPreview.caption}</span>
          <div className="emulsion-tabs" role="group" aria-label={emulsionPreview.caption}>
            {emulsionPreview.screens.map((screen, i) => (
              <button key={screen.name} aria-pressed={selected === i} onClick={() => { setAuto(false); setSelected(i) }}>
                {screen.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
