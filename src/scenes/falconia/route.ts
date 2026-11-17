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
  // between the ridges, then through the gap left of the tall peak
  { t: 0.5, pos: [-0.27, 0.14, 0.1], look: [-0.3, 0.12, -0.6], fov: 78 },
  { t: 0.58, pos: [-0.32, 0.12, -0.5], look: [-0.3, 0.12, -1.1], fov: 78 },
  // out of the gap, pull up toward the crescent and look down onto its rim
  { t: 0.66, pos: [-0.15, 0.32, -1.0], look: [0.0, 0.14, -1.7], fov: 74 },
  { t: 0.75, pos: [0.0, 0.8, -1.35], look: [0.0, 0.1, -1.75], fov: 62 },
  // rise and drift back, tilting down until the whole table is under the camera.
  // It never turns around: the crescent stays at the top of the frame.
  { t: 0.86, pos: [0.0, 2.4, -0.9], look: [0.0, 0.0, -1.3], fov: 50 },
  { t: 1.0, pos: [0.0, 5.8, 0.55], look: [0.0, 0.0, -0.15], fov: 36 },
]

/**
 * The surface changes twice. First a sweep crosses the table from the crescent end and
 * turns the wireframe into the altimetry colouring, finishing halfway down the dive so the
 * second half of the descent is over the heightmap. Then, once the camera has levelled off,
 * a second front starts beneath it and runs ahead along the table, leaving the textured scan
 * behind it.
 */
export const SWEEP: [number, number] = [0.12, 0.215]
/** Progress over which the scan replaces the altimetry, and the z the front runs between. */
export const SCAN: [number, number] = [0.31, 0.4]
export const SCAN_Z: [number, number] = [2.0, -2.0]

/**
 * The rover's track: a closed survey loop on the flat stretch of the top-right of the
 * table (seen from above with the crescent at the top), between the crescent and the
 * slope up to the right-hand rim. Points are (x, z) on the table, driven in order and
 * back to the first; the rover stops for a moment once a lap.
 */
export const ROVER_PATH: [number, number][] = [
  [0.2, -0.45],
  [0.45, -0.4],
  [0.6, -0.55],
  [0.58, -0.85],
  [0.45, -1.0],
  [0.25, -0.95],
  [0.15, -0.72],
]
/** Rover size: world units per rover body length (about 0.11 long at 0.13). */
export const ROVER_SCALE = 0.13
/** Cruise speed along the track in world units per second. */
export const ROVER_SPEED = 0.07

/** Vertical scale on the scan, so centimetres of sand read as mountains from drone height. */
export const EXAGGERATION = 2.6

/** Lowest the camera may get above the surface beneath it. */
export const CLEARANCE = 0.07

/**
 * v^2 / g for the notional airspeed: bank = atan(BANK * curvature), curvature in 1/units.
 * At 0.3, a turn of radius 0.5 banks about 31 degrees.
 */
export const BANK = 0.3
