// Drives the built draft-preview worker (dist/_worker.js, as Cloudflare Pages runs it) against a local stand-in
// for Colophon's /preview/v1, and fails on anything a preview route must never do. Run after `npm run build`:
//
//   node scripts/check-preview.mjs [dir]     (dir defaults to dist/)
//
// journey   the Studio's link → the code is exchanged once, server to server → a 303 with the cookie
//           (HttpOnly; Secure; SameSite=None; Partitioned, living as long as the token) → the preview page
//           draws the stub's draft in the post, page, home and site layouts, with the bar and the handshake.
// refusals  a used, expired or unknown code, a `path` that leaves the site (or names anything but a preview
//           page), a POST and a prefetch each get a page that says why, no cookie and no redirect; the last
//           three never reach Colophon, so the code isn't spent.
// ended     no cookie → "This preview has ended", with no read at all; an expired, revoked or unknown token →
//           the same, the cookie cleared; a changed or published publish request, a busy or silent Colophon
//           and an oversized answer each say so. Never the draft, never the published page.
// headers   every answer is no-store and noindex; a page may be framed by the Studio's origin and by nothing
//           else, and its policy is the public one (dist/_headers) but for that and the handshake's hash;
//           every script on a preview page is one the policy names; X-Frame-Options is absent only where
//           frame-ancestors names the Studio.
// token     the token and the code appear in no HTML, no header but Set-Cookie, no redirect and no log line.
// address   a collection that isn't one of the four, or an id that isn't a UUID, reads nothing.
// exit      clears the cookie with the attributes that set it and goes to a public page that exists, else /;
//           inside a frame it stays and says so, because the public pages refuse to be framed.
//
// The stub listens on 127.0.0.1 on a port the system picks, and is closed at the end. Exits 1 and lists every
// failure, or prints one line per check that passed.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { startStub } from './preview-stub.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = resolve(process.argv[2] ?? join(root, 'dist'))
const SITE = 'https://colophon.404human.dev'

const failures = []
const fail = (check, message) => failures.push(`[${check}] ${message}`)
const expect = (check, ok, message) => {
  if (!ok) fail(check, message)
}

if (!existsSync(join(dist, '_worker.js', 'index.js'))) {
  console.error(`No worker at ${join(dist, '_worker.js')}. Run npm run build first.`)
  process.exit(1)
}

// ---------------------------------------------------------------------------------------------
// The stand-in for Colophon (scripts/preview-stub.mjs): one project, a draft in each collection, and tokens
// that fail in each documented way.

const colophon = await startStub()
const { PROJECT, ENVIRONMENT, ID, TOKEN, CODE, seen } = colophon
const STUDIO = colophon.origin

// ---------------------------------------------------------------------------------------------
// The worker, with the bindings Pages gives it. The log is caught: nothing about a preview belongs in it.

const logged = []
for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  const original = console[level]
  console[level] = (...args) => {
    logged.push(args.map((a) => (a instanceof Error ? `${a.stack}` : typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
    if (process.env.CHECK_PREVIEW_VERBOSE) original(...args)
  }
}
const out = (line) => process.stdout.write(`${line}\n`)

const EXISTING = new Set(['/blog/draft-only-post/', '/compare/', '/blog/'])
const assetRequests = []
const env = {
  COLOPHON_API: STUDIO,
  COLOPHON_PROJECT: PROJECT,
  COLOPHON_ENVIRONMENT: ENVIRONMENT,
  ASSETS: {
    fetch: async (input) => {
      const request = input instanceof Request ? input : new Request(input)
      const path = new URL(request.url).pathname
      assetRequests.push(path)
      return EXISTING.has(path) ? new Response(request.method === 'HEAD' ? null : 'a static page', { status: 200 }) : new Response('the static 404 page', { status: 404, headers: { 'x-frame-options': 'DENY' } })
    },
  },
}
const worker = (await import(pathToFileURL(join(dist, '_worker.js', 'index.js')).href)).default
const call = async (path, init = {}, bindings = env) => {
  const response = await worker.fetch(new Request(`${SITE}${path}`, { redirect: 'manual', ...init }), bindings, { waitUntil() {}, passThroughOnException() {} })
  return { status: response.status, headers: response.headers, text: await response.text() }
}
const withCookie = (token) => ({ headers: { cookie: `theme=dark; colophon_preview=${token}; other=1` } })

// ---------------------------------------------------------------------------------------------
// What every answer must carry

const sha256 = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`
const directives = (csp) => new Map((csp ?? '').split(';').map((part) => part.trim()).filter(Boolean).map((part) => [part.split(/\s+/)[0].toLowerCase(), part.split(/\s+/).slice(1)]))

/** The `/*` rule of dist/_headers: what every built page is sent with. */
const publicHeaders = new Map()
{
  let inAll = false
  for (const line of readFileSync(join(dist, '_headers'), 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (t === '' || t.startsWith('#')) continue
    if (!/^\s/.test(line)) inAll = t === '/*'
    else if (inAll) publicHeaders.set(t.slice(0, t.indexOf(':')).toLowerCase(), t.slice(t.indexOf(':') + 1).trim())
  }
}
const publicPolicy = directives(publicHeaders.get('content-security-policy'))
const publicHashes = new Set(publicPolicy.get('script-src').filter((s) => s.startsWith("'sha")))
let handshakeHash

function checkHeaders(name, answer, kind) {
  const h = answer.headers
  expect('headers', h.get('cache-control') === (kind === 'page' ? 'private, no-store' : 'no-store'), `${name}: Cache-Control is ${h.get('cache-control')}`)
  expect('headers', h.get('x-robots-tag') === 'noindex', `${name}: X-Robots-Tag is ${h.get('x-robots-tag')}`)
  expect('headers', h.get('referrer-policy') === 'no-referrer', `${name}: Referrer-Policy is ${h.get('referrer-policy')}`)
  expect('headers', !h.has('etag') && !h.has('last-modified'), `${name}: carries a validator a cache could keep`)
  for (const same of ['strict-transport-security', 'x-content-type-options', 'permissions-policy', 'cross-origin-opener-policy']) {
    expect('headers', h.get(same) === publicHeaders.get(same), `${name}: ${same} is ${h.get(same)} (the built pages send ${publicHeaders.get(same)})`)
  }
  const policy = directives(h.get('content-security-policy'))
  expect('headers', policy.get('frame-ancestors')?.join(' ') === STUDIO, `${name}: frame-ancestors is "${policy.get('frame-ancestors')?.join(' ')}" (want exactly ${STUDIO})`)
  expect('headers', !h.has('x-frame-options'), `${name}: X-Frame-Options is ${h.get('x-frame-options')}, which would keep the Studio from framing it`)
  for (const [directive, sources] of publicPolicy) {
    if (directive === 'frame-ancestors') continue
    const got = policy.get(directive) ?? []
    if (directive === 'script-src') {
      const extra = got.filter((s) => !sources.includes(s))
      expect('headers', sources.every((s) => got.includes(s)) && extra.length === 1 && /^'sha256-/.test(extra[0]), `${name}: script-src differs from the public one by ${JSON.stringify(extra)} (want one hash, the handshake's)`)
      handshakeHash ??= extra[0]
      expect('headers', extra[0] === handshakeHash, `${name}: script-src allows a different extra hash than the other preview answers`)
    } else expect('headers', got.join(' ') === sources.join(' '), `${name}: ${directive} is "${got.join(' ')}" (the built pages send "${sources.join(' ')}")`)
  }
  for (const directive of policy.keys()) expect('headers', publicPolicy.has(directive), `${name}: the policy has ${directive}, which the public one doesn't`)
}

/** Every script on a page the worker drew is one the answer's own policy names; nothing else would run, and nothing else should be there. */
function checkScripts(name, answer) {
  const allowed = new Set(directives(answer.headers.get('content-security-policy')).get('script-src') ?? [])
  let handshakes = 0
  for (const m of answer.text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/type\s*=\s*"application\/ld\+json"/i.test(m[1])) continue
    if (/\bsrc=/.test(m[1])) {
      expect('headers', /\bsrc="\/[^/]/.test(m[1]), `${name}: loads a script from another origin (${m[1].trim()})`)
      continue
    }
    const hash = sha256(m[2])
    expect('headers', allowed.has(hash), `${name}: an inline script isn't in the answer's script-src (${hash}): ${m[2].trim().slice(0, 60)}…`)
    if (!publicHashes.has(hash)) {
      handshakes += 1
      expect('headers', hash === handshakeHash, `${name}: runs a script no built page runs, and it isn't the handshake (${hash})`)
      expect('journey', new RegExp(`data-studio-origin="${STUDIO.replace(/[.]/g, '\\.')}"`).test(m[1]), `${name}: the handshake names ${m[1].trim()} (want the Studio's origin, ${STUDIO})`)
    }
  }
  expect('headers', !/\son[a-z]+\s*=/i.test(answer.text.replace(/<script\b[\s\S]*?<\/script>/g, '')), `${name}: has an inline event handler`)
  return handshakes
}

function checkNoSecrets(name, answer) {
  for (const [label, secret] of [['token', TOKEN], ['code', CODE]]) {
    expect('token', !answer.text.includes(secret), `${name}: the ${label} is in the HTML`)
    for (const [header, value] of answer.headers) {
      if (header !== 'set-cookie') expect('token', !value.includes(secret), `${name}: the ${label} is in the ${header} header`)
    }
  }
}

const isNotice = (answer, title) => answer.text.includes(`<h1`) && answer.text.includes(title) && /<meta name="robots" content="noindex">/.test(answer.text) && !/rel="canonical"/.test(answer.text)
const MARKERS = ['UNPUBLISHED-MARKER-7f3a', 'PAGE-MARKER-91c2', 'HOME-MARKER-44d0', 'STATUS-MARKER-0be7', 'A draft only the check has seen', 'Already live.']
const showsNothing = (answer) => MARKERS.every((marker) => !answer.text.includes(marker))

try {
  // ---- refusals that never reach Colophon ----------------------------------------------------
  const target = `/preview/posts/${ID.post}`
  const leaving = [
    ['no path', ''],
    ['protocol-relative', '&path=//evil.example/x'],
    ['absolute URL', `&path=${encodeURIComponent('https://evil.example/x')}`],
    ['backslash', `&path=${encodeURIComponent('/\\evil.example')}`],
    ['dot segments to //', `&path=${encodeURIComponent('/..//evil.example')}`],
    ['encoded dots to //', `&path=${encodeURIComponent('/%2e%2e//evil.example')}`],
    ['header injection', `&path=${encodeURIComponent('/preview/posts/x\r\nSet-Cookie: a=b')}`],
    ['a public page', '&path=/blog/'],
    ['the handler itself', `&path=${encodeURIComponent(`/api/preview?code=${CODE}`)}`],
    ['dot segments out of /preview/', `&path=${encodeURIComponent(`/preview/posts/../../blog/`)}`],
    ['another collection', `&path=/preview/drafts/${ID.post}`],
    ['an id that is no UUID', '&path=/preview/posts/1'],
    ['a query on the page', `&path=${encodeURIComponent(`${target}?next=//evil.example`)}`],
  ]
  for (const [why, query] of leaving) {
    const answer = await call(`/api/preview?code=${CODE}${query}`)
    expect('refusals', answer.status === 400 && isNotice(answer, 'This preview link names no page'), `path (${why}): answered ${answer.status}, not the 400 page`)
    expect('refusals', !answer.headers.has('location') && !answer.headers.has('set-cookie'), `path (${why}): redirected or set a cookie`)
    checkHeaders(`path (${why})`, answer, 'handler')
    checkScripts(`path (${why})`, answer)
    checkNoSecrets(`path (${why})`, answer)
  }
  const posted = await call(`/api/preview?code=${CODE}&path=${target}`, { method: 'POST' })
  expect('refusals', posted.status === 405 && posted.headers.get('allow') === 'GET' && !posted.headers.has('set-cookie'), `POST answered ${posted.status} (Allow: ${posted.headers.get('allow')})`)
  const prefetched = await call(`/api/preview?code=${CODE}&path=${target}`, { headers: { 'sec-purpose': 'prefetch;prerender' } })
  expect('refusals', prefetched.status === 503 && !prefetched.headers.has('set-cookie'), `a prefetch answered ${prefetched.status}`)
  expect('refusals', colophon.exchanges() === 0 && seen.length === 0, `Colophon was asked ${seen.length} time(s) by requests that must be refused first, so a code could be spent`)

  // ---- ended: no cookie ----------------------------------------------------------------------
  for (const [collection, id] of [['posts', ID.post], ['pages', ID.page], ['home', ID.home], ['site', ID.site]]) {
    for (const init of [{}, { headers: { cookie: 'colophon_preview=' } }, { headers: { cookie: 'colophon_preview="a b"; theme=dark' } }]) {
      const answer = await call(`/preview/${collection}/${id}`, init)
      const name = `/preview/${collection} without a session`
      expect('ended', answer.status === 401 && isNotice(answer, 'This preview has ended'), `${name}: answered ${answer.status}, not the 401 "ended" page`)
      expect('ended', showsNothing(answer), `${name}: shows content`)
      checkHeaders(name, answer, 'page')
      expect('journey', checkScripts(name, answer) === 1 && /data-previewing="false"/.test(answer.text), `${name}: must tell the Studio it holds no session (data-previewing="false"), once`)
    }
  }
  expect('ended', seen.length === 0, `a request without a preview cookie reached Colophon ${seen.length} time(s)`)

  // ---- address: nothing is read for a collection or an id the site doesn't preview ---------------
  for (const path of ['/preview/posts/not-a-uuid', `/preview/posts/${ID.post.toUpperCase()}`, `/preview/posts/${ID.post}%2F..%2F..%2Fexchange`, '/preview/posts/..%2Fsession']) {
    const answer = await call(path, withCookie(TOKEN))
    expect('address', answer.status === 404 && showsNothing(answer), `${path}: answered ${answer.status}`)
  }
  for (const path of [`/preview/drafts/${ID.post}`, `/preview/session/${ID.post}`, `/preview/${ID.post}`, '/preview/', `/preview/posts/${ID.post}/extra`]) {
    const answer = await call(path, withCookie(TOKEN))
    expect('address', answer.status === 404 && answer.text === 'the static 404 page', `${path}: the worker answered it itself (${answer.status}) instead of leaving it to the static files`)
  }
  expect('address', seen.length === 0, `an address the site doesn't preview reached Colophon: ${seen.map((s) => s.path).join(', ')}`)

  // ---- journey: exchange → cookie → redirect → the draft ---------------------------------------
  const started = Date.now()
  const entered = await call(`/api/preview?code=${CODE}&path=${target}`)
  expect('journey', entered.status === 303 && entered.headers.get('location') === target, `the handler answered ${entered.status} to ${entered.headers.get('location')} (want 303 to ${target})`)
  const cookie = entered.headers.get('set-cookie') ?? ''
  const maxAge = Number(/Max-Age=(\d+)$/.exec(cookie)?.[1])
  expect('journey', cookie === `colophon_preview=${TOKEN}; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=${maxAge}`, `the cookie is "${cookie.replace(TOKEN, '<token>')}"`)
  expect('journey', maxAge > 14 * 60 && maxAge <= 15 * 60, `the cookie lives ${maxAge} s; the token lives 15 minutes`)
  expect('journey', entered.headers.getSetCookie().length === 1, `the handler set ${entered.headers.getSetCookie().length} cookies`)
  expect('headers', entered.headers.get('cache-control') === 'no-store' && entered.headers.get('x-robots-tag') === 'noindex' && entered.headers.get('referrer-policy') === 'no-referrer', 'the redirect is not no-store, noindex and no-referrer')
  expect('token', !entered.headers.get('location').includes(TOKEN) && entered.text === '', 'the redirect carries the token outside the cookie')
  const exchange = seen[0]
  expect('journey', seen.length === 1 && exchange.method === 'POST' && exchange.path === `/preview/v1/${PROJECT}/${ENVIRONMENT}/exchange` && exchange.body === JSON.stringify({ code: CODE }), `the exchange was ${exchange?.method} ${exchange?.path} ${exchange?.body}`)
  expect('journey', exchange.headers.authorization === undefined && exchange.headers.cookie === undefined, 'the exchange carried a credential of the visitor’s')
  seen.length = 0

  const post = await call(target, withCookie(TOKEN))
  expect('journey', post.status === 200, `the post preview answered ${post.status}`)
  for (const [what, ok] of [
    ['the draft’s title in the h1', /<h1[^>]*>A draft only the check has seen<\/h1>/.test(post.text)],
    ['the draft’s body', post.text.includes('UNPUBLISHED-MARKER-7f3a')],
    ['a heading with the build’s id and typographic quotes', post.text.includes('<h2 id="why-drafts-matter">Why “drafts” matter</h2>')],
    ['an apostrophe', post.text.includes('It’s the unpublished sentence')],
    ['a table column aligned by style', post.text.includes('<th style="text-align: right">Right</th>')],
    ['a plain, escaped code block', post.text.includes('<pre tabindex="0" data-language="ts" style="overflow-x: auto;"><code>const answer: number = 6 * 7 // &lt;b&gt;not markup&lt;/b&gt;</code></pre>')],
    ['the status line from the site settings, then the post’s own note', /STATUS-MARKER-0be7\. This sentence is the draft post’s own status note\./.test(post.text)],
    ['the post layout’s back link and dates', /<a class="[^"]*back[^"]*" href="\/blog\/">/.test(post.text) && /Published\s*<time datetime="2026-11-26T00:00:00.000Z">26 November 2026<\/time>/.test(post.text)],
    ['the bar: Draft preview, not published', /<aside[^>]*aria-label="Draft preview"[^>]*data-preview-source="draft"/.test(post.text) && post.text.includes('Draft preview') && post.text.includes('not published')],
    ['Exit preview, to the post’s public address', post.text.includes(`href="/api/preview/exit?path=${encodeURIComponent('/blog/draft-only-post/')}"`)],
    ['noindex, and no canonical', /<meta name="robots" content="noindex">/.test(post.text) && !/rel="canonical"/.test(post.text)],
    ['no release marker (the page was not built from a release)', !/colophon-generation/.test(post.text)],
  ]) expect('journey', ok, `the post preview lacks ${what}`)
  checkHeaders('the post preview', post, 'page')
  expect('journey', checkScripts('the post preview', post) === 1 && /data-previewing="true"/.test(post.text), 'the post preview must run the handshake once, with data-previewing="true"')
  checkNoSecrets('the post preview', post)
  expect('journey', seen.length === 2 && seen.every((s) => s.method === 'GET' && s.headers.authorization === `Bearer ${TOKEN}` && s.headers.cookie === undefined), `the reads were ${seen.map((s) => `${s.method} ${s.path}`).join(', ')}, each with the bearer token and no cookie`)
  expect('journey', seen.map((s) => s.path).sort().join(' ') === [`/preview/v1/${PROJECT}/${ENVIRONMENT}/posts/${ID.post}`, `/preview/v1/${PROJECT}/${ENVIRONMENT}/site`].sort().join(' '), `the reads were ${seen.map((s) => s.path).join(', ')}`)
  const firstRenderMs = Date.now() - started

  const page = await call(`/preview/pages/${ID.page}/`, withCookie(TOKEN))
  for (const [what, ok] of [
    ['a 200', page.status === 200],
    ['its body', page.text.includes('PAGE-MARKER-91c2')],
    ['the section’s back link', /<a class="[^"]*back[^"]*" href="\/compare\/">/.test(page.text)],
    ['its FAQ and Read next', page.text.includes('<h2 id="faq">FAQ</h2>') && page.text.includes('<h2 id="read-next">Read next</h2>')],
    ['the bar naming a publish request', /data-preview-source="changeset"/.test(page.text) && page.text.includes('Publish request preview')],
    ['Exit preview, to the page’s public address', page.text.includes(`href="/api/preview/exit?path=${encodeURIComponent('/compare/draft-comparison/')}"`)],
  ]) expect('journey', ok, `the page preview lacks ${what}`)
  checkHeaders('the page preview', page, 'page')
  checkScripts('the page preview', page)

  const home = await call(`/preview/home/${ID.home}`, withCookie(TOKEN))
  for (const [what, ok] of [
    ['a 200', home.status === 200],
    ['the draft’s title', home.text.includes('<title>A home page title only the check has seen | Colophon</title>')],
    ['the draft’s headline in the hero', /<h1[^>]*data-print-title[^>]*>A headline from a draft\.<\/h1>/.test(home.text)],
    ['the draft’s words', home.text.includes('HOME-MARKER-44d0') && home.text.includes('One card') && home.text.includes('Is this the live home page?') && home.text.includes('A closing heading')],
    ['the bar', /data-preview-source="draft"/.test(home.text)],
    ['noindex', /<meta name="robots" content="noindex">/.test(home.text) && !/rel="canonical"/.test(home.text)],
  ]) expect('journey', ok, `the home preview lacks ${what}`)
  checkHeaders('the home preview', home, 'page')
  checkScripts('the home preview', home)

  const settings = await call(`/preview/site/${ID.site}`, withCookie(TOKEN))
  for (const [what, ok] of [
    ['a 200', settings.status === 200],
    ['the draft’s status line under a post title', /<p class="[^"]*status[^"]*">\s*<strong>Status\.<\/strong> A status line only the check has seen: STATUS-MARKER-0be7\./.test(settings.text)],
    ['the word that it is a sample', settings.text.includes('This page is a sample, not a post.')],
    ['the other settings', settings.text.includes('9.9.9-check') && settings.text.includes('25 November 2026')],
  ]) expect('journey', ok, `the site settings preview lacks ${what}`)
  checkHeaders('the site settings preview', settings, 'page')
  checkScripts('the site settings preview', settings)

  // An entry outside the preview's scope comes back as readers see it, and the bar must not call it a draft.
  const neighbour = await call(`/preview/posts/${ID.other}`, withCookie(TOKEN))
  expect('journey', neighbour.status === 200 && /data-preview-source="published"/.test(neighbour.text) && neighbour.text.includes('published words') && !/Draft preview<\/span>/.test(neighbour.text), 'an entry outside the preview’s scope must be labelled as its published words, not as a draft')

  // A draft the build would refuse: its problems, not a half-drawn page.
  const broken = await call(`/preview/posts/${ID.broken}`, withCookie(TOKEN))
  expect('journey', broken.status === 422 && isNotice(broken, 'This draft can’t be shown yet') && /<strong>Title<\/strong> is too long: at most 49 characters/.test(broken.text) && /<strong>Description<\/strong> is missing/.test(broken.text), `a draft the build would refuse answered ${broken.status} without its problems`)
  expect('journey', checkScripts('the refused draft', broken) === 1 && /data-previewing="true"/.test(broken.text), 'a refused draft still holds a session: the handshake must say previewing')
  checkHeaders('the refused draft', broken, 'page')

  // ---- refusals: a code works once ------------------------------------------------------------
  seen.length = 0
  for (const [why, code] of [['used', CODE], ['unknown', 'cpc_never-issued'], ['empty', ''], ['oversized', `cpc_${'a'.repeat(600)}`]]) {
    const answer = await call(`/api/preview?code=${code}&path=${target}`)
    expect('refusals', answer.status === 404 && isNotice(answer, 'This preview link has expired'), `a ${why} code answered ${answer.status}, not the 404 "expired" page`)
    expect('refusals', answer.text.includes('expired or was already used') && /data-preview-reason="preview_not_found"/.test(answer.text), `a ${why} code: the page doesn't give Colophon's reason`)
    expect('refusals', !answer.headers.has('set-cookie') && !answer.headers.has('location'), `a ${why} code set a cookie or redirected`)
    checkHeaders(`a ${why} code`, answer, 'handler')
    expect('journey', checkScripts(`a ${why} code`, answer) === 0, `a ${why} code: the handler's page must not run the handshake`)
    checkNoSecrets(`a ${why} code`, { ...answer, text: answer.text.replaceAll(`cpc_${'a'.repeat(600)}`, '') })
  }
  expect('refusals', seen.filter((s) => s.path.endsWith('/exchange')).length === 2, 'an empty or oversized code must be refused without asking Colophon; a used and an unknown one are asked once each')

  // ---- ended: Colophon refuses the token --------------------------------------------------------
  for (const [token, status, title, reason, forgets] of [
    ['cpv_expired', 401, 'This preview has ended', 'preview_expired', true],
    ['cpv_revoked', 401, 'This preview has ended', 'preview_revoked', true],
    ['cpv_never_issued', 401, 'This preview has ended', 'preview_invalid', true],
    ['cpv_stale', 409, 'The publish request changed', 'preview_stale', false],
    ['cpv_published', 410, 'This is live now', 'preview_published', false],
    ['cpv_busy', 503, 'Preview is busy', 'unavailable', false],
  ]) {
    const answer = await call(target, withCookie(token))
    expect('ended', answer.status === status && isNotice(answer, title) && new RegExp(`data-preview-reason="${reason}"`).test(answer.text), `${reason}: answered ${answer.status} without the "${title}" page and its reason`)
    expect('ended', showsNothing(answer), `${reason}: shows content`)
    const cleared = answer.headers.get('set-cookie')
    expect('ended', forgets ? cleared === 'colophon_preview=; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=0' : cleared === null, `${reason}: Set-Cookie is ${cleared}`)
    if (status === 503) expect('ended', answer.headers.get('retry-after') === '7', `a busy Colophon: Retry-After is ${answer.headers.get('retry-after')}`)
    checkHeaders(reason, answer, 'page')
    expect('journey', checkScripts(reason, answer) === 1 && /data-previewing="false"/.test(answer.text), `${reason}: the page must tell the Studio it shows no preview`)
  }
  const missing = await call(`/preview/posts/0190a4b0-0000-7000-8000-00000000dead`, withCookie(TOKEN))
  expect('ended', missing.status === 404 && isNotice(missing, 'Nothing to preview here') && showsNothing(missing), `an entry Colophon doesn't have answered ${missing.status}`)
  colophon.oversize(true)
  const huge = await call(target, withCookie(TOKEN))
  colophon.oversize(false)
  expect('ended', huge.status === 502 && isNotice(huge, 'The preview could not be read') && showsNothing(huge), `an answer past the body cap was ${huge.status}: it must be refused, not read`)
  const silent = await call(target, withCookie(TOKEN), { ...env, COLOPHON_API: 'http://127.0.0.1:9' })
  expect('ended', silent.status === 502 && showsNothing(silent), `a Colophon that doesn't answer gave ${silent.status}`)
  const unconfigured = await call(target, withCookie(TOKEN), { ...env, COLOPHON_PROJECT: 'not-a-project' })
  expect('ended', unconfigured.status === 404 && isNotice(unconfigured, 'Draft preview is not set up') && unconfigured.headers.get('x-frame-options') === 'DENY' && directives(unconfigured.headers.get('content-security-policy')).get('frame-ancestors')?.join(' ') === "'none'", 'without a project to preview, the page must stay unframeable like any built page')

  // ---- exit -----------------------------------------------------------------------------------
  for (const [path, want] of [
    [`?path=${encodeURIComponent('/blog/draft-only-post/')}`, '/blog/draft-only-post/'],
    [`?path=${encodeURIComponent('/blog/never-published/')}`, '/'],
    ['', '/'],
    [`?path=${encodeURIComponent('//evil.example/')}`, '/'],
    [`?path=${encodeURIComponent('https://evil.example/')}`, '/'],
    [`?path=${encodeURIComponent(target)}`, '/'],
    [`?path=${encodeURIComponent('/api/preview/exit')}`, '/'],
  ]) {
    const answer = await call(`/api/preview/exit${path}`, withCookie(TOKEN))
    expect('exit', answer.status === 303 && answer.headers.get('location') === want, `exit${path}: ${answer.status} to ${answer.headers.get('location')} (want 303 to ${want})`)
    expect('exit', answer.headers.get('set-cookie') === 'colophon_preview=; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=0', `exit${path}: Set-Cookie is ${answer.headers.get('set-cookie')}`)
    expect('headers', answer.headers.get('cache-control') === 'no-store' && answer.headers.get('x-robots-tag') === 'noindex' && answer.headers.get('referrer-policy') === 'no-referrer', `exit${path} is not no-store, noindex and no-referrer`)
    checkNoSecrets(`exit${path}`, answer)
  }

  // Inside the Studio's frame a redirect to a public page would be refused by that page's own headers.
  const framedExit = await call(`/api/preview/exit?path=${encodeURIComponent('/blog/draft-only-post/')}`, { headers: { cookie: `colophon_preview=${TOKEN}`, 'sec-fetch-dest': 'iframe' } })
  expect('exit', framedExit.status === 200 && isNotice(framedExit, 'You have left the preview') && !framedExit.headers.has('location'), `exit inside a frame answered ${framedExit.status}; it must stay in the frame and say so`)
  expect('exit', framedExit.headers.get('set-cookie') === 'colophon_preview=; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=0', `exit inside a frame: Set-Cookie is ${framedExit.headers.get('set-cookie')}`)
  expect('exit', /<a href="\/blog\/draft-only-post\/" target="_blank" rel="noopener noreferrer">/.test(framedExit.text), 'exit inside a frame must offer the public page in a new tab')
  checkHeaders('exit inside a frame', framedExit, 'handler')
  checkScripts('exit inside a frame', framedExit)

  // ---- token: nothing in the log ----------------------------------------------------------------
  for (const line of logged) {
    for (const [label, secret] of [['token', TOKEN], ['code', CODE], ['a refused token', 'cpv_expired']]) expect('token', !line.includes(secret), `the ${label} is in a log line: ${line.slice(0, 80).replaceAll(secret, '<redacted>')}…`)
  }

  if (failures.length === 0) {
    out(`check-preview: the worker in ${join(dist, '_worker.js').replace(root, '')} against a stand-in for Colophon on 127.0.0.1`)
    out('  journey   ok: code exchanged once, cookie HttpOnly; Secure; SameSite=None; Partitioned for the token’s 15 minutes, 303 to the page; post, page, home and site drafts drawn with the bar and the handshake')
    out(`  refusals  ok: ${leaving.length} paths that leave the site, a POST and a prefetch refused before Colophon is asked; a used, unknown, empty or oversized code gets the "expired" page and no cookie`)
    out('  ended     ok: no cookie reads nothing; an expired, revoked or unknown token clears the cookie; stale, published, busy, silent and oversized answers each say so; never a draft or the published page')
    out(`  headers   ok: every answer no-store and noindex; framable by ${STUDIO} only; the public policy plus one hash (${handshakeHash}); every script on a preview page is in its policy`)
    out('  token     ok: in no HTML, no header but Set-Cookie, no redirect and none of the ' + logged.length + ' log lines')
    out('  address   ok: only the four collections and UUIDs are read; anything else is left to the static files or answered 404 unread')
    out('  exit      ok: cookie cleared with the attributes that set it; goes to a public page that exists, else /; inside a frame it stays and says so')
    out(`  (the first exchange and render took ${firstRenderMs} ms here, cold; a laptop observation, not Cloudflare's)`)
  }
} finally {
  await colophon.close()
}

if (failures.length) {
  process.stderr.write(`check-preview: ${failures.length} failure(s)\n\n${failures.map((f) => `  ${f}`).join('\n')}\n`)
  process.exit(1)
}
