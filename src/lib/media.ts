import variants from '../media-variants.json'

const V = variants as Record<string, number>

/** src plus a srcset with the 1200px copy, when scripts/variants.py made one. */
export function img(src: string, sizes = '(max-width: 820px) 100vw, 60vw') {
  const w = V[src]
  if (!w) return { src }
  return { src, srcSet: `${src.replace(/\.webp$/, '-1200.webp')} 1200w, ${src} ${w}w`, sizes }
}
