// Loads every built page in headless Chromium with the headers from dist/_headers and fails on any
// Content-Security-Policy violation, page error, failed request or broken image. It also clicks
// the FAQ, the feature tabs, the Phase/Proof switch and the phone menu, which proves the hashed
// inline scripts actually ran.
//
//   npm run build && npm run check:browser
//   node scripts/check-csp-browser.mjs --mutate   # serves a CSP with the script hashes removed; must fail
//
// Playwright is not a dependency of this repo. Install it (npm i -D playwright && npx playwright
// install chromium), or point PLAYWRIGHT_MODULE at an existing node_modules/playwright directory.
import { createServer } from 'node:http'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, normalize, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const mutate = process.argv.includes('--mutate')

let playwright
try {
  playwright = await import(
    process.env.PLAYWRIGHT_MODULE ? pathToFileURL(join(process.env.PLAYWRIGHT_MODULE, 'index.mjs')).href : 'playwright'
  )
} catch {
  console.error('check-csp-browser: Playwright not found. Install it, or set PLAYWRIGHT_MODULE (see the top of this file).')
  process.exit(2)
}

// ---------------------------------------------------------------------------------------------
// A static server for dist/ that applies _headers the way Cloudflare Pages does for these rules.

const rules = []
for (const line of readFileSync(join(dist, '_headers'), 'utf8').split(/\r?\n/)) {
  const t = line.trim()
  if (t === '' || t.startsWith('#')) continue
  if (!/^\s/.test(line)) rules.push({ match: new RegExp(`^${t.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`), headers: [] })
  else rules.at(-1).headers.push([t.slice(0, t.indexOf(':')), t.slice(t.indexOf(':') + 1).trim()])
}
const headersFor = (path) => {
  const out = {}
  for (const rule of rules) if (rule.match.test(path)) for (const [name, value] of rule.headers) out[name] = value
  if (mutate && out['Content-Security-Policy']) out['Content-Security-Policy'] = out['Content-Security-Policy'].replace(/ 'sha256-[^']+'/g, '')
  return out
}

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
}

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let file = normalize(join(dist, path))
  if (file !== dist && !file.startsWith(dist + sep)) return void res.writeHead(403).end()
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) return void res.writeHead(404, headersFor(path)).end('not found')
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', ...headersFor(path) })
  res.end(readFileSync(file))
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const origin = `http://127.0.0.1:${server.address().port}`

// ---------------------------------------------------------------------------------------------

// Every page: /, /blog/, /blog/<post>/ …
const pages = (function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name === 'index.html' ? ['/' + relative(dist, join(dir, '/')).split(sep).join('/')] : [],
  )
})(dist)
  .map((p) => (p === '/' ? p : p.replace(/\/?$/, '/')))
  .sort()

const browser = await playwright.chromium.launch()
const version = browser.version()
const problems = []
let interactions = 0

async function visit(path, viewport, act) {
  const context = await browser.newContext({ viewport })
  await context.addInitScript(() => {
    window.__csp = []
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(`${e.effectiveDirective} blocked ${e.blockedURI || 'inline'} (${e.sourceFile || 'page'}:${e.lineNumber})`),
    )
  })
  const page = await context.newPage()
  const report = (what) => problems.push(`${path} [${viewport.width}px]: ${what}`)
  page.on('pageerror', (e) => report(`page error: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && report(`console error: ${m.text()}`))
  page.on('requestfailed', (r) => report(`request failed: ${r.url()} (${r.failure()?.errorText})`))
  page.on('response', (r) => r.status() >= 400 && report(`HTTP ${r.status()} for ${r.url()}`))

  const response = await page.goto(origin + path, { waitUntil: 'load' })
  if (!response.headers()['content-security-policy']) report('served without a Content-Security-Policy header')
  // Scroll through the page so lazy images and late CSS backgrounds load too.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 40))
    }
  })
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  if (act) await act(page, report)

  const result = await page.evaluate(() => ({
    csp: window.__csp,
    broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
    fonts: [...document.fonts].filter((f) => f.status === 'loaded').length,
    fontErrors: [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family),
  }))
  for (const v of result.csp) report(`CSP violation: ${v}`)
  for (const src of result.broken) report(`broken image: ${src}`)
  for (const family of result.fontErrors) report(`font failed: ${family}`)
  if (result.fonts === 0) report('no web font loaded')
  await context.close()
}

const desktop = { width: 1440, height: 900 }
const phone = { width: 390, height: 844 }

const expectAttr = async (page, report, selector, attr, want) => {
  interactions++
  const got = await page.locator(selector).first().getAttribute(attr)
  if (got !== want) report(`${selector} has ${attr}=${got} after the click (want ${want}): its script did not run`)
}

for (const path of pages) {
  await visit(path, desktop, path === '/' ? async (page, report) => {
    await page.locator('[data-faq] button').first().click()
    await expectAttr(page, report, '[data-faq] > div', 'data-open', 'true')
    await page.locator('[data-features] [role="tab"]').nth(1).click()
    await expectAttr(page, report, '[data-features] [role="tab"] >> nth=1', 'aria-selected', 'true')
    await page.locator('[data-status] [data-view="proof"]').click()
    await expectAttr(page, report, '[data-status] [data-view="proof"]', 'aria-checked', 'true')
    await page.locator('[data-how] [role="tab"]').nth(1).click()
    await expectAttr(page, report, '[data-how] [role="tab"] >> nth=1', 'aria-selected', 'true')
  } : undefined)
}
await visit('/blog/', phone, async (page, report) => {
  await page.locator('[data-nav-toggle]').click()
  await expectAttr(page, report, '[data-nav-toggle]', 'aria-expanded', 'true')
})

await browser.close()
server.close()

const label = mutate ? ' (mutated: script hashes removed)' : ''
if (problems.length) {
  console.error(`check-csp-browser${label}: ${problems.length} problem(s) on ${pages.length} pages\n`)
  for (const p of problems.slice(0, 40)) console.error(`  ${p}`)
  if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`)
  process.exit(1)
}
console.log(`check-csp-browser${label}: ${pages.length} pages + 1 phone view in Chromium ${version}, ` +
  `no CSP violations, errors or broken assets; ${interactions} scripted interactions worked`)
