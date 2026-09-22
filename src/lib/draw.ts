// Small canvas helpers shared by the scene drawings.

export const FONT = "'Archivo Variable', system-ui, sans-serif"

export function font(ctx: CanvasRenderingContext2D, size: number, weight = 500) {
  ctx.font = `${weight} ${size}px ${FONT}`
}

export function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

export type Pt = { x: number; y: number }

/** Point along a cubic curve that leaves `a` and arrives at `b` horizontally or vertically. */
export function curvePoint(a: Pt, b: Pt, t: number, vertical = false): Pt {
  const c1 = vertical ? { x: a.x, y: (a.y + b.y) / 2 } : { x: (a.x + b.x) / 2, y: a.y }
  const c2 = vertical ? { x: b.x, y: (a.y + b.y) / 2 } : { x: (a.x + b.x) / 2, y: b.y }
  const u = 1 - t
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  }
}

export function curve(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, vertical = false) {
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  if (vertical) ctx.bezierCurveTo(a.x, (a.y + b.y) / 2, b.x, (a.y + b.y) / 2, b.x, b.y)
  else ctx.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x, b.y)
}

/** Dots flowing along a curve. `amount` 0..1 fades the stream in and out. */
export function stream(
  ctx: CanvasRenderingContext2D,
  a: Pt,
  b: Pt,
  t: number,
  color: string,
  amount: number,
  { n = 4, speed = 0.45, r = 2.2, offset = 0, vertical = false } = {},
) {
  if (amount <= 0.001) return
  for (let i = 0; i < n; i++) {
    const k = (t * speed + i / n + offset) % 1
    const p = curvePoint(a, b, k, vertical)
    ctx.fillStyle = alpha(color, amount * Math.sin(k * Math.PI))
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}
