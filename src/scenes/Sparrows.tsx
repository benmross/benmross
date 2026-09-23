import { useRef } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { Reveal } from '../components/ui'
import { img } from '../lib/media'

const M = '/media/sparrows/'

function Browser({ src, alt, url, sizes }: { src: string; alt: string; url: string; sizes?: string }) {
  return (
    <div className="browser">
      <div className="browser-bar">
        <i />
        <i />
        <i />
        <span>{url}</span>
      </div>
      <img {...img(src, sizes ?? '(max-width: 820px) 62vw, 34vw')} alt={alt} loading="lazy" decoding="async" />
    </div>
  )
}

/** Real screenshots of the live site, layered so each window drifts at its own speed. */
export function SparrowsScene() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const slow = useTransform(scrollYProgress, [0, 1], [80, -80])
  const fast = useTransform(scrollYProgress, [0, 1], [220, -220])
  const faster = useTransform(scrollYProgress, [0, 1], [320, -300])
  return (
    <div ref={ref} className="sparrows">
      <m.div className="sp-main" style={{ y: slow }}>
        <Reveal drift={0}>
          <Browser src={M + 'desktop-dashboard-poolesville.webp'} alt="Sparrows dashboard for Poolesville High School: the period countdown and the day's bell schedule" url="Poolesville · Dashboard" sizes="(max-width: 820px) 100vw, 80vw" />
        </Reveal>
      </m.div>
      <m.div className="sp-side a" style={{ y: fast }}>
        <Reveal drift={0}>
          <Browser src={M + 'desktop-schedule-explorer-poolesville.webp'} alt="Schedule explorer: a calendar picking the bell schedule for any date" url="Schedule explorer" />
        </Reveal>
      </m.div>
      <m.div className="sp-side b" style={{ y: faster }}>
        <Reveal drift={0}>
          <Browser src={M + 'desktop-clubs-poolesville.webp'} alt="Clubs directory for Poolesville High School" url="Clubs" />
        </Reveal>
      </m.div>
      <m.div className="sp-side c" style={{ y: fast }}>
        <Reveal drift={0}>
          <Browser src={M + 'desktop-opportunities.webp'} alt="Opportunities: internships and scholarships matched to students" url="Opportunities" />
        </Reveal>
      </m.div>
      <m.div className="sp-phone" style={{ y: faster }}>
        <Reveal drift={0}>
          <img src={M + 'mobile-landing.webp'} alt="The Sparrows landing page on a phone" loading="lazy" decoding="async" />
        </Reveal>
      </m.div>
    </div>
  )
}
