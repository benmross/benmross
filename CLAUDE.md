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

The GNSS section is an illustration only, on Natural Earth outlines. It contains no data or code from that project.

## Rules for this repository

- **README.md is Ben's GitHub profile README**, because this repo is `benmross/benmross`.
  It is not documentation for the site. Never overwrite it; site notes go in this file.

- No AI co-author trailer on commits.
- Text is Ben's or plain fact. No project write-ups, no marketing copy, no em dashes.
- Nothing from ARL: the GNSS graphic stays a generic illustration.
- No private repository links (Sparrows, gnss-dash). No photos with identifiable
  students' faces.
