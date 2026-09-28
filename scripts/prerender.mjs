// Runs after the client build. Renders the page into dist/index.html, so the words on the site
// are in the HTML Google fetches rather than only in what the script paints afterwards, and
// writes robots.txt and a sitemap whose lastmod is the day the site was built.
import { readFileSync, rmSync, writeFileSync } from 'node:fs'

const { render, site } = await import('../dist-ssr/entry-server.js')
const file = 'dist/index.html'
const html = readFileSync(file, 'utf8')
if (!html.includes('<div id="root"></div>')) throw new Error('no empty #root in dist/index.html')
writeFileSync(file, html.replace('<div id="root"></div>', `<div id="root">${render()}</div>`))

const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site.url}</loc><lastmod>${today}</lastmod></url>
  <url><loc>${new URL('/cv.pdf', site.url).href}</loc><lastmod>${today}</lastmod></url>
</urlset>
`,
)
writeFileSync('dist/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site.url).href}\n`)
rmSync('dist-ssr', { recursive: true, force: true })
