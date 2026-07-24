'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const projects = [
  {
    number: '01',
    title: 'Your phone is\nthe controller.',
    label: 'NETWORKING / GAMING',
    year: '2026',
    description:
      'PartyPad turns up to four phone browsers into controllers for Dolphin—no app or per-player setup. It bridges touch, motion, and IR input over local networks or secure online sessions, with experimental RetroArch support.',
    tags: ['PYTHON', 'WEBRTC', 'CLOUDFLARE', 'WEBSOCKETS'],
    tone: 'sage',
    visual: 'partypad',
    links: [['VIEW ON GITHUB', 'https://github.com/benmross/partypad']],
  },
  {
    number: '02',
    title: 'Teaching machines\nto sound human.',
    label: 'AI / RESEARCH',
    year: '2024',
    description:
      'Fine-tuning Llama 3.1 on a deeply personal dataset, then iterating in the cloud with TensorFlow and CUDA to explore where imitation becomes identity.',
    tags: ['PYTHON', 'LLAMA 3.1', 'CUDA', 'GOOGLE CLOUD'],
    tone: 'acid',
    visual: 'model',
  },
  {
    number: '03',
    title: 'A blimp that\nfinds its own way.',
    label: 'ROBOTICS / VISION',
    year: '2024',
    description:
      'A custom-designed, 3D-printed gondola with Raspberry Pi control, wireless sockets, motors, and an OpenCV pipeline for autonomous waypoint detection.',
    tags: ['OPENCV', 'RASPBERRY PI', 'CAD', '3D PRINTING'],
    tone: 'coral',
    visual: 'blimp',
  },
  {
    number: '04',
    title: 'Exoplanets,\nmade tangible.',
    label: 'XR / SPEAKING',
    year: '2025',
    description:
      'Presented at Johns Hopkins University’s XR Symposium on using ParaView and virtual reality to help students understand model exoplanets through rover design.',
    tags: ['PARAVIEW', 'VIRTUAL REALITY', 'EDUCATION'],
    tone: 'blue',
    visual: 'planet',
    image: '/images/BenSpeaking.jpg',
    links: [
      ['WATCH TALK', 'https://media.benmross.com/share/0zugGiJXVhonOmY79ze6ojXlyHnUB8gTpHvn39IgfbRechbaQRRKHQPfOK0Ii06KU5c'],
      ['VIEW SLIDES', 'https://docs.google.com/presentation/d/1N25vzvhnOOQZlcvmgbCfBu-j2xqSLYWWOfVPiOLNTjU/present#slide=id.p'],
    ],
  },
  {
    number: '05',
    title: 'A storefront for\na sweeter cause.',
    label: 'PRODUCT / WEB',
    year: '2024',
    description:
      'A performant full-stack platform for Pop for a Cause, pairing an expressive public site with a MongoDB-backed admin system and Stripe donations.',
    tags: ['NEXT.JS', 'TYPESCRIPT', 'MONGODB', 'STRIPE'],
    tone: 'pink',
    visual: 'website',
    image: '/images/popWebsiteScreenshot.png',
    links: [['VISIT SITE', 'https://pop.benmross.com']],
  },
]

const experiments = [
  ['Personal LLM Assistant', 'A self-hosted n8n + Ollama agent wired into Spotify and Notion.', 'AI / AUTOMATION'],
  ['Home Media Server', 'A Docker media stack tuned to run on a resource-constrained Raspberry Pi 3B+.', 'INFRASTRUCTURE'],
  ['Mental Health App', 'Core programmer on a student team building a React Native tool for high schools.', 'MOBILE / SOCIAL IMPACT'],
  ['Exoplanet Rover', 'Lead programmer for navigation, sample collection, and vision on variable terrain.', 'ROBOTICS'],
  ['Gene Data in R', 'Scalable visualizations of genome-wide association study data, built for the classroom.', 'DATA / BIOLOGY'],
  ['Room Reservations', 'A full-stack scheduling system designed and delivered for a school administrator.', 'PRODUCT / WEB'],
]

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? '↗' : '→'}</span>
}

function ProjectVisual({ project }: { project: (typeof projects)[number] }) {
  if (project.image) {
    return (
      <div className={`project-visual ${project.tone}`}>
        <Image src={project.image} alt="" fill sizes="(max-width: 800px) 100vw, 48vw" className="project-image" />
        <div className="image-wash" />
        <span className="visual-index">{project.number}</span>
      </div>
    )
  }

  return (
    <div className={`project-visual generated ${project.tone}`} aria-hidden="true">
      <span className="visual-index">{project.number}</span>
      {project.visual === 'partypad' ? (
        <div className="partypad-map">
          <div className="party-logo">PARTY<span>PAD</span><small>4 PLAYERS / 0 APPS</small></div>
          <div className="phone phone-one"><i>↑</i><b>◀</b><b>●</b><em>P1</em></div>
          <div className="phone phone-two"><i>＋</i><b>●</b><b>●</b><em>P2</em></div>
          <div className="phone phone-three"><i>↖</i><b>●</b><b>●</b><em>P3</em></div>
          <div className="phone phone-four"><i>IR</i><b>−</b><b>＋</b><em>P4</em></div>
          <div className="signal"><i /><i /><i /></div>
          <div className="console-port">DSU<br />26760</div>
        </div>
      ) : project.visual === 'model' ? (
        <div className="model-map">
          {Array.from({ length: 21 }).map((_, i) => <i key={i} />)}
          <b>LOSS ↓</b><em>0.041</em>
        </div>
      ) : (
        <div className="blimp">
          <div className="blimp-body"><span /></div>
          <div className="gondola">PI<br />CAM</div>
          <div className="route"><i /><i /><i /></div>
        </div>
      )}
    </div>
  )
}

export default function Portfolio() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [time, setTime] = useState('')
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const update = () => setTime(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date()))
    update()
    const timer = setInterval(update, 30000)

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible'))
    }, { threshold: 0.12 })
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el))
    return () => { clearInterval(timer); observer.disconnect() }
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Ben Ross, home">BR<span>®</span></a>
        <div className="header-status"><i /> AVAILABLE FOR INTERESTING WORK</div>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>
          {menuOpen ? 'CLOSE' : 'MENU'} <span>{menuOpen ? '×' : '＋'}</span>
        </button>
        <nav className={menuOpen ? 'open' : ''}>
          <a href="#work" onClick={closeMenu}>WORK</a>
          <a href="#about" onClick={closeMenu}>ABOUT</a>
          <a href="/cv" onClick={closeMenu}>CV</a>
          <a href="#contact" onClick={closeMenu}>CONTACT</a>
        </nav>
      </header>

      <section className="hero" id="top" ref={heroRef}>
        <div className="hero-kicker">
          <span>DEVELOPER + BUILDER</span>
          <span>POOLESVILLE, MD · {time} ET</span>
        </div>
        <h1>
          <span>SOFTWARE WITH</span>
          <span className="outline">A PULSE.</span>
          <span>SYSTEMS WITH</span>
          <span className="shift">A PURPOSE.<i>✦</i></span>
        </h1>
        <div className="hero-footer">
          <p>I’m Ben Ross, an incoming computer science freshman at the University of Maryland. I build at the intersection of intelligent software, physical systems, and practical curiosity.</p>
          <a href="#work">SELECTED WORK <Arrow /></a>
        </div>
        <div className="ticker" aria-hidden="true"><span>AI · ROBOTICS · FULL-STACK · INFRASTRUCTURE · COMPUTER VISION · AI · ROBOTICS · FULL-STACK · INFRASTRUCTURE · COMPUTER VISION · </span></div>
      </section>

      <section className="work" id="work">
        <div className="section-heading" data-reveal>
          <span>01 / SELECTED WORK</span>
          <h2>Projects that left<br />the lab.</h2>
          <p>A few things I’ve researched, designed, programmed, broken, and rebuilt.</p>
        </div>

        <div className="project-list">
          {projects.map((project) => (
            <article className="project" key={project.number} data-reveal>
              <ProjectVisual project={project} />
              <div className="project-copy">
                <div className="project-meta"><span>{project.label}</span><span>{project.year}</span></div>
                <h3>{project.title.split('\n').map((line) => <span key={line}>{line}</span>)}</h3>
                <p>{project.description}</p>
                <div className="tags">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                {project.links && <div className="project-links">{project.links.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer">{label} <Arrow diagonal /></a>)}</div>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="experiments">
        <div className="section-heading compact" data-reveal>
          <span>02 / MORE FROM THE BENCH</span>
          <h2>Side quests &<br />experiments.</h2>
        </div>
        <div className="experiment-list">
          {experiments.map(([title, description, type], index) => (
            <article key={title} data-reveal>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><h3>{title}</h3><p>{description}</p></div>
              <em>{type}</em><b><Arrow diagonal /></b>
            </article>
          ))}
        </div>
      </section>

      <section className="about" id="about">
        <div className="about-title" data-reveal><span>03 / THE HUMAN</span><h2>CURIOUS BY<br />DEFAULT.</h2></div>
        <div className="about-copy" data-reveal>
          <p className="lead">I like projects where the answer isn’t already sitting in a tutorial.</p>
          <p>I’m an incoming computer science freshman at the University of Maryland, drawn to AI, cyber forensics, self-hosting, robotics, and the satisfying moment when an abstract idea starts doing something useful in the real world.</p>
          <p>That has meant everything from training language models and building agents to 3D-printing an autonomous blimp gondola and presenting XR research at Johns Hopkins.</p>
          <a href="/cv">READ THE FULL CV <Arrow /></a>
        </div>
        <div className="portrait" data-reveal>
          <Image src="/images/BenRoss.jpeg" alt="Ben Ross beneath spring blossoms wearing a University of Maryland pullover" fill sizes="(max-width: 800px) 100vw, 35vw" />
          <span>BEN ROSS — INCOMING COMPUTER SCIENCE FRESHMAN AT UMD</span>
        </div>
      </section>

      <section className="contact" id="contact">
        <p data-reveal>HAVE A HARD PROBLEM, A STRANGE IDEA,<br />OR SOMETHING WORTH BUILDING?</p>
        <a href="mailto:ben.m.ross08@gmail.com" data-reveal>LET’S TALK.<Arrow diagonal /></a>
        <footer>
          <span>© {new Date().getFullYear()} BEN ROSS</span>
          <div><a href="https://github.com/benmross" target="_blank" rel="noreferrer">GITHUB ↗</a><a href="https://linkedin.com/in/ben-m-ross" target="_blank" rel="noreferrer">LINKEDIN ↗</a></div>
          <span>BUILT WITH INTENTION + CURIOSITY</span>
        </footer>
      </section>
    </main>
  )
}
