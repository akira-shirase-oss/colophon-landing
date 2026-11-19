// The performance budget for pages built from src/content/pages (comparisons, and later features, use cases,
// guides and hubs). Run after the build; any miss fails:
//
//   node scripts/check-budget.mjs [dir]      (dir defaults to dist/)
//
// - HTML: at most 60 KB gzipped per page.
// - CSS: no stylesheet and no <style> block of its own. Every stylesheet must be one a blog post already
//   loads, and the page's total CSS, gzipped, may not exceed CSS_BUDGET_GZ (what a blog post loads today).
// - JS: no script of its own. Every script (inline, by hash, or by src) must be one a blog post already
//   runs: the theme script and the header's. Cloudflare's analytics beacon is added by the host, not here.
// - Images: AVIF or WebP (SVG for icons), explicit width and height, lazy unless it is the first one, and
//   at most IMAGE_BUDGET bytes each. The numbers are in scripts/budget-config.mjs.
// - Links: at least MIN_LINKS internal links out of the page's article, and at least MIN_LINKS other pages
//   linking to it from their own <main> (header and footer links don't count), so no page is an orphan.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { CSS_BUDGET_GZ, HTML_BUDGET_GZ, IMAGE_BUDGET, MIN_LINKS, SECTIONS } from './budget-config.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = resolve(process.argv[2] ?? join(root, 'dist'))
const site = 'https://colophon.404human.dev'
const failures = []
const fail = (page, message) => failures.push(`${page}: ${message}`)

const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]))
const pages = walk(dist).filter((f) => f.endsWith('.html'))
const urlOf = (file) => '/' + relative(dist, file).replace(/index\.html$/, '')
const read = (file) => readFileSync(file, 'utf8')

const stylesheets = (html) => [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1])
const styleBlocks = (html) => [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
const scripts = (html) =>
  [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attrs]) => !/type\s*=\s*"application\/ld\+json"/i.test(attrs))
    .map(([, attrs, body]) => attrs.match(/\bsrc="([^"]+)"/)?.[1] ?? `inline:${createHash('sha256').update(body).digest('base64')}`)
const sectionOf = (html, tag) => html.match(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`))?.[0] ?? ''
const internalLinks = (fragment, self) =>
  new Set(
    [...fragment.matchAll(/<a\b[^>]*href="([^"#]+)/g)]
      .map((m) => new URL(m[1], site + self))
      .filter((u) => u.origin === site && u.pathname !== self)
      .map((u) => u.pathname),
  )

// What a blog post already loads: the reference every new page is held to.
const posts = pages.filter((f) => /^blog\/[^/]+\/index\.html$/.test(relative(dist, f)))
if (posts.length === 0) fail('dist', 'no blog post was built, so there is nothing to compare against')
const allowedCss = new Set(posts.flatMap((f) => stylesheets(read(f))))
const allowedJs = new Set(posts.flatMap((f) => scripts(read(f))))
const allowedStyleBlocks = new Set(posts.flatMap((f) => styleBlocks(read(f))))

const targets = pages.filter((f) => SECTIONS.some((s) => relative(dist, f).startsWith(`${s}/`)))
const inbound = new Map(targets.map((f) => [urlOf(f), new Set()]))
for (const file of pages) {
  const html = read(file)
  for (const link of internalLinks(sectionOf(html, 'main'), urlOf(file))) inbound.get(link)?.add(urlOf(file))
}

for (const file of targets) {
  const page = urlOf(file)
  const html = read(file)
  const gz = gzipSync(html).length
  if (gz > HTML_BUDGET_GZ) fail(page, `HTML is ${gz} bytes gzipped (budget ${HTML_BUDGET_GZ})`)

  let cssGz = 0
  for (const href of stylesheets(html)) {
    if (!allowedCss.has(href)) fail(page, `loads its own stylesheet ${href}; pages reuse the blog's CSS`)
    const path = join(dist, href)
    if (existsSync(path)) cssGz += gzipSync(readFileSync(path)).length
  }
  for (const block of styleBlocks(html)) {
    if (!allowedStyleBlocks.has(block)) fail(page, `has a <style> block of its own (${block.trim().slice(0, 60)}…)`)
    cssGz += gzipSync(block).length
  }
  if (cssGz > CSS_BUDGET_GZ) fail(page, `CSS is ${cssGz} bytes gzipped (budget ${CSS_BUDGET_GZ})`)

  for (const script of scripts(html)) {
    if (!allowedJs.has(script)) fail(page, `runs a script of its own (${script.slice(0, 60)}); pages add no JavaScript`)
  }

  const images = [...html.matchAll(/<img\b([^>]*)>/g)].map((m) => m[1])
  images.forEach((attrs, i) => {
    const src = attrs.match(/\bsrc="([^"]+)"/)?.[1] ?? ''
    if (!/\.(avif|webp|svg)(\?|$)/i.test(src)) fail(page, `image ${src} is not AVIF, WebP or SVG`)
    if (!/\bwidth="\d+"/.test(attrs) || !/\bheight="\d+"/.test(attrs)) fail(page, `image ${src} lacks a width and height`)
    if (i > 0 && !/\bloading="lazy"/.test(attrs)) fail(page, `image ${src} is below the first and isn't lazy`)
    const path = join(dist, src.split('?')[0])
    if (src.startsWith('/') && existsSync(path) && statSync(path).size > IMAGE_BUDGET) fail(page, `image ${src} is ${statSync(path).size} bytes (budget ${IMAGE_BUDGET})`)
  })

  const out = internalLinks(sectionOf(html, 'article'), page)
  if (out.size < MIN_LINKS) fail(page, `links to ${out.size} other pages of the site from its article (want at least ${MIN_LINKS})`)
  const into = inbound.get(page)
  if (into.size < MIN_LINKS) fail(page, `${into.size} pages link to it from their content (want at least ${MIN_LINKS}): ${[...into].join(', ') || 'none'}`)
}

if (targets.length === 0) fail('dist', `no page under ${SECTIONS.join(', ')} was built`)
if (failures.length > 0) {
  console.error(`check-budget: ${failures.length} miss(es)\n${failures.map((f) => `  - ${f}`).join('\n')}`)
  process.exit(1)
}
console.log(`check-budget: ${targets.length} page(s) under ${SECTIONS.join(', ')}: HTML ≤ ${HTML_BUDGET_GZ / 1024} KB gzipped, the blog's CSS only (≤ ${CSS_BUDGET_GZ} B), no script of their own, images in budget, ≥ ${MIN_LINKS} links in and out`)
