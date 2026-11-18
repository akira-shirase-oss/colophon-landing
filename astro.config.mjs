// @ts-check
import { defineConfig } from 'astro/config'

// The one place the public address lives: canonical URLs, the sitemap, RSS and share images all derive from it.
const site = 'https://colophon.404human.dev'

// github-light-default draws comments in #6E7781, 4.06:1 on the code surface: one step darker (#57606A, the
// theme's own secondary text) clears AA. Every other token already does.
// Astro caches rendered Markdown in node_modules/.astro: after changing this, delete it before building.
const LIGHT_SWAPS = { '#6e7781': '#57606A' }
/** @type {import('shiki').ShikiTransformer} */
const aaOnSurface = {
  name: 'aa-on-surface',
  span(node) {
    const style = node.properties.style
    if (typeof style !== 'string') return
    node.properties.style = style.replace(/--shiki-light:(#[0-9a-f]{6})/i, (all, hex) => {
      const swap = LIGHT_SWAPS[hex.toLowerCase()]
      return swap ? `--shiki-light:${swap}` : all
    })
  },
}

// Static output: every page is plain HTML at build time, so search engines read it without running JavaScript.
// The few interactive pieces are small vanilla scripts.
export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  // Code is coloured through CSS variables (--shiki-light, --shiki-dark) instead of fixed colours, so its
  // tokens are drawn for the background they sit on. `npm run check` measures every token against the code
  // surface and fails below AA (4.5:1).
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light-default', dark: 'github-dark-default' },
      defaultColor: false,
      transformers: [aaOnSurface],
    },
  },
})
