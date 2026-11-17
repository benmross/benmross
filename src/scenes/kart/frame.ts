/**
 * The kart's coordinate frames and named points, with no three.js in them, so the page can
 * place labels from ANCHOR without pulling the 3D engine into the first download.
 *
 * Kart frame: origin on the ground under the middle of the kart, +x forward, +y up,
 * +z to the driver's right, metres.
 */

export type V3 = [number, number, number]
export type WireKind = 'cmd' | 'tel' | 'pwr'
export type WireSpec = { id: string; kind: WireKind; pts: V3[]; r?: number; reverse?: boolean; spacing?: number; speed?: number }

export const AXLE = { front: 0.64, rear: -0.66, frontHalf: 0.53, rearHalf: 0.57, frontR: 0.19, rearR: 0.205 }

/** The dashboard's case: where it sits on the dash bar, tilted back toward the driver, and its size. */
export const DASH = { pos: [0.43, 0.615, 0.22] as V3, tilt: -0.24, w: 0.25, h: 0.152, d: 0.105 }
/**
 * The mainboard behind the screen, components facing forward. Board millimetres (KiCad x = u,
 * KiCad y = v, h above the copper) map to the case's frame with the board turned 180 degrees in
 * its plane, so u runs along +z and v up. `uc`, `vc` are the middle of the board outline.
 */
export const BOARD = { x: -0.022, uc: 26.125, vc: 41.75 }
/** The cable gland in the case's side wall that the wheel's USB cable comes in through, case frame. */
export const GLAND = { x: BOARD.x + 0.0035, y: (40.7 - BOARD.vc) * 0.001, r: 0.0052, lift: 0.0018 }

export function dashToBody(p: V3): V3 {
  const c = Math.cos(DASH.tilt)
  const s = Math.sin(DASH.tilt)
  return [DASH.pos[0] + p[0] * c - p[1] * s, DASH.pos[1] + p[0] * s + p[1] * c, DASH.pos[2] + p[2]]
}
export const boardToDash = (u: number, v: number, h: number): V3 => [BOARD.x + h * 0.001, (v - BOARD.vc) * 0.001, (u - BOARD.uc) * 0.001]
export const boardToBody = (u: number, v: number, h: number) => dashToBody(boardToDash(u, v, h))
/** Where things are, for labels, signal ends and the camera. */
export const ANCHOR = {
  motor: [-0.55, 0.43, 0.1],
  chain: [-0.61, 0.3, -0.1],
  esc: [-0.55, 0.4, -0.28],
  radiator: [-0.47, 0.74, 0.03],
  pump: [-0.64, 0.7, 0.25],
  pack: [0.3, 0.23, 0.2],
  bms: [0.55, 0.22, 0.29],
  contactor: [-0.1, 0.24, 0.3],
  esp32: [0.61, 0.345, -0.24],
  talon: [0.67, 0.2, -0.06],
  cim: [0.76, 0.21, -0.2],
  pot: [0.64, 0.3, 0.0],
  wheel: [0.27, 0.9, 0.0],
  wheelBase: [0.47, 0.8, 0.0],
  screen: [0.375, 0.62, 0.22],
  teensy: boardToBody(9, 40, 14),
  pi: boardToBody(40, 30, -12),
  usbPort: boardToBody(-31, 40.7, 7.2),
  can: boardToBody(48.5, 64.3, 4),
  dac: boardToBody(-18, 79.6, 11.2),
  gland: dashToBody([GLAND.x, GLAND.y, -DASH.w / 2]),
} satisfies Record<string, V3>
