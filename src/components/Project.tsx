import { useRef, type ReactNode } from 'react'
import type { Project as P } from '../content'
import { Lines, Rise, useAccent } from './ui'

/** Title, facts and links for one project, followed by its own visual. */
export function Project({ p, children }: { p: P; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  useAccent(ref, p.accent, p.tint)
  return (
    <section ref={ref} id={p.id} className="project">
      <div className="project-head">
        <Lines text={p.titleLines ?? p.title} className="project-title" />
        <div className="project-info">
          <Rise>
            <div className="project-meta">
              <span>{p.years}</span>
              <span>{p.role}</span>
              <span>{p.stack}</span>
            </div>
            <p className="project-blurb">{p.blurb}</p>
          </Rise>
          {p.stats && (
            <Rise delay={0.1} className="project-stats">
              {p.stats.map((s) => (
                <div className="stat" key={s.label}>
                  <b>{s.value}</b>
                  <span>{s.label}</span>
                </div>
              ))}
            </Rise>
          )}
          {p.links && (
            <Rise delay={0.18} className="project-links">
              {p.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="u">
                  {l.label}
                </a>
              ))}
            </Rise>
          )}
        </div>
      </div>
      <div className="project-body">{children}</div>
    </section>
  )
}
