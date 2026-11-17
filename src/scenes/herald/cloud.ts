import { positions, seeds, type Layout } from './layout'
import type { State } from './timeline'

/**
 * One cloud of points that keeps rearranging itself: a turning ball, a timeline, clusters by
 * source, and a 24-hour clock. Every point carries its place in all four, and the vertex shader
 * blends between neighbours with a per-point delay and a curved, turbulent flight, so the cloud
 * visibly reorganises rather than sliding. Raw WebGL2, additive points, emulsion grain.
 */

const VERT = /* glsl */ `#version 300 es
precision highp float;
in vec3 aCloud; in vec2 aLine; in vec2 aClus; in vec2 aClock; in vec4 aRnd; in float aTag; in float aGroup;
uniform vec2 uRes; uniform float uTime, uStage, uDpr, uScale;
uniform vec2 uMouse;
uniform vec3 uCloud;
uniform float uScan;
uniform vec3 uWave;
uniform float uEvid; uniform vec2 uEv[5]; uniform vec2 uAnswer; uniform float uPull;
uniform vec4 uClock; uniform float uHand;
uniform vec2 uFrom, uTo;
#define HIST 48
uniform float uHist[HIST]; uniform float uHistT, uHistDt;
out float vB;

vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
vec2 bez(vec2 a, vec2 c, vec2 b, float t) { return mix(mix(a, c, t), mix(c, b, t), t); }

vec2 cloudPos() {
  vec2 d = aCloud.xy - uCloud.xy;
  float r = length(d) / uCloud.z;
  // turns faster near the middle, like something with a centre of gravity
  vec2 p = uCloud.xy + rot(d, uTime * (0.07 + 0.05 * (1.0 - r)) + aCloud.z * 0.002);
  p += d * 0.05 * sin(uTime * 0.8 + aRnd.x * 6.283);
  return p;
}
vec2 at(int i) {
  if (i == 0) return cloudPos();
  if (i == 1) return aLine;
  if (i == 2) return aClus;
  return aClock;
}

void main() {
  float s = clamp(uStage, 0.0, 3.0);
  int i = int(min(floor(s), 2.0));
  float f = s - float(i);
  float t = clamp((f - aRnd.y * 0.4) / 0.6, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec2 A = at(i), B = at(i + 1);
  vec2 pos = mix(A, B, t);
  float mid = sin(3.14159 * t);
  vec2 dir = B - A;
  vec2 perp = normalize(vec2(-dir.y, dir.x) + 1e-4);
  pos += perp * mid * (aRnd.z - 0.5) * min(length(dir), 420.0) * 0.7;
  pos += vec2(sin(uTime * 1.3 + aRnd.w * 20.0 + pos.y * 0.012), cos(uTime * 1.1 + aRnd.x * 17.0 + pos.x * 0.011)) * mid * 30.0 * uScale;

  // always a little restless
  float amp = (1.3 + 5.0 * max(0.0, 1.0 - s)) * uScale;
  pos += vec2(sin(uTime * 0.7 + aRnd.x * 40.0 + pos.y * 0.02), cos(uTime * 0.6 + aRnd.y * 30.0 + pos.x * 0.02)) * amp;

  float b = 0.3 + 0.7 * aRnd.w * aRnd.w;
  b *= 0.72 + 0.28 * sin(uTime * (1.5 + aRnd.z * 2.0) + aRnd.x * 50.0);
  float size = (1.5 + 2.6 * aRnd.w) * uScale + mid * 1.2;

  float c0 = 1.0 - smoothstep(0.0, 1.0, s);
  if (c0 > 0.0) {
    float rr = length(aCloud.xy - uCloud.xy) / uCloud.z;
    b *= 1.0 + c0 * 1.8 * (1.0 - rr) * (1.0 - rr);
  }
  // evidence lights, the rest dims
  if (aTag >= 1.0 && aTag < 6.0) {
    b += uEvid * 2.4;
    size += uEvid * 9.0 * uScale;
  } else {
    b *= 1.0 - 0.5 * uEvid;
  }

  // couriers: carry evidence to the answer, and later each job's result out of the clock
  if (aTag >= 10.0) {
    float k = fract(aRnd.x * 7.0 + uTime * (0.32 + 0.3 * aRnd.y));
    float hot = 0.0;
    if (uPull > 0.0) {
      vec2 ev = uEv[int(aTag - 10.0)];
      vec2 c = mix(ev, uAnswer, 0.5) + perp * 0.0 + vec2(0.0, (aRnd.z - 0.5) * 70.0);
      pos = mix(pos, bez(ev, c, uAnswer, k), uPull);
      hot = uPull;
    }
    // in the clock, a courier shows only on trips that left the hand while a job was sending, so the
    // stream starts and stops at the hand and the last ones still finish their flight
    float ck2 = smoothstep(2.6, 2.95, s);
    if (ck2 > 0.0) {
      float left = uTime - k / (0.32 + 0.3 * aRnd.y);
      int j = left > uHistT ? 0 : min(int(floor((uHistT - left) / uHistDt)) + 1, HIST - 1);
      float on = step(0.04 + 0.92 * fract(aRnd.w * 13.7 + aRnd.z * 5.1), uHist[j]);
      float env = smoothstep(0.0, 0.05, k) * (1.0 - smoothstep(0.92, 1.0, k));
      if (on > 0.0) {
        vec2 c = mix(uFrom, uTo, 0.5) + vec2((aRnd.z - 0.5) * 90.0, -60.0 - aRnd.w * 80.0);
        pos = bez(uFrom, c, uTo, k);
        hot = 1.0;
      }
      b *= mix(1.0, on * env, ck2);
    }
    b += hot * (1.8 + 1.4 * sin(k * 3.14159)) * (ck2 > 0.0 ? smoothstep(0.0, 0.05, k) * (1.0 - smoothstep(0.92, 1.0, k)) : 1.0);
    size += hot * 1.8 * uScale;
  }

  // reading: a band of light sweeps along the timeline
  b += exp(-pow(pos.x - uScan, 2.0) / (2.0 * 900.0)) * 1.6 * step(0.5, s) * step(s, 1.5);

  // thinking: ripples run out from the question
  if (uWave.z > 0.0) {
    float d = distance(pos, uWave.xy);
    float r1 = mod(uTime * 520.0, 1600.0), r2 = mod(uTime * 520.0 + 800.0, 1600.0);
    b += (exp(-pow(d - r1, 2.0) / 3200.0) + exp(-pow(d - r2, 2.0) / 3200.0)) * uWave.z * 1.4;
  }

  // the clock: everything behind the hand has run; just behind it, it is running now
  float ck = smoothstep(2.4, 3.0, s);
  if (ck > 0.0) {
    vec2 d = aClock - uClock.xy;
    float r = length(d);
    if (r > uClock.z * 0.7) {
      float a = atan(d.x, -d.y);
      if (a < 0.0) a += 6.28318;
      float behind = uHand - a;
      float lit = behind >= 0.0 ? 1.25 : 0.5;
      b *= mix(1.0, lit, ck);
      if (behind >= 0.0) b += exp(-behind * 7.0) * 1.6 * ck;
    } else {
      b *= 1.0 + 0.5 * ck * (0.6 + 0.4 * sin(uTime * 1.7));
    }
  }

  // the pointer pushes points aside
  vec2 dm = pos - uMouse;
  float dd = length(dm) + 1e-3;
  pos += dm / dd * 34.0 * uScale * exp(-dd * dd / (2.0 * 80.0 * 80.0));

  vB = b;
  gl_PointSize = size * uDpr;
  vec2 c = pos / uRes;
  gl_Position = vec4(c.x * 2.0 - 1.0, 1.0 - c.y * 2.0, 0.0, 1.0);
}`

const FRAG = /* glsl */ `#version 300 es
precision highp float;
in float vB;
uniform float uTime, uFade;
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  float b = vB * exp(-r2 * 3.2) * uFade;
  vec3 deep = vec3(0.10, 0.18, 0.38), blue = vec3(0.357, 0.549, 1.0), ice = vec3(0.88, 0.92, 1.0);
  vec3 col = mix(deep, blue, smoothstep(0.0, 0.7, b));
  col = mix(col, ice, smoothstep(0.8, 2.0, b));
  float g = 0.45 + 1.1 * hash(gl_FragCoord.xy + fract(uTime * 7.0) * 113.0);
  vec3 rgb = col * min(b, 2.6) * 1.25 * g;
  o = vec4(rgb, max(rgb.r, max(rgb.g, rgb.b)));
}`

export type Cloud = {
  resize: (L: Layout, dpr: number) => void
  render: (s: State, extra: { time: number; mouse: [number, number]; from: [number, number]; to: [number, number] }) => void
  dispose: () => void
}

export function createCloud(canvas: HTMLCanvasElement, n: number): Cloud {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true })
  if (!gl) throw new Error('no webgl2')
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader')
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link')
  gl.useProgram(prog)
  const U = (name: string) => gl.getUniformLocation(prog, name)
  const u = {
    res: U('uRes'), time: U('uTime'), stage: U('uStage'), dpr: U('uDpr'), scale: U('uScale'), mouse: U('uMouse'),
    cloud: U('uCloud'), scan: U('uScan'), wave: U('uWave'), evid: U('uEvid'), ev: U('uEv'), answer: U('uAnswer'),
    pull: U('uPull'), clock: U('uClock'), hand: U('uHand'), from: U('uFrom'), to: U('uTo'), hist: U('uHist'), histT: U('uHistT'), histDt: U('uHistDt'), fade: U('uFade'),
  }
  const vao = gl.createVertexArray()!
  gl.bindVertexArray(vao)
  const bufs: WebGLBuffer[] = []
  const attr = (name: string, data: Float32Array, size: number) => {
    const loc = gl.getAttribLocation(prog, name)
    const b = gl.createBuffer()!
    bufs.push(b)
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    if (loc >= 0) {
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
    }
  }
  const sd = seeds(n)
  const rnd = new Float32Array(n * 4)
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) rnd[i * 4 + k] = sd[i * 8 + k]

  let L: Layout | null = null
  let dpr = 1
  let born = -1
  // how hard the jobs were sending over the last few seconds, newest first: hist[0] is now, hist[j]
  // the value at histT - (j - 1) * HIST_DT. Couriers read the slot from when they left the hand.
  const HIST = 48
  const HIST_DT = 0.08
  const hist = new Float32Array(HIST)
  let histT = -1
  const resize = (lay: Layout, d: number) => {
    L = lay
    dpr = d
    canvas.width = Math.round(lay.W * d)
    canvas.height = Math.round(lay.H * d)
    for (const b of bufs.splice(0)) gl.deleteBuffer(b)
    const P = positions(lay, n, sd)
    attr('aCloud', P.cloud, 3)
    attr('aLine', P.line, 2)
    attr('aClus', P.clus, 2)
    attr('aClock', P.clock, 2)
    attr('aRnd', rnd, 4)
    attr('aTag', P.tag, 1)
    attr('aGroup', P.group, 1)
  }

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE)

  const render: Cloud['render'] = (s, x) => {
    if (!L) return
    if (born < 0) born = x.time
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(u.res, L.W, L.H)
    gl.uniform1f(u.time, x.time)
    gl.uniform1f(u.fade, Math.min(1, (x.time - born) / 1.2))
    gl.uniform1f(u.stage, s.stage)
    gl.uniform1f(u.dpr, dpr)
    gl.uniform1f(u.scale, L.narrow ? 0.8 : 1)
    gl.uniform2f(u.mouse, x.mouse[0], x.mouse[1])
    gl.uniform3f(u.cloud, L.cloud.cx, L.cloud.cy, L.cloud.r)
    gl.uniform1f(u.scan, s.scan < 0 ? -1e5 : L.line.x0 + s.scan * (L.line.x1 - L.line.x0))
    const c = L.clus.chat
    gl.uniform3f(u.wave, c.x + c.w * 0.75, c.y + 80, s.wave)
    gl.uniform1f(u.evid, s.evid)
    gl.uniform2fv(u.ev, L.clus.ev.flatMap((e) => [e.x, e.y]))
    gl.uniform2f(u.answer, L.clus.answer.x, L.clus.answer.y)
    gl.uniform1f(u.pull, s.pull)
    gl.uniform4f(u.clock, L.clock.cx, L.clock.cy, L.clock.r0, L.clock.r1)
    gl.uniform1f(u.hand, s.stage > 2.5 ? s.hand : -10)
    gl.uniform2f(u.from, x.from[0], x.from[1])
    gl.uniform2f(u.to, x.to[0], x.to[1])
    const send = s.stage > 2.9 ? s.send : 0
    if (histT < 0 || x.time < histT - 1) {
      hist.fill(send)
      histT = x.time
    }
    while (x.time - histT >= HIST_DT) {
      hist.copyWithin(2, 1)
      hist[1] = hist[0]
      histT += HIST_DT
    }
    hist[0] = send
    gl.uniform1fv(u.hist, hist)
    gl.uniform1f(u.histT, histT)
    gl.uniform1f(u.histDt, HIST_DT)
    gl.drawArrays(gl.POINTS, 0, n)
  }

  return {
    resize,
    render,
    dispose: () => {
      for (const b of bufs) gl.deleteBuffer(b)
      gl.deleteProgram(prog)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
