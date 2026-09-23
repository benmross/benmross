import { useRef } from 'react'
import { LazyMotion, domAnimation, m, useScroll, useTransform } from 'motion/react'
import { projects, site } from './content'
import { scrollToId, useSmoothScroll } from './lib/motion'
import { Cursor, Lines, Rise, useAccent } from './components/ui'
import { Project } from './components/Project'
import { HeraldScene } from './scenes/Herald'
import { KartScene } from './scenes/Kart'
import { BenGPTScene } from './scenes/BenGPT'
import { SparrowsScene } from './scenes/Sparrows'
import { GnssScene } from './scenes/Gnss'
import { FalconiaScene } from './scenes/Falconia'
import { EmulsionScene, EmulsionField } from './scenes/Emulsion'

const scenes: Record<string, () => React.ReactNode> = {
  herald: () => <HeraldScene />,
  kart: () => <KartScene />,
  bengpt: () => <BenGPTScene />,
  sparrows: () => <SparrowsScene />,
  gnss: () => <GnssScene />,
  falconia: () => <FalconiaScene />,
  emulsion: () => <EmulsionScene />,
}

function Header() {
  return (
    <header className="header">
      <a href="#top" className="mark" onClick={(e) => (e.preventDefault(), scrollToId('top'))}>
        Ben Ross
      </a>
      <nav>
        <a href="#work" className="u" onClick={(e) => (e.preventDefault(), scrollToId(projects[0].id))}>
          Work
        </a>
        <a href="/cv.pdf" className="u" target="_blank" rel="noreferrer">
          CV
        </a>
        <a href="#contact" className="u" onClick={(e) => (e.preventDefault(), scrollToId('contact'))}>
          Contact
        </a>
      </nav>
    </header>
  )
}

function Hero() {
  const ref = useRef<HTMLElement>(null)
  useAccent(ref, '#ecebe4', '#0c0c0d')
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '38%'])
  const wdth = useTransform(scrollYProgress, [0, 0.8], [125, 62])
  const fvs = useTransform(wdth, (w) => `'wdth' ${w.toFixed(1)}`)
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  return (
    <section ref={ref} className="hero" id="top">
      <m.div className="hero-canvas" style={{ opacity: fade }}>
        <EmulsionField preset="hero" />
      </m.div>
      <m.div style={{ y, alignSelf: 'end', position: 'relative', zIndex: 1 }}>
        <m.div style={{ fontVariationSettings: fvs }}>
          <Lines as="h1" text={site.name} className="hero-name" delay={0.15} />
        </m.div>
      </m.div>
      <Rise delay={0.3} className="hero-foot" immediate>
        <div>
          {site.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
        <ul className="hero-index">
          {projects.map((p) => (
            <li key={p.id}>
              <a
                href={`#${p.id}`}
                className="u"
                onClick={(e) => (e.preventDefault(), scrollToId(p.id))}
              >
                <i className="dot" style={{ background: p.accent }} />
                {p.title}
              </a>
            </li>
          ))}
        </ul>
      </Rise>
    </section>
  )
}

function Footer() {
  const ref = useRef<HTMLElement>(null)
  useAccent(ref, '#ecebe4', '#0c0c0d')
  return (
    <footer ref={ref} className="footer" id="contact">
      <p className="footer-kicker">Get in touch</p>
      <a href={`mailto:${site.email}`} className="footer-mail" data-cursor="Write">
        <Lines as="h2" text={site.email} className="" />
      </a>
      <div className="footer-row">
        <span>College Park, MD</span>
        <nav>
          {site.links.map((l) => (
            <a key={l.label} href={l.href} className="u" target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}

export function App() {
  useSmoothScroll()
  return (
    <LazyMotion features={domAnimation} strict>
      <Header />
      <main>
        <Hero />
        {projects.map((p) => (
          <Project key={p.id} p={p}>
            {scenes[p.id]?.()}
          </Project>
        ))}
      </main>
      <Footer />
      <Cursor />
      <div className="grain" aria-hidden />
    </LazyMotion>
  )
}
