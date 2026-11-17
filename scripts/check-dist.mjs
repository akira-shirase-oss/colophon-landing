// Checks the built site before it ships. Run after `npm run build`:
//
//   node scripts/check-dist.mjs [dir]     (dir defaults to dist/)
//
// headers  dist/_headers sends the security headers, and its Content-Security-Policy allows exactly
//          what the built pages use: a hash for every inline script and no stale ones, same-origin
//          images, fonts and stylesheets, no inline event handlers.
// leaks    nothing private ships: no source maps, env or git files, dev-server paths, local paths,
//          the build user's name or home directory, names listed in LEAK_SCAN_NAMES (comma-separated,
//          kept out of the repo), or credential-shaped strings.
// drafts   no `draft: true` post is built, linked, or named in the feed or sitemap.
// links    every target="_blank" link carries rel="noopener" or rel="noreferrer".
//
// Exits 1 and lists every failure, or prints one line per check that passed.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir, userInfo } from 'node:os'
import { extname, join, relative, resolve, sep } from 'node:path'
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
// leaks: nothing private in the build

const TEXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.svg', '.webmanifest', '.map', '.md', ''])

function checkLeaks() {
  const forbiddenFiles = [
    [/\.map$/, 'a source map'],
    [/(^|\/)\.env($|\.)/, 'an env file'],
    [/(^|\/)\.git($|\/)/, 'git metadata'],
    [/(^|\/)(\.DS_Store|\.npmrc|Thumbs\.db)$/, 'a local or credentials file'],
    [/\.(log|pem|key|p12|pfx|sqlite3?|db|bak|swp)$/, 'a log, key, database or backup file'],
    [/(^|\/)node_modules\//, 'node_modules'],
    [/(^|\/)(package(-lock)?\.json|tsconfig\.json|astro\.config\.mjs)$/, 'project config'],
    [/(^|\/)src\//, 'source files'],
  ]
  for (const file of files.map(rel)) {
    for (const [pattern, what] of forbiddenFiles) if (pattern.test(file)) fail('leaks', `${file} is ${what}`)
  }

  // The build user's own name and home directory (a generic CI account name is skipped: "runner"
  // is also an English word), plus private names from the environment, never from this repo.
  const generic = new Set(['runner', 'root', 'ubuntu', 'node', 'user', 'admin', 'build', 'ci', 'vscode', 'codespace'])
  const user = userInfo().username
  const names = [
    homedir(),
    ...(user.length >= 3 && !generic.has(user.toLowerCase()) ? [user] : []),
    ...(process.env.LEAK_SCAN_NAMES ?? '').split(',').map((n) => n.trim()).filter((n) => n.length >= 3),
  ]
  const nameHits = (text) => names.filter((n) => text.toLowerCase().includes(n.toLowerCase()))

  // Checked in every file, images and fonts included: metadata can carry paths and names.
  const everywhere = [
    [/\/Users\/[^/\s"'<>]+\//, 'a macOS home path'],
    [/\/home\/[^/\s"'<>]+\//, 'a Linux home path'],
    [/[A-Za-z]:\\\\?Users\\\\?/, 'a Windows home path'],
    [/file:\/\/\//, 'a file:// URL'],
  ]
  // Checked in text files.
  const inText = [
    [/sourceMappingURL=/, 'a source map reference'],
    [/\/@fs\/|\/@vite\/|\/@id\//, 'a Vite dev-server path'],
    [/data-astro-source-(file|loc)/, 'an Astro dev annotation (it holds absolute paths)'],
    [/\b(AKIA|ASIA)[0-9A-Z]{16}\b/, 'an AWS access key'],
    [/-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/, 'a private key'],
    [/\bgh[pousr]_[A-Za-z0-9]{36,}/, 'a GitHub token'],
    [/\bgithub_pat_[A-Za-z0-9_]{40,}/, 'a GitHub token'],
    [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, 'a Slack token'],
    [/\b[rs]k_live_[A-Za-z0-9]{16,}/, 'a Stripe live key'],
    [/\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,}/, 'an OpenAI or Anthropic key'],
    [/\bAIza[0-9A-Za-z_-]{35}\b/, 'a Google API key'],
    [/\bnpm_[A-Za-z0-9]{36}\b/, 'an npm token'],
    [/\bcolophon_api_[A-Za-z0-9_-]{16,}/, 'a Colophon API token'],
    [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'a JWT'],
  ]

  for (const path of files) {
    const file = rel(path)
    const bytes = readFileSync(path).toString('latin1')
    for (const [pattern, what] of everywhere) if (pattern.test(bytes)) fail('leaks', `${file} contains ${what}`)
    for (const hit of nameHits(bytes)) fail('leaks', `${file} contains a private name (${hit.length} characters, not printed)`)
    if (!TEXT.has(extname(file)) && !file.endsWith('_headers')) continue
    const text = readFileSync(path, 'utf8')
    for (const [pattern, what] of inText) if (pattern.test(text)) fail('leaks', `${file} contains ${what}`)
  }
  return names.length
}

// ---------------------------------------------------------------------------------------------
// drafts: posts marked `draft: true` never reach the build

function checkDrafts() {
  const dir = join(root, 'src', 'content', 'blog')
  if (!existsSync(dir)) return 0
  const drafts = []
  for (const name of readdirSync(dir, { recursive: true })) {
    if (!/\.mdx?$/.test(name)) continue
    const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(join(dir, name), 'utf8'))?.[1] ?? ''
    if (!/^draft:\s*true\s*$/m.test(front)) continue
    const field = (key) => new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(front)?.[1].trim().replace(/^(['"])(.*)\1$/, '$2')
    drafts.push({ id: field('slug') ?? name.replace(/\.mdx?$/, '').split(sep).join('/'), title: field('title') })
  }
  const texts = files.filter((f) => TEXT.has(extname(f))).map((f) => ({ file: rel(f), text: readFileSync(f, 'utf8') }))
  for (const { id, title } of drafts) {
    if (existsSync(join(dist, 'blog', id))) fail('drafts', `the draft "${id}" was built at blog/${id}/`)
    for (const { file, text } of texts) {
      if (text.includes(`/blog/${id}`)) fail('drafts', `${file} links to the draft "${id}"`)
      const escaped = title?.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      if (title && (text.includes(title) || text.includes(escaped))) fail('drafts', `${file} names the draft "${title}"`)
    }
  }
  return drafts.length
}

// ---------------------------------------------------------------------------------------------
// links: new tabs never get a handle on this page

function checkLinks() {
  for (const page of html) {
    for (const tag of tagsOf(page.text)) {
      if (tag.name !== 'a' || (tag.attrs.get('target') ?? '').toLowerCase() !== '_blank') continue
      const rel = (tag.attrs.get('rel') ?? '').toLowerCase().split(/\s+/)
      if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
        fail('links', `${page.file}: <a target="_blank" href="${tag.attrs.get('href')}"> needs rel="noopener" or rel="noreferrer"`)
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------

checkHeaders()
const namesScanned = checkLeaks()
const draftCount = checkDrafts()
checkLinks()

if (failures.length) {
  console.error(`check-dist: ${failures.length} failure(s) in ${dist}\n`)
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log(`check-dist: ${html.length} pages, ${files.length} files in ${relative(root, dist) || dist}`)
console.log('  headers  ok: _headers present, CSP covers every inline script and asset')
console.log(`  leaks    ok: no private files, paths, ${namesScanned} private names or credential shapes`)
console.log(`  drafts   ok: ${draftCount} draft post(s), none built, linked or named`)
console.log('  links    ok: every target="_blank" link has noopener or noreferrer')
