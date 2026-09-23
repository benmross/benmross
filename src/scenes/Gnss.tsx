import { CanvasScene, type Draw } from '../components/CanvasScene'
import { alpha, font } from '../lib/draw'
import { easeInOut, easeOut, rng, seg } from '../lib/motion'

// The outlines are 40 KB, so they load the first time the scene is drawn rather than with the page.
let OUTLINES: number[][] = []
let requested = false
const loadOutlines = () => {
  if (requested) return
  requested = true
  import('./middleEast').then((m) => (OUTLINES = m.OUTLINES))
}

// An illustration of the idea, drawn from nothing. No data or code from the project.

const TEAL = '#35e0c2'
const RED = '#ff5b5b'
const FG = '#ecebe4'
const MUTED = '#8d8b84'

type V = { x: number; y: number }
/** Satellites live in screen space, along the top. */
const SATS: V[] = [
  { x: 0.12, y: 0.1 },
  { x: 0.4, y: 0.05 },
  { x: 0.7, y: 0.08 },
  { x: 0.92, y: 0.16 },
]
// Everything on the ground is in degrees: x is longitude, y is latitude.
const PLANE: V = { x: 33.3, y: 32.7 }
const GHOST: V = { x: 35.49, y: 33.82 } // spoofed aircraft have shown up over Beirut airport
const SPOOFER: V = { x: 34.95, y: 31.7 }
const RADIUS = 2.1
const VIEW = { lon0: 24, lon1: 50, lat0: 24, lat1: 40, lon: 35.8, lat: 32.2 }
const KX = Math.cos((VIEW.lat * Math.PI) / 180)
const LABELS: [string, number, number][] = [
  ['Egypt', 30.6, 27.6],
  ['Jordan', 37.0, 30.4],
  ['Syria', 38.6, 35.2],
  ['Iraq', 43.2, 32.8],
  ['Saudi Arabia', 40.5, 27.6],
  ['Cyprus', 33.1, 35.45],
  ['Turkey', 36.4, 38.4],
  ['Israel', 34.45, 30.55],
]

const r = rng(7)
const gauss = () => (r() + r() + r() - 1.5) / 1.5
const REPORTS: (V & { bad: boolean; at: number })[] = []
for (let i = 0; i < 120; i++) {
  const bad = i % 10 < 7
  const x = bad ? SPOOFER.x + (gauss() * RADIUS) / KX : VIEW.lon0 + r() * (VIEW.lon1 - VIEW.lon0)
  const y = bad ? SPOOFER.y + gauss() * RADIUS * 0.85 : VIEW.lat0 + r() * (VIEW.lat1 - VIEW.lat0)
  REPORTS.push({ x, y, bad, at: r() })
}
const TRAFFIC = Array.from({ length: 26 }, () => ({
  x: VIEW.lon0 + r() * (VIEW.lon1 - VIEW.lon0),
  y: VIEW.lat0 + r() * (VIEW.lat1 - VIEW.lat0),
  a: r() * Math.PI * 2,
  v: 0.08 + r() * 0.12,
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
  loadOutlines()
  const wide = w > h
  const k = Math.max(0.75, Math.min(w, h) / 760)
  const m = { x: w * 0.06, y: h * 0.1, w: w * 0.88, h: h * 0.78 }
  const S = (v: V) => ({ x: m.x + v.x * m.w, y: m.y + v.y * m.h })
  // ground: cover the canvas with the view box, centred on the eastern Mediterranean
  const deg = Math.max(w / ((VIEW.lon1 - VIEW.lon0) * KX), h / (VIEW.lat1 - VIEW.lat0))
  const X = (v: V) => ({ x: w / 2 + (v.x - VIEW.lon) * KX * deg, y: h * 0.55 - (v.y - VIEW.lat) * deg })

  const tri = seg(p, 0.02, 0.26)
  const spoof = seg(p, 0.28, 0.48)
  const drop = seg(p, 0.5, 0.76)
  const clus = seg(p, 0.78, 0.94)

  // ---- ground: country outlines, drawn as wire
  ctx.lineWidth = 1
  ctx.strokeStyle = alpha(FG, 0.05)
  for (let lon = 25; lon <= 50; lon += 5) {
    const a = X({ x: lon, y: 20 })
    const b = X({ x: lon, y: 45 })
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  for (let lat = 20; lat <= 45; lat += 5) {
    const a = X({ x: 20, y: lat })
    const b = X({ x: 55, y: lat })
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  ctx.strokeStyle = alpha(TEAL, 0.4)
  ctx.fillStyle = alpha(TEAL, 0.025)
  ctx.lineJoin = 'round'
  for (const ring of OUTLINES) {
    ctx.beginPath()
    for (let i = 0; i < ring.length; i += 2) {
      const q = X({ x: ring[i], y: ring[i + 1] })
      if (i) ctx.lineTo(q.x, q.y)
      else ctx.moveTo(q.x, q.y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  font(ctx, 10.5 * k, 500)
  ctx.textAlign = 'center'
  for (const [name, lon, lat] of LABELS) {
    const q = X({ x: lon, y: lat })
    ctx.fillStyle = alpha(FG, name === 'Israel' ? 0.3 + clus * 0.4 : 0.24)
    ctx.fillText(name.toUpperCase(), q.x, q.y)
  }
  // fade the ground out under the satellites
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.3)
  g.addColorStop(0, 'rgba(6,17,15,0.95)')
  g.addColorStop(1, 'rgba(6,17,15,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h * 0.3)

  // ---- satellites and their ranges to the aircraft
  const P = X(PLANE)
  const G = X(GHOST)
  const pos = { x: P.x + (G.x - P.x) * easeInOut(spoof), y: P.y + (G.y - P.y) * easeInOut(spoof) }
  SATS.forEach((sv, i) => {
    const Sv = S(sv)
    const on = easeOut(seg(tri, i * 0.12, i * 0.12 + 0.55))
    const d = Math.hypot(pos.x - Sv.x, pos.y - Sv.y)
    ctx.strokeStyle = alpha(spoof > 0 ? RED : TEAL, (0.5 - drop * 0.4) * on)
    ctx.setLineDash(spoof > 0.05 ? [4, 6] : [])
    ctx.beginPath()
    ctx.arc(Sv.x, Sv.y, Math.max(0.1, d * on), 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    // pulse travelling down the range
    const q = (t * 0.6 + i * 0.25) % 1
    ctx.strokeStyle = alpha(TEAL, 0.35 * on * (1 - q) * (1 - drop))
    ctx.beginPath()
    ctx.arc(Sv.x, Sv.y, d * q, 0, Math.PI * 2)
    ctx.stroke()
    // the satellite
    ctx.fillStyle = FG
    ctx.fillRect(Sv.x - 4 * k, Sv.y - 4 * k, 8 * k, 8 * k)
    ctx.fillStyle = alpha(TEAL, 0.8)
    ctx.fillRect(Sv.x - 15 * k, Sv.y - 2 * k, 9 * k, 4 * k)
    ctx.fillRect(Sv.x + 6 * k, Sv.y - 2 * k, 9 * k, 4 * k)
    font(ctx, 10.5 * k, 600)
    ctx.fillStyle = MUTED
    ctx.textAlign = 'center'
    ctx.fillText(`GPS ${[7, 12, 19, 24][i]}`, Sv.x, Sv.y + 20 * k)
  })

  // ---- background traffic
  const traffic = seg(p, 0.44, 0.56)
  if (traffic > 0) {
    const Sp = X(SPOOFER)
    const span = VIEW.lon1 - VIEW.lon0
    const spanY = VIEW.lat1 - VIEW.lat0
    TRAFFIC.forEach((a) => {
      const tx = VIEW.lon0 + ((((a.x - VIEW.lon0 + Math.cos(a.a) * a.v * t) % span) + span) % span)
      const ty = VIEW.lat0 + ((((a.y - VIEW.lat0 + Math.sin(a.a) * a.v * t) % spanY) + spanY) % spanY)
      const q = X({ x: tx, y: ty })
      const inside = Math.hypot(q.x - Sp.x, q.y - Sp.y) < RADIUS * deg
      plane(ctx, q.x, q.y, 6 * k, -a.a, alpha(inside && drop > 0 ? RED : FG, 0.5 * traffic * (1 - clus * 0.5)))
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
      ctx.arc(Sp.x, Sp.y, q * RADIUS * deg, 0, Math.PI * 2)
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
    ctx.fillText('spoofer', Sp.x, Sp.y + 24 * k)
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
