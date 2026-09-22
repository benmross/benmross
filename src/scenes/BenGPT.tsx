import { CanvasScene, type Draw } from '../components/CanvasScene'
import { alpha, font, rrect } from '../lib/draw'
import { easeOut, rng, seg } from '../lib/motion'

const BLUE = '#3d8bff'
const PINK = '#ff7aa8'
const FG = '#ecebe4'
const MUTED = '#8d8b84'

const INCOMING = 'wait is this actually you'
/** Each token the model emits, with the candidates it was choosing between. */
const TOKENS: { pick: string; alts: [string, number][] }[] = [
  { pick: 'lol', alts: [['lol', 0.41], ['yes', 0.22], ['bro', 0.14], ['wdym', 0.08], ['no', 0.05]] },
  { pick: ' yes', alts: [[' yes', 0.52], [' yeah', 0.31], [' obviously', 0.07], [' who', 0.04], [' ofc', 0.03]] },
  { pick: ' who', alts: [[' who', 0.63], [' why', 0.11], [' what', 0.09], [' it', 0.06], [' lmao', 0.04]] },
  { pick: ' else', alts: [[' else', 0.88], [' would', 0.04], [' do', 0.03], [' is', 0.02], [' tf', 0.01]] },
  { pick: ' would', alts: [[' would', 0.71], [' is', 0.12], [' could', 0.09], [' did', 0.03], [' do', 0.02]] },
  { pick: ' it', alts: [[' it', 0.82], [' i', 0.07], [' this', 0.05], [' you', 0.03], [' that', 0.01]] },
  { pick: ' be', alts: [[' be', 0.9], [' be?', 0.05], [' be lol', 0.03], [' b', 0.01], [' been', 0.01]] },
]

const LAYERS = [9, 13, 15, 15, 13, 9, 5]

// Fixed wiring and weights, so the drawing is the same on every visit.
const r = rng(31)
const EDGES: { l: number; a: number; b: number; w: number }[] = []
for (let l = 0; l < LAYERS.length - 1; l++)
  for (let a = 0; a < LAYERS[l]; a++)
    for (let j = 0; j < 4; j++) EDGES.push({ l, a, b: Math.floor(r() * LAYERS[l + 1]), w: r() * 2 - 1 })
const ACT = TOKENS.map(() => LAYERS.map((n) => Array.from({ length: n }, () => Math.pow(r(), 1.6))))
const MATRIX = Array.from({ length: 12 * 36 }, () => r() * 2 - 1)

const START = 0.04
const END = 0.9
const PER = (END - START) / TOKENS.length

const draw: Draw = (ctx, w, h, t, p) => {
  const wide = w > h * 1.05
  const k = wide ? Math.max(0.75, Math.min(w / 1280, h / 760)) : Math.max(0.72, Math.min(w / 420, h / 820))

  // which token is being produced, and how far through its forward pass
  const idx = Math.min(TOKENS.length - 1, Math.max(0, Math.floor((p - START) / PER)))
  const u = seg(p, START + idx * PER, START + (idx + 1) * PER)
  const wave = u * 1.25 * (LAYERS.length - 1)
  const emitted = TOKENS.filter((_, i) => p >= START + (i + 0.9) * PER).length
  const done = p >= END

  // ---- layout
  const net = wide
    ? { x0: w * 0.07, x1: w * 0.44, y0: h * 0.2, y1: h * 0.72 }
    : { x0: w * 0.08, x1: w * 0.62, y0: h * 0.08, y1: h * 0.38 }
  const nodePos = (l: number, i: number) => {
    const x = net.x0 + ((net.x1 - net.x0) * l) / (LAYERS.length - 1)
    const n = LAYERS[l]
    const span = (net.y1 - net.y0) * (n / 15)
    const cy = (net.y0 + net.y1) / 2
    return { x, y: n === 1 ? cy : cy - span / 2 + (span * i) / (n - 1) }
  }
  const glow = (l: number) => Math.exp(-Math.pow(wave - l, 2) / 0.35)

  // ---- connections
  ctx.lineWidth = 1
  for (const e of EDGES) {
    const a = nodePos(e.l, e.a)
    const b = nodePos(e.l + 1, e.b)
    const act = ACT[idx][e.l][e.a]
    const g = Math.exp(-Math.pow(wave - (e.l + 0.5), 2) / 0.3)
    const past = wave > e.l + 0.5 ? 0.12 : 0
    const on = act * Math.abs(e.w) * (g * 0.9 + past)
    ctx.strokeStyle = alpha(e.w > 0 ? BLUE : PINK, 0.05 + on)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  // ---- nodes
  LAYERS.forEach((n, l) => {
    for (let i = 0; i < n; i++) {
      const q = nodePos(l, i)
      const act = ACT[idx][l][i]
      const lit = act * (glow(l) + (wave > l ? 0.3 : 0))
      ctx.fillStyle = alpha(BLUE, 0.18 + lit * 0.8)
      ctx.beginPath()
      ctx.arc(q.x, q.y, (3.2 + lit * 3) * k, 0, Math.PI * 2)
      ctx.fill()
      if (lit > 0.4) {
        ctx.fillStyle = alpha('#ffffff', (lit - 0.4) * 1.2)
        ctx.beginPath()
        ctx.arc(q.x, q.y, 1.6 * k, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })

  // ---- weight matrix, one column per step of the pass
  if (wide) {
    const cols = 36
    const rows = 12
    const cell = Math.min(((net.x1 - net.x0) / cols) * 0.92, 9 * k)
    const mx = net.x0
    const my = net.y1 + 46 * k
    const active = Math.floor(seg(wave, 0, LAYERS.length - 1) * cols)
    for (let c = 0; c < cols; c++)
      for (let rr = 0; rr < rows; rr++) {
        const v = MATRIX[rr * cols + c] * Math.sin(idx * 1.7 + c * 0.3 + rr)
        const hot = c === active && u < 0.8 ? 0.55 : 0
        ctx.fillStyle = alpha(v > 0 ? BLUE : PINK, 0.08 + Math.abs(v) * 0.35 + hot)
        ctx.fillRect(mx + c * (cell + 1.5), my + rr * (cell + 1.5), cell, cell)
      }
    font(ctx, 11 * k, 500)
    ctx.fillStyle = MUTED
    ctx.textAlign = 'left'
    ctx.fillText('weights', mx, my - 10 * k)
  }

  // ---- softmax over the next token
  {
    const show = easeOut(seg(u, 0.7, 0.85))
    const bx = wide ? net.x1 + 34 * k : net.x1 + 22 * k
    const bw = wide ? w * 0.12 : w * 0.2
    const rowH = (wide ? 30 : 26) * k
    const by = (net.y0 + net.y1) / 2 - (rowH * 5) / 2
    TOKENS[idx].alts.forEach(([tok, pr], i) => {
      const y = by + i * rowH
      const chosen = tok === TOKENS[idx].pick
      const pick = chosen ? seg(u, 0.85, 0.92) : 0
      ctx.globalAlpha = show
      font(ctx, 12.5 * k, chosen ? 700 : 500)
      ctx.textAlign = 'left'
      ctx.fillStyle = chosen ? FG : MUTED
      ctx.fillText(JSON.stringify(tok), bx, y + 11 * k)
      ctx.fillStyle = alpha(chosen ? BLUE : FG, chosen ? 0.35 + pick * 0.65 : 0.14)
      ctx.fillRect(bx, y + 16 * k, bw * pr * show, 4 * k)
      font(ctx, 10.5 * k, 500)
      ctx.fillStyle = MUTED
      ctx.textAlign = 'right'
      ctx.fillText(pr.toFixed(2), bx + bw, y + 11 * k)
    })
    ctx.globalAlpha = 1
    // the chosen token flying to the phone
    const fly = seg(u, 0.9, 1)
    if (fly > 0 && fly < 1 && !done) {
      const ph = phoneBox(w, h, wide, k)
      const tx = ph.x + ph.w * 0.7
      const ty = ph.y + ph.h * 0.55
      const e = easeOut(fly)
      font(ctx, 14 * k, 700)
      ctx.textAlign = 'left'
      ctx.fillStyle = alpha(BLUE, 1 - fly * 0.6)
      ctx.fillText(TOKENS[idx].pick.trim(), bx + (tx - bx) * e, by + 11 * k + (ty - by) * e)
    }
  }

  // ---- phone
  {
    const ph = phoneBox(w, h, wide, k)
    rrect(ctx, ph.x, ph.y, ph.w, ph.h, 30 * k)
    ctx.fillStyle = '#050608'
    ctx.fill()
    ctx.strokeStyle = alpha(FG, 0.26)
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.lineWidth = 1
    rrect(ctx, ph.x + ph.w / 2 - 24 * k, ph.y + 10 * k, 48 * k, 13 * k, 7 * k)
    ctx.fillStyle = alpha(FG, 0.14)
    ctx.fill()
    // contact
    ctx.fillStyle = alpha(FG, 0.16)
    ctx.beginPath()
    ctx.arc(ph.x + ph.w / 2, ph.y + 52 * k, 15 * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = alpha(FG, 0.1)
    ctx.fillRect(ph.x + 10 * k, ph.y + 80 * k, ph.w - 20 * k, 1)

    const pad = 12 * k
    const maxW = ph.w * 0.72
    font(ctx, 14 * k, 450)
    // incoming
    let y = ph.y + ph.h * 0.36
    y = bubble(ctx, INCOMING, ph.x + pad, y, maxW, k, false)
    // outgoing, built token by token
    const text = TOKENS.slice(0, emitted)
      .map((x) => x.pick)
      .join('')
      .trim()
    y += 10 * k
    if (emitted === 0) {
      typing(ctx, ph.x + ph.w - pad, y, k, t)
    } else {
      y = bubble(ctx, text + (done ? '' : ' '), ph.x + ph.w - pad, y, maxW, k, true, !done && Math.floor(t * 2.5) % 2 === 0)
      if (done) {
        font(ctx, 10.5 * k, 500)
        ctx.fillStyle = MUTED
        ctx.textAlign = 'right'
        ctx.fillText('Delivered', ph.x + ph.w - pad, y + 16 * k)
      }
    }
  }
}

function phoneBox(w: number, h: number, wide: boolean, k: number) {
  if (wide) {
    const ph = Math.min(h * 0.72, 580 * k)
    return { x: w * 0.8 - ph * 0.24, y: h / 2 - ph / 2 - 10, w: ph * 0.48, h: ph }
  }
  const ph = h * 0.46
  const pw = Math.min(w * 0.7, ph * 0.62)
  return { x: w / 2 - pw / 2, y: h * 0.45, w: pw, h: ph }
}

/** Draws a chat bubble and returns the y below it. Right-aligned when `mine`. */
function bubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  k: number,
  mine: boolean,
  caret = false,
) {
  font(ctx, 14 * k, 450)
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const wd of words) {
    const next = cur ? cur + ' ' + wd : wd
    if (ctx.measureText(next).width > maxW - 24 * k && cur) {
      lines.push(cur)
      cur = wd
    } else cur = next
  }
  lines.push(cur)
  const lh = 18 * k
  const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24 * k + (caret ? 6 * k : 0)
  const bh = lines.length * lh + 16 * k
  const bx = mine ? x - bw : x
  rrect(ctx, bx, y, bw, bh, 17 * k)
  ctx.fillStyle = mine ? BLUE : '#26282c'
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'
  lines.forEach((l, i) => ctx.fillText(l, bx + 12 * k, y + 21 * k + i * lh))
  if (caret) {
    const last = lines[lines.length - 1]
    ctx.fillRect(bx + 13 * k + ctx.measureText(last).width, y + 9 * k + (lines.length - 1) * lh, 1.5 * k, 15 * k)
  }
  return y + bh
}

function typing(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, t: number) {
  const bw = 54 * k
  rrect(ctx, x - bw, y, bw, 32 * k, 16 * k)
  ctx.fillStyle = alpha(BLUE, 0.35)
  ctx.fill()
  for (let i = 0; i < 3; i++) {
    const b = (Math.sin(t * 6 - i * 0.8) + 1) / 2
    ctx.fillStyle = alpha('#ffffff', 0.4 + b * 0.5)
    ctx.beginPath()
    ctx.arc(x - bw + 15 * k + i * 12 * k, y + 16 * k - b * 2 * k, 3 * k, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function BenGPTScene() {
  return (
    <CanvasScene
      height="420vh"
      label="Animation: a neural network runs one forward pass per word, picks each next word from a list of probabilities, and types the reply into a text message."
      draw={draw}
      steps={[
        { at: 0, label: 'Forward pass' },
        { at: 0.2, label: 'Next token' },
        { at: 0.9, label: 'Sent' },
      ]}
    />
  )
}
