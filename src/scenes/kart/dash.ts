import { pathAt } from './timeline'

/**
 * The kart's dashboard, redrawn on a canvas in the layout of the React kiosk app
 * (800 x 480): drive state, speed, gear, steering, pack voltage and current, the
 * map, pedal bars and the contactor.
 */

export type DashState = {
  mph: number
  rpm: number
  /** Road wheel angle in degrees, positive right. */
  steerDeg: number
  volts: number
  amps: number
  throttle: number
  brake: number
  /** Metres along the track, for the map. */
  s: number
}

const BG = '#0a0908'
const FG = '#ecebe4'
const MUTED = '#7c7a74'
const GREEN = '#2fd39a'
const CYAN = '#36c3e6'
const FONT = "'Archivo Variable', system-ui, sans-serif"

export function drawDash(g: CanvasRenderingContext2D, d: DashState) {
  const W = 800
  const H = 480
  g.fillStyle = BG
  g.fillRect(0, 0, W, H)
  g.textBaseline = 'middle'

  // status bar
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, 34)
  text(g, '8:19 PM', 14, 18, 15, FG, 'left', 600, 2)
  text(g, 'LIVE', 112, 18, 13, GREEN, 'left', 700, 2)
  dot(g, 100, 18, 3.5, GREEN)
  text(g, `${d.volts.toFixed(1)}V`, W - 14, 18, 14, FG, 'right', 600, 1)
  text(g, '11', W - 84, 18, 14, FG, 'right', 600, 1)
  dot(g, W - 112, 18, 3.5, GREEN)

  // drive state
  round(g, 12, 48, 80, 34, 8)
  g.fillStyle = 'rgba(47, 211, 154, 0.14)'
  g.fill()
  g.strokeStyle = 'rgba(47, 211, 154, 0.6)'
  g.lineWidth = 1.5
  g.stroke()
  text(g, 'DRIVE', 52, 66, 15, GREEN, 'center', 800, 2.5)

  // speed arc, 0 to 40 mph over 270 degrees
  const cx = 224
  const cy = 196
  const R = 92
  const a0 = Math.PI * 0.75
  const sweep = Math.PI * 1.5
  g.lineCap = 'round'
  g.lineWidth = 13
  g.strokeStyle = '#24211d'
  g.beginPath()
  g.arc(cx, cy, R, a0, a0 + sweep)
  g.stroke()
  g.strokeStyle = FG
  g.beginPath()
  g.arc(cx, cy, R, a0, a0 + sweep * Math.min(1, d.mph / 40))
  g.stroke()
  g.lineCap = 'butt'
  for (let v = 0; v <= 40; v += 10) {
    const a = a0 + (sweep * v) / 40
    text(g, String(v), cx + Math.cos(a) * (R - 26), cy + Math.sin(a) * (R - 26), 12, MUTED, 'center', 600)
  }
  // gears
  const gears = ['P', 'L', 'M', 'H', 'R']
  const names = ['PARK', 'LOW', 'MID', 'HIGH', 'REV']
  gears.forEach((n, i) => {
    const y = cy - 74 + i * 25
    const on = i === 3
    if (on) {
      round(g, cx - 36, y - 11, 72, 22, 5)
      g.fillStyle = 'rgba(54, 195, 230, 0.14)'
      g.fill()
      g.strokeStyle = CYAN
      g.lineWidth = 1.5
      g.stroke()
    }
    text(g, n, cx - 22, y, 15, on ? CYAN : '#3a3733', 'center', 800)
    text(g, names[i], cx - 6, y, 10, on ? CYAN : '#3a3733', 'left', 600, 1.5)
  })
  text(g, String(Math.round(d.mph)), cx + 2, cy + 66, 30, '#fff', 'right', 800)
  text(g, 'MPH', cx + 10, cy + 70, 10, MUTED, 'left', 600, 2)
  text(g, `${Math.round(d.rpm).toLocaleString('en-US')} RPM`, cx, cy + 94, 10, MUTED, 'center', 600, 1.5)

  // steering
  gaugeArc(g, 122, 348, 60)
  needle(g, 122, 348, 54, -Math.PI / 2 + (d.steerDeg / 40) * (Math.PI / 2), FG, 3)
  text(g, `${Math.abs(d.steerDeg).toFixed(0)}° ${d.steerDeg >= 0 ? 'R' : 'L'}`, 122, 378, 18, '#fff', 'center', 800)
  text(g, 'STEER', 122, 397, 9, MUTED, 'center', 600, 2)

  // volts and amps
  gaugeArc(g, 326, 348, 60)
  needle(g, 326, 348, 54, -Math.PI / 2 + ((d.volts - 72) / 14) * (Math.PI / 2), '#4c8dff', 3)
  needle(g, 326, 348, 42, -Math.PI + (d.amps / 400) * Math.PI, '#ff6b6b', 3)
  text(g, `${d.volts.toFixed(1)} V`, 326, 373, 14, '#6ea4ff', 'center', 700)
  text(g, `${Math.round(d.amps)} A`, 326, 391, 14, '#ff7a7a', 'center', 700)

  // map: the track, and where the kart is on it
  const mx = 449
  const my = 49
  const mw = 258
  const mh = 316
  round(g, mx, my, mw, mh, 10)
  g.fillStyle = '#13201a'
  g.fill()
  g.save()
  g.clip()
  const here = pathAt(d.s)
  const k = 5.2
  const mapX = (x: number, z: number) => mx + mw / 2 + rot(x - here.x, z - here.z, here.h).r * k
  const mapY = (x: number, z: number) => my + mh * 0.62 - rot(x - here.x, z - here.z, here.h).f * k
  for (const [w, c] of [[38, '#22332a'], [34, '#1b1b1b']] as const) {
    g.strokeStyle = c
    g.lineWidth = w
    g.lineJoin = 'round'
    g.beginPath()
    for (let s = Math.max(0, d.s - 40); s <= d.s + 50; s += 1) {
      const p = pathAt(s)
      const X = mapX(p.x, p.z)
      const Y = mapY(p.x, p.z)
      s === Math.max(0, d.s - 40) ? g.moveTo(X, Y) : g.lineTo(X, Y)
    }
    g.stroke()
  }
  dot(g, mx + mw / 2, my + mh * 0.62, 7, '#0a0908')
  dot(g, mx + mw / 2, my + mh * 0.62, 4.5, GREEN)
  g.restore()
  round(g, mx + 8, my + 8, 56, 18, 4)
  g.fillStyle = 'rgba(0,0,0,0.55)'
  g.fill()
  text(g, '11 SATS', mx + 36, my + 17.5, 8.5, FG, 'center', 600, 1)

  // pedal bars
  bar(g, 718, 68, 28, 280, d.throttle, GREEN, 'THR')
  bar(g, 756, 68, 28, 280, d.brake, '#ff6b6b', 'BRK')

  // contactor
  round(g, 449, 375, 339, 36, 8)
  g.fillStyle = 'rgba(47, 211, 154, 0.1)'
  g.fill()
  g.strokeStyle = 'rgba(47, 211, 154, 0.5)'
  g.lineWidth = 1.2
  g.stroke()
  text(g, 'CONTACTOR', 484, 386, 8, MUTED, 'left', 600, 1.5)
  text(g, 'Closed', 484, 399, 12, GREEN, 'left', 700)
  g.strokeStyle = GREEN
  g.lineWidth = 1.6
  g.beginPath()
  g.arc(466, 394, 6, -Math.PI * 0.3, Math.PI * 1.3)
  g.moveTo(466, 385)
  g.lineTo(466, 393)
  g.stroke()

  // tabs
  g.fillStyle = '#0d0c0b'
  g.fillRect(0, 424, W, 56)
  g.fillStyle = FG
  g.fillRect(12, 424, 136, 2)
  ;['DRIVE', 'MAP', 'CAMERA', 'LIGHTS', 'SYSTEM'].forEach((t, i) => text(g, t, 80 + i * 160, 458, 10, i ? MUTED : FG, 'center', 600, 2))
}

/** Offsets from the kart on the map: `r` to its right, `f` ahead. */
function rot(dx: number, dz: number, h: number) {
  const fx = Math.cos(h)
  const fz = -Math.sin(h)
  return { f: dx * fx + dz * fz, r: dx * -fz + dz * fx }
}

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', weight = 500, spacing = 0) {
  g.font = `${weight} ${size}px ${FONT}`
  g.fillStyle = color
  g.textAlign = align
  ;(g as unknown as { letterSpacing: string }).letterSpacing = `${spacing}px`
  g.fillText(s, x, y)
}
function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  g.fillStyle = color
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
}
function round(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}
function gaugeArc(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.strokeStyle = '#24211d'
  g.lineWidth = 9
  g.lineCap = 'round'
  g.beginPath()
  g.arc(x, y, r, Math.PI, Math.PI * 2)
  g.stroke()
  g.lineCap = 'butt'
}
function needle(g: CanvasRenderingContext2D, x: number, y: number, len: number, a: number, color: string, w: number) {
  g.strokeStyle = color
  g.lineWidth = w
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
  g.stroke()
  g.lineCap = 'butt'
  dot(g, x, y, 4.5, color)
}
function bar(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, u: number, color: string, label: string) {
  text(g, String(Math.round(u * 100)), x + w / 2, y - 12, 10, FG, 'center', 700)
  round(g, x, y, w, h, w / 2)
  g.fillStyle = '#1a1816'
  g.fill()
  if (u > 0.02) {
    g.save()
    g.clip()
    g.fillStyle = color
    round(g, x, y + h * (1 - u), w, h * u + w, w / 2)
    g.fill()
    g.restore()
  }
  text(g, label, x + w / 2, y + h + 12, 8.5, MUTED, 'center', 600, 1.5)
}
