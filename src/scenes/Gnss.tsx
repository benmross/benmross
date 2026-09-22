import { CanvasScene, type Draw } from '../components/CanvasScene'
import { alpha, font } from '../lib/draw'
import { easeInOut, easeOut, rng, seg } from '../lib/motion'

// An illustration of the idea, drawn from nothing. No data or code from the project.

const TEAL = '#35e0c2'
const RED = '#ff5b5b'
const FG = '#ecebe4'
const MUTED = '#8d8b84'

type V = { x: number; y: number }
const SATS: V[] = [
  { x: 0.12, y: 0.1 },
  { x: 0.4, y: 0.05 },
  { x: 0.7, y: 0.08 },
  { x: 0.92, y: 0.16 },
]
const PLANE: V = { x: 0.36, y: 0.5 }
const GHOST: V = { x: 0.5, y: 0.36 }
const SPOOFER: V = { x: 0.64, y: 0.72 }
const RADIUS = 0.2

const r = rng(7)
const gauss = () => (r() + r() + r() - 1.5) / 1.5
const REPORTS: (V & { bad: boolean; at: number })[] = []
for (let i = 0; i < 110; i++) {
  const bad = i % 10 < 7
  const x = bad ? SPOOFER.x + gauss() * RADIUS * 0.95 : 0.06 + r() * 0.88
  const y = bad ? SPOOFER.y - 0.02 + gauss() * RADIUS * 0.7 : 0.25 + r() * 0.7
  REPORTS.push({ x, y, bad, at: r() })
}
const TRAFFIC = Array.from({ length: 22 }, () => ({
  x: r(),
  y: 0.25 + r() * 0.7,
  a: r() * Math.PI * 2,
  v: 0.012 + r() * 0.02,
}))

function hull(pts: V[]) {
  if (pts.length < 3) return pts
  const s = [...pts].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: V, a: V, b: V) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lo: V[] = []
  for (const p of s) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop()
    lo.push(p)
  }
  const up: V[] = []
  for (const p of s.reverse()) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop()
    up.push(p)
  }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}

function plane(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, a: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(s, 0)
  ctx.lineTo(-s * 0.7, s * 0.6)
  ctx.lineTo(-s * 0.35, 0)
  ctx.lineTo(-s * 0.7, -s * 0.6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function crosshair(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.arc(x, y, s, 0, Math.PI * 2)
  ctx.moveTo(x - s * 1.8, y)
  ctx.lineTo(x - s * 0.5, y)
  ctx.moveTo(x + s * 0.5, y)
  ctx.lineTo(x + s * 1.8, y)
  ctx.moveTo(x, y - s * 1.8)
  ctx.lineTo(x, y - s * 0.5)
  ctx.moveTo(x, y + s * 0.5)
  ctx.lineTo(x, y + s * 1.8)
  ctx.stroke()
}

const draw: Draw = (ctx, w, h, t, p) => {
  const wide = w > h
  const k = Math.max(0.75, Math.min(w, h) / 760)
  const m = { x: w * 0.06, y: h * 0.1, w: w * 0.88, h: h * 0.78 }
  const X = (v: V) => ({ x: m.x + v.x * m.w, y: m.y + v.y * m.h })

  const tri = seg(p, 0.02, 0.26)
  const spoof = seg(p, 0.28, 0.48)
  const drop = seg(p, 0.5, 0.76)
  const clus = seg(p, 0.78, 0.94)

  // ---- ground: faint graticule
  ctx.lineWidth = 1
  ctx.strokeStyle = alpha(FG, 0.05)
  for (let i = 0; i <= 12; i++) {
    const x = m.x + (m.w * i) / 12
    ctx.beginPath()
    ctx.moveTo(x, m.y + m.h * 0.2)
    ctx.lineTo(x, m.y + m.h)
    ctx.stroke()
  }
  for (let i = 0; i <= 8; i++) {
    const y = m.y + m.h * 0.2 + (m.h * 0.8 * i) / 8
    ctx.beginPath()
    ctx.moveTo(m.x, y)
    ctx.lineTo(m.x + m.w, y)
    ctx.stroke()
  }

  // ---- satellites and their ranges to the aircraft
  const P = X(PLANE)
  const G = X(GHOST)
  const pos = { x: P.x + (G.x - P.x) * easeInOut(spoof), y: P.y + (G.y - P.y) * easeInOut(spoof) }
  SATS.forEach((sv, i) => {
    const S = X(sv)
    const on = easeOut(seg(tri, i * 0.12, i * 0.12 + 0.55))
    const d = Math.hypot(pos.x - S.x, pos.y - S.y)
    ctx.strokeStyle = alpha(spoof > 0 ? RED : TEAL, (0.5 - drop * 0.4) * on)
    ctx.setLineDash(spoof > 0.05 ? [4, 6] : [])
    ctx.beginPath()
    ctx.arc(S.x, S.y, Math.max(0.1, d * on), 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    // pulse travelling down the range
    const q = (t * 0.6 + i * 0.25) % 1
    ctx.strokeStyle = alpha(TEAL, 0.35 * on * (1 - q) * (1 - drop))
    ctx.beginPath()
    ctx.arc(S.x, S.y, d * q, 0, Math.PI * 2)
    ctx.stroke()
    // the satellite
    ctx.fillStyle = FG
    ctx.fillRect(S.x - 4 * k, S.y - 4 * k, 8 * k, 8 * k)
    ctx.fillStyle = alpha(TEAL, 0.8)
    ctx.fillRect(S.x - 15 * k, S.y - 2 * k, 9 * k, 4 * k)
    ctx.fillRect(S.x + 6 * k, S.y - 2 * k, 9 * k, 4 * k)
    font(ctx, 10.5 * k, 600)
    ctx.fillStyle = MUTED
    ctx.textAlign = 'center'
    ctx.fillText(`GPS ${[7, 12, 19, 24][i]}`, S.x, S.y + 20 * k)
  })

  // ---- background traffic
  const traffic = seg(p, 0.44, 0.56)
  if (traffic > 0) {
    const Sp = X(SPOOFER)
    TRAFFIC.forEach((a) => {
      const tx = (((a.x + Math.cos(a.a) * a.v * t) % 1) + 1) % 1
      const ty = 0.25 + ((((a.y - 0.25 + Math.sin(a.a) * a.v * t) % 0.7) + 0.7) % 0.7)
      const q = X({ x: tx, y: ty })
      const inside = Math.hypot((q.x - Sp.x) / m.w, (q.y - Sp.y) / m.h) < RADIUS * 0.9
      plane(ctx, q.x, q.y, 6 * k, a.a, alpha(inside && drop > 0 ? RED : FG, 0.45 * traffic * (1 - clus * 0.5)))
    })
  }

  // ---- low-integrity reports accumulating
  const reps = REPORTS.map(X)
  REPORTS.forEach((rp, i) => {
    const show = seg(drop, rp.at * 0.8, rp.at * 0.8 + 0.2)
    if (show <= 0) return
    const q = reps[i]
    ctx.fillStyle = alpha(rp.bad ? RED : TEAL, (rp.bad ? 0.85 : 0.35) * show)
    ctx.beginPath()
    ctx.arc(q.x, q.y, (rp.bad ? 2.6 : 2) * k, 0, Math.PI * 2)
    ctx.fill()
  })

  // ---- the spoofer
  const Sp = X(SPOOFER)
  if (spoof > 0) {
    for (let i = 0; i < 3; i++) {
      const q = (t * 0.45 + i / 3) % 1
      ctx.strokeStyle = alpha(RED, spoof * (1 - q) * (1 - clus * 0.7) * 0.6)
      ctx.beginPath()
      ctx.arc(Sp.x, Sp.y, q * RADIUS * m.w * 0.9, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = spoof * (1 - clus)
    ctx.fillStyle = RED
    ctx.beginPath()
    ctx.moveTo(Sp.x, Sp.y - 9 * k)
    ctx.lineTo(Sp.x + 7 * k, Sp.y + 6 * k)
    ctx.lineTo(Sp.x - 7 * k, Sp.y + 6 * k)
    ctx.closePath()
    ctx.fill()
    font(ctx, 11 * k, 600)
    ctx.textAlign = 'center'
    ctx.fillText('jammer / spoofer', Sp.x, Sp.y + 24 * k)
    ctx.globalAlpha = 1
  }

  // ---- the aircraft, true position vs what it reports
  {
    const fade = 1 - drop * 0.75
    ctx.globalAlpha = fade * easeOut(seg(tri, 0, 0.2))
    plane(ctx, P.x, P.y, 11 * k, -0.35, FG)
    if (tri > 0.7) crosshair(ctx, pos.x, pos.y, 9 * k, alpha(spoof > 0 ? RED : TEAL, seg(tri, 0.7, 1)))
    if (spoof > 0) {
      ctx.setLineDash([3, 5])
      ctx.strokeStyle = alpha(RED, 0.7)
      ctx.beginPath()
      ctx.moveTo(P.x, P.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      ctx.setLineDash([])
      plane(ctx, pos.x, pos.y, 11 * k, -0.35, alpha(RED, 0.5))
    }
    font(ctx, 11.5 * k, 600)
    ctx.textAlign = 'left'
    ctx.fillStyle = spoof > 0.5 ? RED : TEAL
    const nic = spoof > 0.5 ? 'NIC 0' : 'NIC 8'
    if (tri > 0.7) ctx.fillText(`${spoof > 0.5 ? 'reported' : 'fix'}  ·  ${nic}`, pos.x + 20 * k, pos.y - 12 * k)
    ctx.globalAlpha = 1
  }

  // ---- cluster the bad reports, estimate the source
  if (clus > 0) {
    const bad = reps.filter((_, i) => REPORTS[i].bad)
    const hl = hull(bad)
    const c = bad.reduce((a, b) => ({ x: a.x + b.x / bad.length, y: a.y + b.y / bad.length }), { x: 0, y: 0 })
    const e = easeOut(clus)
    ctx.beginPath()
    hl.forEach((q, i) => {
      const x = c.x + (q.x - c.x) * (1.15 - 0.15 * e)
      const y = c.y + (q.y - c.y) * (1.15 - 0.15 * e)
      if (i) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    })
    ctx.closePath()
    ctx.fillStyle = alpha(RED, 0.08 * e)
    ctx.fill()
    ctx.strokeStyle = alpha(RED, 0.7 * e)
    ctx.setLineDash([5, 5])
    ctx.stroke()
    ctx.setLineDash([])
    const ch = seg(clus, 0.4, 1)
    if (ch > 0) {
      crosshair(ctx, c.x, c.y, 12 * k * (2 - easeOut(ch)), alpha(FG, ch))
      font(ctx, 12 * k, 650)
      ctx.fillStyle = alpha(FG, ch)
      ctx.textAlign = wide ? 'left' : 'center'
      ctx.fillText('estimated source', wide ? c.x + 30 * k : c.x, wide ? c.y + 4 * k : c.y - 32 * k)
    }
  }
}

export function GnssScene() {
  return (
    <CanvasScene
      height="380vh"
      label="Illustration: satellites fix an aircraft's position, a ground transmitter spoofs it, aircraft near the transmitter report low integrity, and clustering those reports estimates where the transmitter is."
      draw={draw}
      steps={[
        { at: 0, label: 'Trilaterate' },
        { at: 0.28, label: 'Spoof' },
        { at: 0.5, label: 'Integrity drops' },
        { at: 0.78, label: 'Cluster' },
      ]}
    />
  )
}
