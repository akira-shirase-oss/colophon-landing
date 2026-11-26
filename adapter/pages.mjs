// A Cloudflare Pages adapter, the few lines of one this site needs.
//
// The site is static: `astro build` writes plain HTML into dist/ and `wrangler pages deploy dist` uploads it.
// Draft preview needs three routes rendered on demand, and Astro renders on demand only through an adapter.
// Astro's own Cloudflare adapter deploys to Workers and no longer supports Pages (its docs, v13 and later), so
// this one writes what Pages reads, and nothing else about the build changes:
//
//   dist/                  every prerendered page and asset, exactly where a build without an adapter puts them
//   dist/_worker.js/       the on-demand routes as one module (Pages "advanced mode"); wrangler bundles it
//   dist/_routes.json      the only paths that reach the worker; Pages serves every other request from the
//                          static files without running any code
//
// `onDemand` lists the path prefixes a route may opt out of prerendering under. A route outside them fails the
// build: a page that should be static can't become a server route by accident.
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { passthroughImageService } from 'astro/config'

const NAME = 'colophon-pages'

/** What the build machine's project folder is called inside the worker (see astro:build:done below). */
export const BUILD_ROOT = 'file:///site/'

/** The `_routes.json` patterns for the on-demand routes: a static route as itself, a dynamic one as its prefix. */
export function routePatterns(patterns) {
  const out = new Set()
  for (const pattern of patterns) {
    const dynamic = pattern.indexOf('[')
    if (dynamic < 0) {
      const path = pattern.replace(/\/+$/, '') || '/'
      out.add(path)
      if (path !== '/') out.add(`${path}/`)
    } else {
      out.add(`${pattern.slice(0, dynamic)}*`)
    }
  }
  const all = [...out]
  // A path a wildcard already covers needs no rule of its own.
  return all.filter((p) => !all.some((w) => w !== p && w.endsWith('*') && p.startsWith(w.slice(0, -1)))).sort()
}

export default function pages({ onDemand = [] } = {}) {
  /** @type {string[]} */
  let served = []
  let root = ''
  let serverDir = new URL('file:///')
  let clientDir = new URL('file:///')
  return {
    name: NAME,
    hooks: {
      'astro:config:setup': ({ command, config, updateConfig }) => {
        root = config.root.href
        updateConfig({
          build: {
            client: new URL('./', config.outDir),
            server: new URL('./_worker.js/', config.outDir),
            serverEntry: 'index.js',
            redirects: false,
          },
          // Nothing on the site goes through astro:assets; without these the worker would carry sharp and
          // Astro's image endpoint.
          image: {
            service: passthroughImageService(),
            ...(command === 'build' ? { endpoint: { route: '/_image', entrypoint: fileURLToPath(new URL('./no-image.mjs', import.meta.url)) } } : {}),
          },
          vite: {
            ssr: { noExternal: true },
            // Astro's runtime asks `process.env.NODE_ENV` in places, and a Pages Function has no `process`
            // unless the project turns on Node compatibility. An empty one answers the question (Astro's own
            // Cloudflare adapter does the same), so the worker needs no setting in the Cloudflare dashboard.
            environments: { ssr: { build: { rolldownOptions: { output: { banner: 'globalThis.process ??= {}; globalThis.process.env ??= {};' } } } } },
            // A Function has no process.env. The three public values src/lib/colophon.ts reads are written
            // into the code as the build saw them, so a preview reads the project the build read.
            define: Object.fromEntries(
              ['COLOPHON_API', 'COLOPHON_PROJECT', 'COLOPHON_ENVIRONMENT'].map((name) => [`process.env.${name}`, JSON.stringify(process.env[name]) ?? 'undefined']),
            ),
          },
        })
      },
      'astro:routes:resolved': ({ routes }) => {
        const live = routes.filter((route) => route.origin === 'project' && !route.isPrerendered && route.type !== 'redirect')
        const stray = live.filter((route) => !onDemand.some((prefix) => route.pattern === prefix || route.pattern.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)))
        if (stray.length > 0) {
          throw new Error(`${NAME}: only routes under ${onDemand.join(', ')} may render on demand; these would too: ${stray.map((r) => r.pattern).join(', ')}`)
        }
        served = live.map((route) => route.pattern)
      },
      'astro:config:done': ({ config, setAdapter }) => {
        serverDir = config.build.server
        clientDir = config.build.client
        setAdapter({
          name: NAME,
          entrypointResolution: 'auto',
          serverEntrypoint: fileURLToPath(new URL('./worker.mjs', import.meta.url)),
          supportedAstroFeatures: { staticOutput: 'stable', hybridOutput: 'stable', serverOutput: 'stable', sharpImageService: 'unsupported' },
        })
      },
      'astro:build:done': async () => {
        if (served.length === 0) return
        // Astro's manifest names the build's own directories, and keys each component's scripts by its source
        // file's absolute path. Nothing reads a file at run time, but the worker would carry the build
        // machine's paths. Every one becomes the same path under a fixed root, so the keys still match.
        const folder = fileURLToPath(root)
        const forms = [pathToFileURL(folder).href, folder, JSON.stringify(folder).slice(1, -1)]
        for (const name of await readdir(serverDir, { recursive: true })) {
          if (!/\.m?js$/.test(name)) continue
          const file = new URL(name, serverDir)
          const text = await readFile(file, 'utf8')
          const scrubbed = forms.reduce((out, form, i) => out.replaceAll(form, i === 0 ? BUILD_ROOT : new URL(BUILD_ROOT).pathname), text)
          if (scrubbed !== text) await writeFile(file, scrubbed)
        }
        const include = routePatterns(served)
        await writeFile(new URL('./_routes.json', clientDir), `${JSON.stringify({ version: 1, include, exclude: [] }, null, 2)}\n`)
      },
    },
  }
}
