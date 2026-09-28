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
  [benmross/emulsion](https://github.com/benmross/emulsion).
- Where each image came from is kept privately, outside this repository.

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
