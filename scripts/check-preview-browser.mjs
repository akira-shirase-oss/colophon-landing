// Draft preview in a real browser: the built worker (dist/_worker.js) behind a local server, framed by a page
// on another site that stands in for the Studio. What only a browser can show:
//
//   framed    the Studio's page frames the preview link; the browser keeps the site's cookie inside the frame
//             (SameSite=None; Secure; Partitioned), the draft is drawn, and the page tells the Studio it is
//             ready with previewing: true, to the Studio's origin.
//   saved     a colophon:draft-saved message from the Studio reloads the frame.
//   left      Exit preview inside the frame clears the frame's cookie and says so in the frame; it does not go
//             to a public page, which would refuse to load there.
//   policy    no Content-Security-Policy violation and no error on any preview page: the handshake script runs
//             because its hash is in the policy, and the theme script, the header's and the page's run as on a
//             built page.
//   stranger  the same link framed by any other origin is refused by frame-ancestors: nothing is drawn.
//   ended     a preview address without the cookie, framed, says the preview has ended and tells the Studio
//             previewing: false.
//   tab       opened in a tab of its own the link works too; Exit preview clears the cookie and leaves, and
//             the preview address then says it has ended.
//
//   npm run build && npm run check:browser
//
// Playwright is not a dependency of this repo; see the top of scripts/check-csp-browser.mjs. The servers
// listen on 127.0.0.1 on ports the system picks. The site is opened as http://localhost:<port> and the Studio
// as http://127.0.0.1:<port>, so the two are different sites and the frame is a third party, as it is in
// production. --shots <dir> also saves a screenshot of each preview page, light and dark.
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { startStub } from './preview-stub.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined)
const dist = resolve(root, arg('--dist') ?? 'dist')
const shots = arg('--shots') ? resolve(arg('--shots')) : undefined

let playwright
try {
  playwright = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(join(process.env.PLAYWRIGHT_MODULE, 'index.mjs')).href : 'playwright')
} catch {
  console.error('check-preview-browser: Playwright not found. Install it, or set PLAYWRIGHT_MODULE (see the top of scripts/check-csp-browser.mjs).')
  process.exit(2)
}
if (!existsSync(join(dist, '_worker.js', 'index.js'))) {
  console.error(`No worker at ${join(dist, '_worker.js')}. Run npm run build first.`)
  process.exit(2)
}

// ---------------------------------------------------------------------------------------------
// The Studio: the stand-in for Colophon, which also serves the page that frames a preview.

const STUDIO_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Studio (stand-in)</title></head><body>
<iframe id="preview" title="Preview" style="width: 1200px; height: 800px; border: 0"></iframe>
<script>
  window.messages = []
  window.addEventListener('message', (event) => window.messages.push({ origin: event.origin, data: event.data }))
  document.getElementById('preview').src = new URLSearchParams(location.search).get('src')
</script></body></html>`
const colophon = await startStub({ pages: { '/studio/': STUDIO_PAGE } })
const { ID, CODE } = colophon
const STUDIO = colophon.origin
const STRANGER = STUDIO.replace('127.0.0.1', 'localhost')

// ---------------------------------------------------------------------------------------------
// The site as Cloudflare Pages serves it: the paths in _routes.json go to the worker, everything else is a
// file from dist/ with the headers of _headers.

const worker = (await import(pathToFileURL(join(dist, '_worker.js', 'index.js')).href)).default
const routes = JSON.parse(readFileSync(join(dist, '_routes.json'), 'utf8')).include.map((p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`))
const rules = []
for (const line of readFileSync(join(dist, '_headers'), 'utf8').split(/\r?\n/)) {
  const t = line.trim()
  if (t === '' || t.startsWith('#')) continue
  if (!/^\s/.test(line)) rules.push({ match: new RegExp(`^${t.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`), headers: [] })
  else rules.at(-1).headers.push([t.slice(0, t.indexOf(':')), t.slice(t.indexOf(':') + 1).trim()])
}
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8' }

function asset(path) {
  let file = normalize(join(dist, decodeURIComponent(path)))
  if (file !== dist && !file.startsWith(dist + sep)) return new Response(null, { status: 403 })
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  const headers = {}
  for (const rule of rules) if (rule.match.test(path)) for (const [name, value] of rule.headers) headers[name] = value
  if (!existsSync(file) || file.includes(`${sep}_worker.js${sep}`)) return new Response('not found', { status: 404, headers })
  return new Response(readFileSync(file), { headers: { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', ...headers } })
}
const env = { COLOPHON_API: STUDIO, COLOPHON_PROJECT: colophon.PROJECT, COLOPHON_ENVIRONMENT: colophon.ENVIRONMENT, ASSETS: { fetch: async (input) => asset(new URL(input instanceof Request ? input.url : input).pathname) } }

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const response = routes.some((route) => route.test(url.pathname))
    ? await worker.fetch(new Request(url, { method: req.method, headers: Object.entries(req.headers).filter(([, v]) => typeof v === 'string') }), env, { waitUntil() {} })
    : asset(url.pathname)
  const headers = {}
  for (const [name, value] of response.headers) if (name !== 'set-cookie') headers[name] = value
  if (response.headers.getSetCookie().length) headers['set-cookie'] = response.headers.getSetCookie()
  res.writeHead(response.status, headers)
  res.end(Buffer.from(await response.arrayBuffer()))
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const SITE = `http://localhost:${server.address().port}`

// ---------------------------------------------------------------------------------------------

const problems = []
const browser = await playwright.chromium.launch()
const version = browser.version()

/** A fresh browser (no cookies) with every error on every page and frame collected. */
async function session(name, colorScheme = 'light') {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme })
  const report = (what) => problems.push(`${name}: ${what}`)
  const expected = []
  context.on('page', (page) => {
    page.on('pageerror', (e) => report(`page error: ${e.message}`))
    page.on('console', (m) => m.type() === 'error' && !expected.some((e) => e.test(m.text())) && report(`console error: ${m.text()}`))
  })
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP: ${e.effectiveDirective} blocked ${e.blockedURI || 'inline'}`))
  })
  return { context, report, expect: (pattern) => expected.push(pattern) }
}
const link = (path, code = CODE) => `${SITE}/api/preview?code=${code}&path=${path}`
const framedBy = (studio, src) => `${studio}/studio/?src=${encodeURIComponent(src)}`
const ready = (page, count) => page.waitForFunction((n) => window.messages.filter((m) => m.data?.type === 'colophon:preview-ready').length >= n, count, { timeout: 15_000 })
const shoot = async (target, name) => {
  if (!shots) return
  mkdirSync(shots, { recursive: true })
  await target.screenshot({ path: join(shots, `${name}.png`) })
}

try {
  // ---- framed, saved, policy ---------------------------------------------------------------
  for (const [collection, id, heading] of [
    ['posts', ID.post, 'A draft only the check has seen'],
    ['pages', ID.page, 'A comparison in a publish request'],
    ['home', ID.home, 'A headline from a draft.'],
    ['site', ID.site, 'Site settings: the status line'],
  ]) {
    for (const scheme of collection === 'posts' || shots ? ['light', 'dark'] : ['light']) {
      const name = `${collection} framed by the Studio (${scheme})`
      const { context, report, expect } = await session(name, scheme)
      expect(/401/)
      const studio = await context.newPage()
      colophon.again()
      await studio.goto(framedBy(STUDIO, link(`/preview/${collection}/${id}`)))
      await ready(studio, 1).catch(() => report('the Studio never heard colophon:preview-ready: the frame was blocked, lost its cookie or failed its policy'))
      const [first] = await studio.evaluate(() => window.messages)
      if (first && (first.origin !== SITE || first.data.previewing !== true)) report(`the Studio heard ${JSON.stringify(first)} (want previewing: true from ${SITE})`)
      const frame = studio.frames().find((f) => f.url().startsWith(`${SITE}/preview/`))
      if (!frame) report(`the frame is at ${studio.frames().map((f) => f.url()).join(', ')}, not on the preview page`)
      else {
        const h1 = (await frame.locator('h1').first().textContent())?.trim()
        if (h1 !== heading) report(`the frame's h1 is "${h1}" (want "${heading}")`)
        const bar = frame.locator('aside[aria-label="Draft preview"]')
        if (!(await bar.isVisible())) report('the preview bar is not visible')
        else if (!/not published/.test((await bar.textContent()) ?? '')) report(`the bar says "${(await bar.textContent())?.trim()}"`)
        if ((await frame.locator('a', { hasText: 'Exit preview' }).count()) !== 1) report('no "Exit preview" link')
        if (new URL(frame.url()).search !== '') report(`the frame's address carries a query (${new URL(frame.url()).search}): the code must be gone after the redirect`)
        if (await frame.evaluate(() => document.cookie.includes('colophon_preview'))) report('the page’s script can read the preview cookie')
        // The site's own scripts run under the preview policy as they do on a built page.
        if ((await frame.evaluate(() => document.documentElement.classList.contains('dark'))) !== (scheme === 'dark')) report('the theme script did not run in the frame')
        await shoot(studio.locator('#preview'), `preview-${collection}-${scheme}`)
        if (collection === 'posts' && scheme === 'light') {
          await studio.evaluate((target) => document.getElementById('preview').contentWindow.postMessage({ type: 'colophon:draft-saved', entry: 'e', revision: 'r' }, target), SITE)
          await ready(studio, 2).catch(() => report('a colophon:draft-saved message from the Studio did not reload the frame'))
          // Exit preview inside the frame: the cookie of this frame is cleared and the frame says so. It must
          // not go to a public page, which would refuse to load in a frame and leave the pane blank.
          const reloaded = studio.frames().find((f) => f.url().startsWith(`${SITE}/preview/`))
          await reloaded.getByRole('link', { name: 'Exit preview' }).click()
          const left = await studio.frameLocator('#preview').locator('h1').textContent({ timeout: 10_000 }).catch(() => null)
          if (left?.trim() !== 'You have left the preview') report(`after Exit preview the frame shows "${left}"`)
          await shoot(studio.locator('#preview'), 'preview-left')
          await reloaded.goto(`${SITE}/preview/posts/${id}`).catch(() => {})
          const after = await studio.frameLocator('#preview').locator('h1').textContent({ timeout: 10_000 }).catch(() => null)
          if (after?.trim() !== 'This preview has ended') report(`after Exit preview in the frame, the preview address shows "${after}" (the frame's cookie must be gone)`)
        }
      }
      await context.close()
    }
  }

  // ---- stranger ----------------------------------------------------------------------------
  {
    const { context, report, expect } = await session('framed by another origin')
    expect(/frame-ancestors|Refused to (frame|display)|ERR_BLOCKED_BY_RESPONSE/i)
    const page = await context.newPage()
    colophon.again()
    await page.goto(framedBy(STRANGER, link(`/preview/posts/${ID.post}`)))
    await page.waitForTimeout(1500)
    if ((await page.evaluate(() => window.messages)).length > 0) report('a page on another origin framed the preview and heard from it')
    const drawn = await Promise.all(page.frames().filter((f) => f !== page.mainFrame()).map((f) => f.evaluate(() => document.body?.innerText ?? '').catch(() => '')))
    if (drawn.some((text) => /UNPUBLISHED-MARKER|Draft preview/.test(text))) report('a page on another origin framed the preview and it was drawn')
    await context.close()
  }

  // ---- ended, framed -------------------------------------------------------------------------
  {
    const { context, report, expect } = await session('a preview address without the cookie, framed')
    expect(/401/)
    const studio = await context.newPage()
    await studio.goto(framedBy(STUDIO, `${SITE}/preview/posts/${ID.post}`))
    await ready(studio, 1).catch(() => report('the Studio never heard from the "ended" page'))
    const [first] = await studio.evaluate(() => window.messages)
    if (first && first.data.previewing !== false) report(`the "ended" page told the Studio ${JSON.stringify(first.data)} (want previewing: false)`)
    const frame = studio.frames().find((f) => f.url().startsWith(`${SITE}/preview/`))
    const text = (await frame?.locator('main').textContent()) ?? ''
    if (!/This preview has ended/.test(text) || /UNPUBLISHED-MARKER/.test(text)) report(`the frame shows "${text.trim().slice(0, 80)}"`)
    await shoot(studio.locator('#preview'), 'preview-ended')
    await context.close()
  }

  // ---- tab -----------------------------------------------------------------------------------
  {
    const { context, report, expect } = await session('opened in its own tab')
    expect(/401|404|422/)
    const page = await context.newPage()
    colophon.again()
    await page.goto(link(`/preview/posts/${ID.post}`))
    if (page.url() !== `${SITE}/preview/posts/${ID.post}`) report(`the link landed on ${page.url()}`)
    if (!(await page.locator('main').textContent())?.includes('UNPUBLISHED-MARKER-7f3a')) report('the draft is not drawn in a tab of its own')
    const cookie = (await context.cookies(SITE)).find((c) => c.name === 'colophon_preview')
    if (!cookie || !cookie.httpOnly || !cookie.secure || cookie.sameSite !== 'None') report(`the browser kept the cookie as ${JSON.stringify(cookie && { httpOnly: cookie.httpOnly, secure: cookie.secure, sameSite: cookie.sameSite })}`)
    // The same link again: the code is spent, and the page says so.
    const again = await context.newPage()
    await again.goto(link(`/preview/posts/${ID.post}`))
    if (!/This preview link has expired/.test((await again.locator('h1').textContent()) ?? '')) report('a used link did not show the "expired" page')
    await shoot(again, 'preview-link-expired')
    await again.close()
    await page.getByRole('link', { name: 'Exit preview' }).click()
    await page.waitForLoadState('load')
    if (new URL(page.url()).pathname !== '/') report(`Exit preview went to ${page.url()} (the stand-in's post has no public page, so /)`)
    if ((await context.cookies(SITE)).some((c) => c.name === 'colophon_preview')) report('Exit preview left the cookie in place')
    await page.goto(`${SITE}/preview/posts/${ID.post}`)
    if (!/This preview has ended/.test((await page.locator('h1').textContent()) ?? '')) report('after Exit preview the address still shows something other than "ended"')
    // A draft the build would refuse: its problems, in the site's own frame.
    colophon.again()
    await page.goto(link(`/preview/posts/${ID.broken}`))
    if (!/can’t be shown yet/.test((await page.locator('h1').textContent()) ?? '')) report('a draft the build would refuse did not list its problems')
    await shoot(page, 'preview-not-buildable')
    await context.close()
  }
} finally {
  await browser.close()
  await new Promise((done) => server.close(done))
  await colophon.close()
}

if (problems.length) {
  console.error(`check-preview-browser: ${problems.length} problem(s) in Chromium ${version}\n\n${problems.map((p) => `  ${p}`).join('\n')}`)
  process.exit(1)
}
console.log(`check-preview-browser: Chromium ${version}, the site at ${SITE} framed by the Studio's stand-in at ${STUDIO}`)
console.log('  framed    ok: post, page, home and site drafts drawn inside the Studio’s frame with the cookie kept; previewing: true heard from the site’s origin')
console.log('  saved     ok: colophon:draft-saved from the Studio reloads the frame')
console.log('  left      ok: Exit preview inside the frame clears its cookie and says so there; the address then says "ended"')
console.log('  policy    ok: no Content-Security-Policy violation or error on any preview page; the theme script and the handshake ran')
console.log(`  stranger  ok: framed by ${STRANGER}, nothing is drawn and nothing is heard`)
console.log('  ended     ok: without the cookie the frame says the preview has ended, and previewing: false')
console.log('  tab       ok: the link works in a tab of its own; a used link says so; Exit preview clears the cookie and the address then says "ended"')
