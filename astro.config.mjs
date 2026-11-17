// @ts-check
import { defineConfig } from 'astro/config'
import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import svelte from '@astrojs/svelte'
import tailwindcss from '@tailwindcss/vite'

// The one place the public address lives: canonical URLs, the sitemap, RSS and share images all derive from it.
const site = 'https://colophon.404human.dev'

/**
 * Svelte here only renders at build time (the Studio illustrations in "What's built"); nothing is
 * hydrated. Two leftovers of hydration are tidied once the build is done:
 * - the integration always builds its client renderer; nothing loads it, so any script in _astro/
 *   that no page or other script names is removed, and pages keep only their small inline scripts;
 * - Svelte marks its server output with comments (`<!--[-->`, `<!---->`…) for hydration to find;
 *   a page with no island to hydrate doesn't need them, so they are dropped from it.
 * @type {import('astro').AstroIntegration}
 */
const staticSvelte = {
  name: 'static-svelte',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const root = fileURLToPath(dir)
      const files = await readdir(root, { recursive: true })
      const text = await Promise.all(
        files.filter((f) => /\.(html|js)$/.test(f)).map(async (f) => ({ f, body: await readFile(join(root, f), 'utf8') })),
      )
      for (const f of files.filter((f) => /^_astro[\\/][^\\/]+\.js$/.test(f))) {
        const name = f.split(/[\\/]/).pop()
        if (text.some((t) => t.f !== f && t.body.includes(name))) continue
        await rm(join(root, f))
        logger.info(`removed ${f}: nothing loads it`)
      }
      for (const { f, body } of text) {
        if (!f.endsWith('.html') || body.includes('<astro-island')) continue
        const bare = body.replace(/<!--(?:\[-?\d*|\]|)-->/g, '')
        if (bare !== body) await writeFile(join(root, f), bare)
      }
    },
  },
}

// Static output: every page is plain HTML at build time, so search engines read it without running JavaScript.
// The few interactive pieces are small vanilla scripts. Svelte renders the Studio illustrations in
// "What's built" at build time only (src/studio-ui/, never hydrated), and Tailwind builds their
// stylesheet from those files alone (src/studio-ui/studio.css).
export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [svelte(), staticSvelte],
  vite: { plugins: [tailwindcss()] },
})
