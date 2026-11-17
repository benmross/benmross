/**
 * Shared limits for the WebGL scenes, so a weak GPU, a 5K screen or a slow phone gets a
 * scene it can draw instead of one that drops to a few frames a second.
 */

let probed: boolean | null = null

/** Whether WebGL2 works. Probed once; the probe's context is released at once, since browsers cap live contexts. */
export function webgl2() {
  if (probed !== null) return probed
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    probed = !!gl
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    probed = false
  }
  return probed
}

/**
 * Most device pixels a scene draws per frame. A 1440 x 900 laptop at its usual cap is about
 * 4 million, so laptops keep full sharpness; 4K and 5K screens are held to the same cost.
 */
const PIXEL_BUDGET = 4.2e6

/** Device pixel ratio for a w x h CSS-pixel canvas: under `cap`, and under the pixel budget. */
export function pixelRatio(w: number, h: number, cap: number, scale = 1) {
  const dpr = Math.min(window.devicePixelRatio || 1, cap)
  const budget = Math.sqrt(PIXEL_BUDGET / Math.max(1, w * h))
  return Math.max(0.5, Math.min(dpr, budget) * scale)
}

/**
 * Watches frame times and lowers resolution when the device cannot keep up. It steps down
 * (1, 0.75, 0.55) after a run of slow frames and never steps back up, so it cannot oscillate.
 * Frames longer than 250 ms are stalls (a tab switch, a load), not a measure of drawing cost.
 */
export function governor(onChange: (scale: number) => void) {
  const STEPS = [1, 0.75, 0.55]
  let step = 0
  let times: number[] = []
  let skip = 20 // the first frames compile shaders and upload textures
  return {
    get scale() {
      return STEPS[step]
    },
    frame(dtMs: number) {
      if (step === STEPS.length - 1) return
      if (skip > 0) return void skip--
      if (dtMs > 250) return
      times.push(dtMs)
      if (times.length < 40) return
      const sorted = times.slice().sort((a, b) => a - b)
      times = []
      // median over ~28 ms means under ~35 fps
      if (sorted[sorted.length >> 1] > 28) {
        step++
        skip = 10
        onChange(STEPS[step])
      }
    },
  }
}

let loaded: Promise<void> | null = null

/**
 * Resolves once the page has loaded and the main thread has a quiet moment, so building a
 * 3D scene does not compete with the first paint, the font or hydration.
 */
export function afterLoad(): Promise<void> {
  if (loaded) return loaded
  loaded = new Promise<void>((done) => {
    const idle = () => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      if (ric) ric(() => done(), { timeout: 1200 })
      else setTimeout(done, 150)
    }
    if (document.readyState === 'complete') idle()
    else window.addEventListener('load', idle, { once: true })
  })
  return loaded
}
