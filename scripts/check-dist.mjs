// Checks the built site before it ships. Run after `npm run build`:
//
//   node scripts/check-dist.mjs [dir]     (dir defaults to dist/)
//
// headers  dist/_headers sends the security headers, and its Content-Security-Policy allows exactly
//          what the built pages use: a hash for every inline script and no stale ones, same-origin
//          images, fonts and stylesheets, no inline event handlers.
//
// Exits 1 and lists every failure, or prints one line per check that passed.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = resolve(process.argv[2] ?? join(root, 'dist'))
const site = 'https://colophon.404human.dev'

const failures = []
const fail = (check, message) => failures.push(`[${check}] ${message}`)

if (!existsSync(join(dist, 'index.html'))) {
  console.error(`No build at ${dist}. Run npm run build first.`)
  process.exit(1)
}

// ---------------------------------------------------------------------------------------------
// The built files

const files = (function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  )
})(dist)
const rel = (file) => relative(dist, file)
const html = files.filter((f) => extname(f) === '.html').map((f) => ({ file: rel(f), text: readFileSync(f, 'utf8') }))
const css = files.filter((f) => extname(f) === '.css').map((f) => ({ file: rel(f), text: readFileSync(f, 'utf8') }))

// ---------------------------------------------------------------------------------------------
// A small HTML reader: enough for Astro's output, not a general parser.

/** Every <script>: its attributes and its raw text, which is exactly what a browser hashes. */
const scriptsOf = (text) =>
  [...text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map((m) => ({
    attrs: attributes(m[1]),
    body: m[2],
  }))

/** Every <style> element's text. */
const stylesOf = (text) => [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((m) => m[1])

/** Every start tag outside comments, scripts and styles, as { name, attrs }. */
function tagsOf(text) {
  const markup = text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, '$1')
    .replace(/(<style\b[^>]*>)[\s\S]*?<\/style\s*>/gi, '$1')
  return [...markup.matchAll(/<([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g)].map(
    (m) => ({ name: m[1].toLowerCase(), attrs: attributes(m[2]) }),
  )
}

function attributes(source) {
  const attrs = new Map()
  for (const m of source.matchAll(/([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const name = m[1].toLowerCase()
    if (!attrs.has(name)) attrs.set(name, decode(m[2] ?? m[3] ?? m[4] ?? ''))
  }
  return attrs
}

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

const sha256 = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`

/** Script types a browser runs, and so the CSP governs. Anything else (JSON-LD) is a data block. */
const JS_TYPES = new Set(['', 'module', 'importmap', 'speculationrules', 'text/javascript', 'application/javascript'])
const runs = (script) => JS_TYPES.has((script.attrs.get('type') ?? '').trim().toLowerCase())

/** Relative URLs and the site's own origin are same-origin; everything else is not. */
const sameOrigin = (url) => {
  const u = url.trim()
  if (u === '' || u.startsWith('#')) return true
  if (u.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(u)) return u === site || u.startsWith(`${site}/`)
  return true
}

// ---------------------------------------------------------------------------------------------
// headers: dist/_headers

function checkHeaders() {
  const path = join(dist, '_headers')
  if (!existsSync(path)) {
    fail('headers', 'dist/_headers is missing: put the security headers in public/_headers')
    return
  }
  const text = readFileSync(path, 'utf8')
  const source = join(root, 'public', '_headers')
  if (existsSync(source) && readFileSync(source, 'utf8') !== text) {
    fail('headers', 'dist/_headers differs from public/_headers: rebuild')
  }

  // Cloudflare Pages syntax: an unindented path line, then indented `Name: value` lines.
  // Limits: 100 rules, 2,000 characters a line (https://developers.cloudflare.com/pages/configuration/headers/).
  const rules = []
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.length > 2000) fail('headers', `_headers line ${i + 1} is ${line.length} characters; Cloudflare's limit is 2,000`)
    const t = line.trim()
    if (t === '' || t.startsWith('#')) return
    if (!/^\s/.test(line)) return void rules.push({ path: t, headers: [] })
    const m = /^([A-Za-z0-9-]+):\s*(.+)$/.exec(t)
    if (!rules.length || !m) return void fail('headers', `_headers line ${i + 1} is not a header line: ${t}`)
    rules.at(-1).headers.push([m[1].toLowerCase(), m[2].trim()])
  })
  if (rules.length > 100) fail('headers', `_headers has ${rules.length} rules; Cloudflare's limit is 100`)

  // Pages joins a header set by two matching rules with a comma, which for a CSP means two policies.
  const cspRules = rules.filter((r) => r.headers.some(([n]) => n === 'content-security-policy'))
  if (cspRules.length > 1) fail('headers', 'Content-Security-Policy is set by more than one rule')

  const all = rules.find((r) => r.path === '/*')
  if (!all) return void fail('headers', 'no `/*` rule, so some responses would go out without the headers')
  const get = (name) => {
    const values = all.headers.filter(([n]) => n === name).map(([, v]) => v)
    if (values.length > 1) fail('headers', `${name} is set twice in the /* rule`)
    return values[0]
  }

  const expect = (name, ok, want) => {
    const value = get(name)
    if (value === undefined) fail('headers', `missing ${name} (want ${want})`)
    else if (!ok(value)) fail('headers', `${name}: ${value} (want ${want})`)
  }
  expect('x-content-type-options', (v) => v === 'nosniff', 'nosniff')
  expect('x-frame-options', (v) => v === 'DENY', 'DENY')
  expect(
    'strict-transport-security',
    (v) => Number(/max-age=(\d+)/.exec(v)?.[1] ?? 0) >= 31536000,
    'max-age of at least a year',
  )
  expect(
    'referrer-policy',
    (v) => ['strict-origin-when-cross-origin', 'strict-origin', 'same-origin', 'no-referrer'].includes(v),
    'strict-origin-when-cross-origin or stricter',
  )
  expect('permissions-policy', (v) => /camera=\(\)/.test(v) && /microphone=\(\)/.test(v), 'camera=(), microphone=() at least')
  expect('cross-origin-opener-policy', (v) => v === 'same-origin', 'same-origin')

  const csp = get('content-security-policy')
  if (csp === undefined) return void fail('headers', 'missing Content-Security-Policy')
  checkPolicy(csp)
}

function checkPolicy(csp) {
  const policy = new Map()
  for (const part of csp.split(';').map((p) => p.trim()).filter(Boolean)) {
    const [name, ...sources] = part.split(/\s+/)
    if (policy.has(name.toLowerCase())) fail('csp', `${name} appears twice; browsers ignore the second`)
    else policy.set(name.toLowerCase(), sources)
  }
  const is = (name, want) => {
    const got = policy.get(name)?.join(' ')
    if (got !== want) fail('csp', `${name} is ${got === undefined ? 'missing' : `"${got}"`} (want "${want}")`)
  }
  is('default-src', "'none'")
  is('base-uri', "'none'")
  is('form-action', "'none'")
  is('frame-ancestors', "'none'")
  if (policy.has('object-src')) is('object-src', "'none'")

  // script-src: same-origin files and hashed inline scripts, nothing else.
  const scriptSrc = policy.get('script-src')
  if (!scriptSrc) return void fail('csp', "missing script-src (want 'self' plus hashes)")
  for (const s of scriptSrc) {
    if (s !== "'self'" && !/^'sha(256|384|512)-[A-Za-z0-9+/]+={0,2}'$/.test(s)) {
      fail('csp', `script-src allows ${s}; only 'self' and hashes are allowed`)
    }
  }
  const allowed = new Set(scriptSrc.filter((s) => s.startsWith("'sha")))
  const needed = new Map()
  for (const page of html) {
    for (const script of scriptsOf(page.text)) {
      if (script.attrs.has('src')) {
        if (!sameOrigin(script.attrs.get('src'))) fail('csp', `${page.file} loads a script from ${script.attrs.get('src')}`)
      } else if (runs(script)) {
        const hash = sha256(script.body)
        if (!needed.has(hash)) needed.set(hash, { page: page.file, excerpt: script.body.trim().slice(0, 70) })
      }
    }
  }
  for (const [hash, { page, excerpt }] of needed) {
    if (!allowed.has(hash)) fail('csp', `inline script in ${page} is not allowed; review it, then add ${hash} to script-src: ${excerpt}…`)
  }
  for (const hash of allowed) {
    if (!needed.has(hash)) fail('csp', `script-src allows ${hash}, which no page uses: remove it`)
  }

  // style-src: Shiki's code colours are style attributes and Astro inlines small stylesheets, so
  // inline styles need 'unsafe-inline'. A hash or nonce next to it would make browsers ignore it.
  const styleSrc = policy.get('style-src') ?? []
  const inlineStyles = html.some((p) => stylesOf(p.text).length > 0 || tagsOf(p.text).some((t) => t.attrs.has('style')))
  if (!styleSrc.includes("'self'")) fail('csp', "style-src lacks 'self', so /_astro/*.css would be blocked")
  if (inlineStyles && !styleSrc.includes("'unsafe-inline'")) fail('csp', "the pages use inline styles, but style-src lacks 'unsafe-inline'")
  if (styleSrc.some((s) => /^'(sha\d+|nonce)-/.test(s))) fail('csp', "style-src has a hash or nonce, which disables its 'unsafe-inline'")
  for (const name of ['img-src', 'font-src']) {
    const sources = policy.get(name) ?? []
    if (!sources.includes("'self'")) fail('csp', `${name} lacks 'self', so the self-hosted files would be blocked`)
    for (const s of sources) if (s !== "'self'") fail('csp', `${name} allows ${s}; the site only loads its own files`)
  }

  // What the policy would block or can't express, page by page.
  for (const page of html) {
    for (const tag of tagsOf(page.text)) {
      for (const [name, value] of tag.attrs) {
        if (/^on[a-z]+$/.test(name)) fail('csp', `${page.file}: <${tag.name} ${name}> is an inline handler, which script-src blocks`)
        if (/^\s*javascript:/i.test(value)) fail('csp', `${page.file}: <${tag.name} ${name}="javascript:…">, which script-src blocks`)
      }
      if (['iframe', 'frame', 'object', 'embed'].includes(tag.name)) fail('csp', `${page.file}: <${tag.name}>, which default-src 'none' blocks`)
      if (tag.name === 'form') fail('csp', `${page.file}: a <form>, which form-action 'none' blocks`)
      const urls = []
      if (['img', 'source', 'video', 'audio', 'track'].includes(tag.name)) {
        if (tag.attrs.has('src')) urls.push(tag.attrs.get('src'))
        if (tag.attrs.has('srcset')) urls.push(...tag.attrs.get('srcset').split(',').map((c) => c.trim().split(/\s+/)[0]))
      }
      const rel = (tag.attrs.get('rel') ?? '').toLowerCase().split(/\s+/)
      if (tag.name === 'link' && rel.some((r) => ['stylesheet', 'preload', 'modulepreload', 'icon'].includes(r))) {
        urls.push(tag.attrs.get('href') ?? '')
      }
      for (const url of urls) {
        if (!sameOrigin(url)) fail('csp', `${page.file}: <${tag.name}> loads ${url} from another origin`)
      }
    }
  }
  for (const sheet of [...css, ...html.flatMap((p) => stylesOf(p.text).map((text) => ({ file: p.file, text })))]) {
    for (const m of sheet.text.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/g)) {
      if (!sameOrigin(m[2])) fail('csp', `${sheet.file}: url(${m[2]}) is not a same-origin file`)
    }
    for (const m of sheet.text.matchAll(/@import\s+(?:url\()?\s*['"]?([^'");\s]+)/g)) {
      if (!sameOrigin(m[1])) fail('csp', `${sheet.file}: @import ${m[1]} is not a same-origin file`)
    }
  }
  return needed.size
}

// ---------------------------------------------------------------------------------------------

checkHeaders()

if (failures.length) {
  console.error(`check-dist: ${failures.length} failure(s) in ${dist}\n`)
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log(`check-dist: ${html.length} pages, ${files.length} files in ${relative(root, dist) || dist}`)
console.log('  headers  ok: _headers present, CSP covers every inline script and asset')
