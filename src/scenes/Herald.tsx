import { CanvasScene, type Draw } from '../components/CanvasScene'
import { alpha, curve, font, rrect, stream, type Pt } from '../lib/draw'
import { easeOut, seg } from '../lib/motion'

const AMBER = '#f2a83b'
const GREEN = '#72d08e'
const RED = '#ff6159'
const FG = '#ecebe4'
const MUTED = '#8d8b84'

const SOURCES = ['Mail', 'Calendar', 'Messages', 'Location', 'Health', 'GitHub', 'Tasks', 'Contacts']
const TIERS = [
  { name: 'Green', what: 'read, draft', color: GREEN },
  { name: 'Amber', what: 'label, schedule, logged', color: AMBER },
  { name: 'Red', what: 'send, post, pay', color: RED },
]
const FACTS = 151531
const LEDGER_LINES = ['state/now.md', 'state/commitments.md', 'journal/2026-09-22.md', 'facts.db']

const draw: Draw = (ctx, w, h, t, p) => {
  const wide = w > h * 1.05
  const s = wide ? Math.min(w / 1280, h / 760) : Math.min(w / 420, h / 820)
  const k = Math.max(0.72, s)

  const collect = seg(p, 0.02, 0.3)
  const remember = seg(p, 0.28, 0.5)
  const decide = seg(p, 0.5, 0.72)
  const ask = seg(p, 0.72, 0.9)
  const tapped = seg(p, 0.9, 0.96)

  // ---- layout
  const src: Pt[] = []
  let ledger: { x: number; y: number; w: number; h: number }
  const tiers: Pt[] = []
  let phone: { x: number; y: number; w: number; h: number }
  const pillW = 118 * k
  const pillH = 30 * k
  if (wide) {
    const x = w * 0.1
    SOURCES.forEach((_, i) => src.push({ x, y: h * 0.2 + (i * h * 0.6) / (SOURCES.length - 1) }))
    ledger = { x: w * 0.4 - 115 * k, y: h / 2 - 140 * k, w: 230 * k, h: 280 * k }
    TIERS.forEach((_, i) => tiers.push({ x: w * 0.64, y: h * 0.33 + i * h * 0.17 }))
    const ph = Math.min(h * 0.64, 460 * k)
    phone = { x: w * 0.87 - ph * 0.26, y: h / 2 - ph / 2, w: ph * 0.52, h: ph }
  } else {
    SOURCES.forEach((_, i) =>
      src.push({ x: w * (0.14 + (i % 4) * 0.24), y: h * 0.12 + Math.floor(i / 4) * 44 * k }),
    )
    ledger = { x: w / 2 - 110 * k, y: h * 0.27, w: 220 * k, h: 150 * k }
    TIERS.forEach((_, i) => tiers.push({ x: w * (0.19 + i * 0.31), y: h * 0.58 }))
    phone = { x: w * 0.08, y: h * 0.67, w: w * 0.84, h: h * 0.2 }
  }
  const lc = { x: ledger.x + ledger.w / 2, y: ledger.y + ledger.h / 2 }
  const lIn = wide ? { x: ledger.x, y: lc.y } : { x: lc.x, y: ledger.y }
  const lOut = wide ? { x: ledger.x + ledger.w, y: lc.y } : { x: lc.x, y: ledger.y + ledger.h }

  // ---- wires
  ctx.lineWidth = 1
  src.forEach((a, i) => {
    const on = seg(collect, i * 0.06, i * 0.06 + 0.4)
    const from = wide ? { x: a.x + pillW / 2, y: a.y } : { x: a.x, y: a.y + pillH / 2 }
    ctx.strokeStyle = alpha(FG, 0.1 * on)
    curve(ctx, from, lIn, !wide)
    ctx.stroke()
    const flow = on * (1 - remember * 0.7)
    stream(ctx, from, lIn, t, AMBER, flow, { n: 3, speed: 0.35 + (i % 3) * 0.08, offset: i * 0.17, vertical: !wide, r: 2 * k })
  })
  tiers.forEach((b, i) => {
    const on = seg(decide, i * 0.18, i * 0.18 + 0.45)
    const to = wide ? { x: b.x - 4, y: b.y } : { x: b.x, y: b.y - 22 * k }
    ctx.strokeStyle = alpha(TIERS[i].color, 0.22 * on)
    curve(ctx, lOut, to, !wide)
    ctx.stroke()
    stream(ctx, lOut, to, t, TIERS[i].color, on * (1 - ask * 0.6), { n: 3, speed: 0.4, offset: i * 0.3, vertical: !wide, r: 2.2 * k })
  })
  // red tier to the phone
  {
    const r = tiers[2]
    const a = wide ? { x: r.x + 176 * k, y: r.y } : { x: r.x, y: r.y + 24 * k }
    const b = wide ? { x: phone.x, y: phone.y + phone.h * 0.45 } : { x: phone.x + phone.w / 2, y: phone.y }
    ctx.strokeStyle = alpha(RED, 0.3 * ask)
    curve(ctx, a, b, !wide)
    ctx.stroke()
    stream(ctx, a, b, t, RED, ask * (1 - tapped), { n: 2, speed: 0.5, vertical: !wide, r: 2.4 * k })
  }

  // ---- sources
  src.forEach((a, i) => {
    const on = easeOut(seg(collect, i * 0.06, i * 0.06 + 0.3))
    const x = wide ? a.x - pillW / 2 : a.x - (pillW * 0.8) / 2
    const pw = wide ? pillW : pillW * 0.8
    ctx.globalAlpha = on
    rrect(ctx, x, a.y - pillH / 2 + (1 - on) * 10, pw, pillH, pillH / 2)
    ctx.strokeStyle = alpha(FG, 0.22)
    ctx.stroke()
    font(ctx, 12.5 * k, 500)
    ctx.fillStyle = FG
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(SOURCES[i], x + pw / 2, a.y + (1 - on) * 10)
    ctx.globalAlpha = 1
  })

  // ---- ledger
  {
    const on = easeOut(seg(collect, 0, 0.35))
    ctx.globalAlpha = on
    rrect(ctx, ledger.x, ledger.y, ledger.w, ledger.h, 14 * k)
    ctx.fillStyle = alpha(AMBER, 0.05 + remember * 0.05)
    ctx.fill()
    ctx.strokeStyle = alpha(AMBER, 0.45)
    ctx.stroke()
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    font(ctx, 12 * k, 500)
    ctx.fillStyle = MUTED
    ctx.fillText('ledger', ledger.x + 18 * k, ledger.y + 28 * k)
    const n = Math.round(FACTS * easeOut(collect))
    font(ctx, (wide ? 34 : 28) * k, 750)
    ctx.fillStyle = FG
    ctx.fillText(n.toLocaleString('en-US'), ledger.x + 18 * k, ledger.y + (wide ? 68 : 60) * k)
    font(ctx, 12 * k, 500)
    ctx.fillStyle = MUTED
    ctx.fillText('facts', ledger.x + 18 * k, ledger.y + (wide ? 88 : 78) * k)
    // conclusions written down once, then maintained
    const lines = wide ? LEDGER_LINES : LEDGER_LINES.slice(0, 2)
    lines.forEach((l, i) => {
      const a = easeOut(seg(remember, 0.1 + i * 0.18, 0.4 + i * 0.18))
      const y = ledger.y + (wide ? 128 : 102) * k + i * 24 * k
      ctx.globalAlpha = on * a
      ctx.fillStyle = AMBER
      ctx.fillRect(ledger.x + 18 * k, y - 8 * k, 6 * k, 6 * k)
      font(ctx, 12.5 * k, 500)
      ctx.fillStyle = FG
      ctx.fillText(l, ledger.x + 32 * k + (1 - a) * 8, y)
    })
    // a cycle sweeping the ledger
    if (remember > 0 && remember < 1) {
      const ang = t * 2.4
      ctx.globalAlpha = Math.sin(remember * Math.PI) * 0.8
      ctx.strokeStyle = AMBER
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(ledger.x + ledger.w - 26 * k, ledger.y + 26 * k, 9 * k, ang, ang + 4.2)
      ctx.stroke()
      ctx.lineWidth = 1
    }
    ctx.globalAlpha = 1
  }

  // ---- tiers
  tiers.forEach((b, i) => {
    const on = easeOut(seg(decide, i * 0.18, i * 0.18 + 0.4))
    const tw = wide ? 176 * k : w * 0.28
    const th = wide ? 48 * k : 46 * k
    const x = wide ? b.x : b.x - tw / 2
    const y = b.y - th / 2
    ctx.globalAlpha = on
    rrect(ctx, x, y, tw, th, 10 * k)
    ctx.fillStyle = alpha(TIERS[i].color, 0.1)
    ctx.fill()
    ctx.strokeStyle = alpha(TIERS[i].color, 0.6)
    ctx.stroke()
    ctx.textAlign = wide ? 'left' : 'center'
    ctx.textBaseline = 'alphabetic'
    font(ctx, 14 * k, 700)
    ctx.fillStyle = TIERS[i].color
    const tx = wide ? x + 14 * k : b.x
    ctx.fillText(TIERS[i].name, tx, y + 20 * k)
    font(ctx, (wide ? 11.5 : 10) * k, 500)
    ctx.fillStyle = MUTED
    ctx.fillText(wide ? TIERS[i].what : TIERS[i].what.split(',')[0], tx, y + 36 * k)
    ctx.globalAlpha = 1
  })

  // ---- phone
  {
    const on = easeOut(ask)
    ctx.globalAlpha = on
    if (wide) {
      rrect(ctx, phone.x, phone.y, phone.w, phone.h, 26 * k)
      ctx.strokeStyle = alpha(FG, 0.28)
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.lineWidth = 1
      rrect(ctx, phone.x + phone.w / 2 - 22 * k, phone.y + 10 * k, 44 * k, 12 * k, 6 * k)
      ctx.fillStyle = alpha(FG, 0.18)
      ctx.fill()
    }
    const cx = wide ? phone.x + 12 * k : phone.x
    const cw = wide ? phone.w - 24 * k : phone.w
    const cy = wide ? phone.y + phone.h * 0.3 + (1 - on) * 20 : phone.y + (1 - on) * 20
    const ch = 132 * k
    rrect(ctx, cx, cy, cw, ch, 14 * k)
    ctx.fillStyle = 'rgba(40, 38, 34, 0.92)'
    ctx.fill()
    ctx.textAlign = 'left'
    font(ctx, 11 * k, 600)
    ctx.fillStyle = AMBER
    ctx.fillText('HERALD', cx + 12 * k, cy + 22 * k)
    font(ctx, 13 * k, 650)
    ctx.fillStyle = FG
    ctx.fillText('Send this email?', cx + 12 * k, cy + 44 * k)
    font(ctx, 11.5 * k, 450)
    ctx.fillStyle = MUTED
    ctx.fillText('To your advisor, re: Thursday', cx + 12 * k, cy + 62 * k)
    // buttons
    const bw = (cw - 36 * k) / 2
    const by = cy + ch - 44 * k
    ;[
      { l: tapped > 0.5 ? 'Sent' : 'Approve', c: GREEN, x: cx + 12 * k, hit: tapped },
      { l: 'Decline', c: FG, x: cx + 24 * k + bw, hit: 0 },
    ].forEach((b) => {
      rrect(ctx, b.x, by, bw, 30 * k, 8 * k)
      ctx.fillStyle = alpha(b.c, 0.12 + b.hit * 0.5)
      ctx.fill()
      ctx.textAlign = 'center'
      font(ctx, 12 * k, 650)
      ctx.fillStyle = b.hit > 0.5 ? '#0c0c0d' : b.c
      ctx.fillText(b.l, b.x + bw / 2, by + 19.5 * k)
    })
    // the tap
    if (tapped > 0 && tapped < 1) {
      ctx.strokeStyle = alpha(FG, 1 - tapped)
      ctx.beginPath()
      ctx.arc(cx + 12 * k + bw / 2, by + 15 * k, 8 + tapped * 30, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
}

export function HeraldScene() {
  return (
    <CanvasScene
      label="Diagram: data sources flow into Herald's ledger, actions are sorted into green, amber and red, and red actions wait for a tap on the phone."
      draw={draw}
      steps={[
        { at: 0, label: 'Collect' },
        { at: 0.28, label: 'Remember' },
        { at: 0.5, label: 'Decide' },
        { at: 0.72, label: 'Ask' },
      ]}
    />
  )
}
