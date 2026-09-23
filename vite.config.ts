import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Preload the one font file every page paints with, so the name does not wait on CSS first. */
function preloadFont(): Plugin {
  return {
    name: 'preload-font',
    transformIndexHtml(html, ctx) {
      const font = Object.keys(ctx.bundle ?? {}).find((f) => /archivo.*\.woff2$/.test(f))
      if (!font) return html
      return {
        html,
        tags: [{ tag: 'link', attrs: { rel: 'preload', href: `/${font}`, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head' }],
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), preloadFont()],
  build: { outDir: 'dist', assetsInlineLimit: 0 },
})
