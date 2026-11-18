// The hero painting, shared by the <picture> in Hero.astro and the preloads in pages/index.astro, so
// the browser picks the same file for both and fetches it once.

/** Phones get a portrait crop around the farmhouse (800 × 1200 from the original's x 949–1749):
 *  the hero is taller than wide there, so the landscape's sides would never be seen. */
export const heroPhone = { media: '(max-width: 809px)', src: '/images/hero-portrait.webp', width: 800, height: 1200 }

/** Wider screens get the painting at three widths (the original is 2326 × 1200). */
export const heroWide = {
  media: '(min-width: 810px)',
  srcset: '/images/hero-1200.webp 1200w, /images/hero-1800.webp 1800w, /images/hero.webp 2326w',
  /** It covers a box as wide as the viewport and as tall as the hero (600–920px), so it is drawn at
   *  whichever is larger: the viewport's width, or the hero's height times the painting's 1.94 ratio. */
  sizes: 'max(100vw, clamp(1163px, 194vh, 1784px))',
}
