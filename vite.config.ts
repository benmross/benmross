import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { projects, site } from './src/content.ts'

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

/**
 * Title, description, canonical, link-preview tags and schema.org data, all from `content.ts`.
 * The ProfilePage/Person data is what lets Google tie this page to the GitHub and LinkedIn
 * profiles and show "Ben Ross" rather than the bare domain as the site name.
 */
function seo(): Plugin {
  const image = new URL('/og.jpg', site.url).href
  const person = {
    '@type': 'Person',
    '@id': `${site.url}#person`,
    name: site.name,
    url: site.url,
    email: `mailto:${site.email}`,
    affiliation: { '@type': 'CollegeOrUniversity', name: 'University of Maryland', url: 'https://umd.edu' },
    sameAs: site.links.filter((l) => l.href.startsWith('http')).map((l) => l.href),
    knowsAbout: [...new Set(projects.flatMap((p) => p.stack.split(', ')))],
  }
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${site.url}#website`, name: site.name, alternateName: 'benmross.com', url: site.url },
      {
        '@type': 'ProfilePage',
        '@id': `${site.url}#page`,
        url: site.url,
        name: site.title,
        description: site.description,
        isPartOf: { '@id': `${site.url}#website` },
        mainEntity: person,
        hasPart: projects.map((p) => ({
          '@type': 'CreativeWork',
          name: p.title,
          url: `${site.url}#${p.id}`,
          description: p.blurb,
          ...(p.links?.[0]?.href.startsWith('http') ? { sameAs: p.links.map((l) => l.href) } : {}),
        })),
      },
    ],
  }
  const meta = (attrs: Record<string, string>) => ({ tag: 'meta', attrs, injectTo: 'head' as const })
  return {
    name: 'seo',
    transformIndexHtml: () => [
      { tag: 'title', children: site.title, injectTo: 'head' },
      meta({ name: 'description', content: site.description }),
      { tag: 'link', attrs: { rel: 'canonical', href: site.url }, injectTo: 'head' },
      meta({ name: 'author', content: site.name }),
      meta({ property: 'og:type', content: 'profile' }),
      meta({ property: 'og:site_name', content: site.name }),
      meta({ property: 'og:title', content: site.title }),
      meta({ property: 'og:description', content: site.description }),
      meta({ property: 'og:url', content: site.url }),
      meta({ property: 'og:image', content: image }),
      meta({ property: 'og:image:width', content: '1200' }),
      meta({ property: 'og:image:height', content: '630' }),
      meta({ property: 'og:image:alt', content: site.name }),
      meta({ property: 'og:locale', content: 'en_US' }),
      meta({ property: 'profile:first_name', content: site.name.split(' ')[0] }),
      meta({ property: 'profile:last_name', content: site.name.split(' ').slice(1).join(' ') }),
      meta({ name: 'twitter:card', content: 'summary_large_image' }),
      meta({ name: 'twitter:title', content: site.title }),
      meta({ name: 'twitter:description', content: site.description }),
      meta({ name: 'twitter:image', content: image }),
      { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(graph), injectTo: 'head' },
    ],
  }
}

export default defineConfig({
  plugins: [react(), preloadFont(), seo()],
  build: { outDir: 'dist', assetsInlineLimit: 0 },
})
