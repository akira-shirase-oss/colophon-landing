// Which addresses a deploy changes for readers and search engines, found by comparing the build in dist/ with
// the live site, page by page. The site's words come from its Colophon project, so a publish in the Studio
// changes pages without changing a file here: `git diff` can't say which. Run it before the upload:
//
//   node scripts/changed-pages.mjs [--out changed-urls.txt] [site-url]
//
// It prints one address a line: a page whose HTML differs from the live one (the release marker aside), a page
// that is new, and a page the live sitemap lists that the build no longer has (so engines see it go). The
// deploy sends that list to IndexNow after the upload (scripts/indexnow.mjs --urls-file). Bounded: at most
// MAX_PAGES pages, CONCURRENT requests at a time, a TIMEOUT_MS deadline each. A page that can't be read counts
// as changed, so nothing is missed by a failed read. It never fails a deploy: exit 0 (2 for a usage error).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MAX_PAGES = 5000
const CONCURRENT = 6
const TIMEOUT_MS = 15000
const root = fileURLToPath(new URL('..', import.meta.url))

/** A page as it is compared: without the marker of the release it was built from, which every publish moves. */
export const comparable = (html) => html.replace(/<meta name="colophon-generation" content="\d+">/, '')

export const locs = (sitemap) => [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])

/**
 * The addresses that change.
 * @param {string[]} built  every address in the new sitemap
 * @param {string[]} live   every address in the live sitemap
 * @param {(url: string) => Promise<string | undefined>} builtPage  the new page's HTML
 * @param {(url: string) => Promise<string | undefined>} livePage   the live page's HTML, undefined when unread
 */
export async function changedPages(built, live, builtPage, livePage) {
  const changed = new Set(live.filter((url) => !built.includes(url)))
  const queue = [...built]
  const work = async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      const [now, was] = await Promise.all([builtPage(url), livePage(url)])
      if (now === undefined || was === undefined || comparable(now) !== comparable(was)) changed.add(url)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENT }, work))
  return [...changed].sort()
}

async function main() {
  const args = process.argv.slice(2)
  const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : undefined
  const site = (args.find((a, i) => /^https?:\/\//.test(a) && args[i - 1] !== '--out') ?? 'https://colophon.404human.dev').replace(/\/+$/, '')
  const sitemap = join(root, 'dist', 'sitemap.xml')
  if (!existsSync(sitemap) || (args.includes('--out') && !out)) {
    console.error('changed-pages: run it after `npm run build`; --out takes a file name')
    process.exit(2)
  }
  const read = async (url) => {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'colophon-landing-deploy' }, cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) })
      return response.ok ? await response.text() : undefined
    } catch {
      return undefined
    }
  }
  const built = locs(readFileSync(sitemap, 'utf8')).slice(0, MAX_PAGES)
  const live = locs((await read(`${site}/sitemap.xml`)) ?? '')
  // An address in the sitemap is the public site's; the file is its path under dist/, the page its path on `site`.
  const pathOf = (url) => new URL(url).pathname
  const builtPage = async (url) => {
    const file = join(root, 'dist', pathOf(url), 'index.html')
    return existsSync(file) ? readFileSync(file, 'utf8') : undefined
  }
  const changed = await changedPages(built, live, builtPage, (url) => read(`${site}${pathOf(url)}`))
  console.error(`changed-pages: ${changed.length} of ${built.length} page(s) differ from ${site}`)
  if (out) writeFileSync(out, changed.join('\n') + (changed.length ? '\n' : ''))
  else if (changed.length) console.log(changed.join('\n'))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
