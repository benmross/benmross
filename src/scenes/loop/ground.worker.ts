import { buildGround } from './ground'

// Builds the Loop scene's ground off the main thread and hands the arrays back without copying.
self.onmessage = (e: MessageEvent<{ G: number; mobile: boolean }>) => {
  const a = buildGround(e.data.G, e.data.mobile)
  ;(self as unknown as Worker).postMessage(a, [a.position.buffer, a.normal.buffer, a.color.buffer])
}
