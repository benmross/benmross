/**
 * The flight over the Falconia scan, in world units after the vertical exaggeration.
 * The table is about 3.0 wide (x) by 3.5 long (z); the big crescent rim is at -z,
 * the river at +z, and the two ridges sit either side of x = -0.2 between z = -0.8 and 0.1.
 *
 * `t` is scroll progress through the section. Each key has a camera position, a point
 * it looks at, and a field of view; the camera follows centripetal Catmull-Rom curves
 * through them.
 */
export type Vec3 = readonly [number, number, number]
export type Key = { t: number; pos: Vec3; look: Vec3; fov: number }

export const KEYS: Key[] = [
  // aerial: the wireframe arrives, high and a little off-axis
  { t: 0.0, pos: [2.2, 6.0, 4.6], look: [0, 0, 0.1], fov: 30 },
  { t: 0.1, pos: [0.9, 4.4, 3.4], look: [0, 0, 0.2], fov: 32 },
  // the dive: nose down toward the river end
  { t: 0.2, pos: [0.1, 2.1, 2.0], look: [-0.1, 0, 0.9], fov: 44 },
  { t: 0.27, pos: [-0.15, 0.72, 1.45], look: [-0.2, 0.0, 0.55], fov: 60 },
  // pitch up and level off over the river
  { t: 0.33, pos: [-0.22, 0.22, 1.1], look: [-0.25, 0.13, 0.3], fov: 72 },
  { t: 0.4, pos: [-0.25, 0.16, 0.7], look: [-0.22, 0.13, -0.1], fov: 76 },
  // between the ridges
  { t: 0.5, pos: [-0.25, 0.15, 0.15], look: [-0.2, 0.13, -0.65], fov: 78 },
  { t: 0.6, pos: [-0.15, 0.16, -0.45], look: [0.2, 0.15, -1.1], fov: 78 },
  // bank right past the peak and the white crater, then left along the crescent
  { t: 0.68, pos: [0.25, 0.3, -0.85], look: [0.1, 0.25, -1.6], fov: 74 },
  { t: 0.76, pos: [0.3, 0.5, -1.05], look: [-0.35, 0.15, -1.5], fov: 68 },
  // climb out over the rim and turn back to see the whole thing
  { t: 0.86, pos: [-0.7, 1.4, -2.3], look: [0, 0, -0.6], fov: 50 },
  { t: 1.0, pos: [-2.0, 4.6, -4.2], look: [0, -0.1, 0], fov: 34 },
]

/** Where the scan replaces the wireframe: the sweep crosses the table between these progress values. */
export const SWEEP: [number, number] = [0.17, 0.34]

/** Vertical scale on the scan, so centimetres of sand read as mountains from drone height. */
export const EXAGGERATION = 2.6

/** Lowest the camera may get above the surface beneath it. */
export const CLEARANCE = 0.07
