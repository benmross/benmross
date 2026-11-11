"""Bake the fixed backgrounds with Mesa/EGL, ModernGL, Pillow and ffmpeg.

Run from a Python environment with moderngl and Pillow installed. No browser,
model or network is used during rendering. The website ships only the outputs.
"""
import json
import math
from pathlib import Path
import subprocess
import time

import moderngl
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/media/emulsion'
SIZE, FPS, SECONDS = 960, 60, 9


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    presets = json.loads((ROOT / 'scripts/background-presets.json').read_text())
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    print('Offline renderer:', ctx.info['GL_RENDERER'], flush=True)
    def shader(name):
        return (ROOT / f'src/shaders/plate.{name}.glsl').read_text().replace(
            '#version 300 es', '#version 330').replace('precision highp float;', '')
    program = ctx.program(vertex_shader=shader('vert'), fragment_shader=shader('frag'))
    vao = ctx.vertex_array(program, [])
    target = ctx.simple_framebuffer((SIZE, SIZE), components=3)
    target.use()
    ctx.viewport = (0, 0, SIZE, SIZE)
    uniforms = {
        'uScale':'scale', 'uAngle':'angle', 'uSoft':'soft', 'uWarp':'warp', 'uDetail':'detail',
        'uMottle':'mottle', 'uPosX':'posx', 'uPosY':'posy', 'uExp':'exposure', 'uCon':'contrast',
        'uBlack':'black', 'uGam':'gamma', 'uVig':'vignette', 'uTexAmt':'texamt', 'uTexScale':'texscale',
        'uGrain':'grain', 'uGSize':'gsize', 'uGDens':'gdens', 'uGResp':'gresp', 'uBands':'bands',
        'uBlur':'blur', 'uStreak':'streak', 'uStreakAng':'streakang', 'uGloss':'gloss', 'uMotion':'flow',
        'uMid':'mid', 'uShape':'shape', 'uTex':'tex', 'uInvert':'invert', 'uChroma':'chroma',
    }
    def set_uniform(name, value):
        if name in program:
            program[name].value = value
    for preset in ('hero', 'satin'):
        start = time.monotonic()
        plate = presets['defaults'] | presets[preset]
        set_uniform('uRes', (SIZE, SIZE))
        set_uniform('uPS', 1.0)
        set_uniform('uSeed', 0.37)
        for name, key in uniforms.items():
            set_uniform(name, plate[key])
        for channel in ('C0', 'C1', 'C2'):
            color = plate[channel.lower()].lstrip('#')
            set_uniform('u'+channel, tuple(int(color[i:i+2],16)/255 for i in (0,2,4)))
        process = subprocess.Popen([
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
            '-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', f'{SIZE}x{SIZE}',
            '-framerate', str(FPS), '-i', '-', '-vf', 'vflip',
            '-an', '-c:v', 'libx264', '-preset', 'medium',
            '-crf', '24' if preset == 'hero' else '28',
            '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
            str(OUT / f'{preset}-loop.mp4'),
        ], stdin=subprocess.PIPE)
        try:
            for frame in range(FPS * SECONDS):
                # Exclude phase 2π: the next frame at the loop seam is phase 0.
                set_uniform('uPhase', frame / (FPS * SECONDS) * math.tau)
                vao.render(mode=moderngl.TRIANGLES, vertices=3)
                rgb = target.read(components=3, alignment=1)
                if frame == 0:
                    Image.frombytes('RGB',(SIZE,SIZE),rgb).transpose(Image.Transpose.FLIP_TOP_BOTTOM).save(
                        OUT / f'{preset}-poster.webp', quality=90)
                process.stdin.write(rgb)
                if frame % 60 == 0:
                    print(json.dumps({'preset': preset, 'frame': frame,
                                      'seconds': round(time.monotonic() - start, 1)}), flush=True)
        finally:
            process.stdin.close()
            code = process.wait()
        if code:
            raise RuntimeError(f'ffmpeg exited {code}')
        print(preset, 'complete', (OUT / f'{preset}-loop.mp4').stat().st_size, flush=True)
    ctx.release()


if __name__ == '__main__':
    main()
