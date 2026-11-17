# benmross.com

Source for benmross.com. One scrolling page: a section per project, each with its own
colour and its own scroll-driven visual.

Vite, React, TypeScript, Motion and Lenis. Static output in `dist/`.

```bash
npm install
npm run dev
npm run build
```

- `src/content.ts` holds every word on the site. Edit text there, not in components.
- `src/scenes/` holds one visual per project. The canvas scenes (Herald, BenGPT, GNSS)
  are drawn from code; the others use real screenshots and renders in `public/media/`.
- `src/shaders/` are emulsion's own shaders, copied unchanged from
  [benmross/emulsion](https://github.com/benmross/emulsion). They are used offline
  by `scripts/render-backgrounds.py` and `scripts/background-presets.json` to bake
  the fixed hero and Satin assets: 9 seconds, 60 FPS, H.264, 960 × 960.
  Only the Emulsion preview plays its cached Satin loop with a poster and
  `object-fit: cover`. The hero uses its static WebP poster; the page-wide grain
  texture is static. Playback pauses offscreen/in hidden tabs; Reduce Motion
  uses only the poster.
  Regeneration needs ffmpeg, ModernGL, Pillow and Mesa/EGL. It is not part of the normal site build.
- Where each image came from is kept privately, outside this repository.
- The Falconia scene is a scroll-driven WebGL flight (three.js, loaded only near the
  section) over the Scaniverse scan of the terrain table: wireframe first, a sweep to the
  scan coloured by height like the altimetry render (held for the second half of the dive),
  then a second front that runs ahead of the levelled-off camera leaving the textured scan.
  A model of the Pi rover (`src/scenes/falconia/rover.ts`, built from the photo) drives with
  scroll (ROVER_DRIVE), left wheels up the tall peak's flank, then right wheels into the big
  round hole, sitting on the scan through its wheel contacts. The only
  photo is the symposium finale (Ben, 16 Nov 2026). Route, sweeps, rover track and
  vertical exaggeration are in `src/scenes/falconia/route.ts`. Speed, height, attitude and zoom are baked once and smoothed; attitude comes from
  the track (nose along travel at low level, bank from turn rate), not animated over time. Reduce Motion or no WebGL
  shows the symposium photo. `window.__falconia(t, true)` holds the camera at
  progress `t` for screenshots; `window.__falconiaPick(x, y)` gives the point on the scan under a screen position. The models in `public/media/falconia/model/` come from
  "Falconia V3.zip" in Drive via `scripts/falconia-model/build.sh` (level, crop, simplify,
  WebP texture, meshopt).
- The Loop scene (`src/scenes/Loop.tsx`, `src/scenes/loop/`) replays an Arm Pilot session against
  scroll: the operator's phone (or, in the tracker comparison, a stereo or mono hand or the marker
  wand) on the left, the rover arm on the right. At the end the operator panel goes, Mars-like ground
  spreads out from under the rover, and the camera swings to a base station table of five monitors
  running the Delivery-mission console (`src/scenes/loop/base.ts`): the screens are drawn on canvases,
  Arm Operator from the live joint angles, and Driver and Drone are render targets from cameras on and
  above the rover. The arm is never animated by hand: `scripts/loop-track/bake.py`
  feeds every phone packet through armtrack's own controller (clutch, IK, 0.5 rad/s joint caps) and
  writes `public/media/loop/track.json`. Record a real session with
  `armtrack phone --record session.jsonl` and bake it with
  `uv run --project ../stereo-hand python scripts/loop-track/bake.py session.jsonl [--trim A B]`;
  `--scripted` rebuilds the stand-in. Act boundaries and the track seconds each act plays are in
  `src/scenes/loop/timeline.ts`. `window.__loop(t)` holds the scene at progress `t`. Reduce Motion or
  no WebGL shows a still from the armtrack demo. The console screens are drawn, not screenshots: the
  team repositories are private. The scripted session has no Home press, on Ben's request (16 Nov 2026).
- The Kart scene (`src/scenes/Kart.tsx`, `src/scenes/kart/`) is a kart modelled from photographs
  drifting through a turn; time slows to about 0.04x and the camera tours the parts, slips in through
  the gland where the wheel's USB cable enters the dashboard case, flies millimetres above the real
  mainboard (along the USB pair, under the Teensy between its sockets, along the CAN pair), climbs out
  into a see-through kart with every signal running, and lets the kart drive off. The tour is one
  baked path (`stage.ts`): keys in `timeline.ts` KEYS, timed by how far each stretch feels (distance
  over distance to what the camera looks at), speed and zoom blurred like the Falconia flight. The board
  comes from github.com/PHS-SMCS/SMCSKart-Mainboard (public): `python3 -I scripts/kart-board/extract.py
  <SMCSKart-Mainboard.kicad_pcb> public/media/kart/board.json`, built at real size by `board.ts`.
  `window.__kart(t)` holds the scene at progress `t`.

## Search and link previews

- `npm run build` prerenders the page into `dist/index.html` (`src/entry-server.tsx`,
  `scripts/prerender.mjs`) and the client hydrates it, so the text is in the HTML Google
  fetches. Anything read from `window` or `document` has to stay inside an effect, or
  hydration will mismatch.
- Title, description, canonical, Open Graph and schema.org data come from `site` in
  `src/content.ts` through the `seo()` plugin in `vite.config.ts`. The canonical host is
  the apex, `benmross.com`, the Vercel primary domain since 28 Sep 2026; www 308s to it.
- `robots.txt` and `sitemap.xml` are written at build time, with lastmod set to the build day.
- `public/og.jpg` is rendered from `scripts/og-image.html` (headless Chrome at 2x, then
  scaled to 1200x630). The PNG and ICO favicons are rendered from `public/favicon.svg`.
- Vercel Web Analytics loads from `/p/s.js` and reports to `/p/view`, rewritten in
  `vercel.json` to `/_vercel/insights/`. EasyPrivacy blocks that path by name, and
  Ben chose on 28 Sep 2026 to count page views from blocker users too.
- `vercel.json` redirects the old site's `/cv` and `/documents/*` to `/cv.pdf`.

The GNSS section is an illustration only, on Natural Earth outlines. It contains no data or code from that project.

## Rules for this repository

- **README.md is Ben's GitHub profile README**, because this repo is `benmross/benmross`.
  It is not documentation for the site. Never overwrite it; site notes go in this file.

- No AI co-author trailer on commits.
- Text is Ben's or plain fact. No project write-ups, no marketing copy, no em dashes.
- Nothing from ARL: the GNSS graphic stays a generic illustration.
- No private repository links (Sparrows, gnss-dash). No photos with identifiable
  students' faces.
