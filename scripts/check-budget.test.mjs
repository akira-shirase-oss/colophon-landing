// The budget check passes a page that reuses a blog post's CSS and scripts, and fails one that brings its own.
//
//   npm test
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./check-budget.mjs', import.meta.url))
const shared = '<link rel="stylesheet" href="/_astro/blog.css"><script>theme()</script>'
const page = (body) => `<!doctype html><html><head>${shared}</head><body><main><article>${body}</article></main></body></html>`
const links = (...to) => to.map((href) => `<a href="${href}">x</a>`).join('')

function site(extra = '') {
  const dir = mkdtempSync(join(tmpdir(), 'budget-'))
  const put = (path, html) => {
    mkdirSync(join(dir, path), { recursive: true })
    writeFileSync(join(dir, path, 'index.html'), html)
  }
  mkdirSync(join(dir, '_astro'))
  writeFileSync(join(dir, '_astro', 'blog.css'), 'body{margin:0}')
  for (const n of ['a', 'b', 'c']) put(`blog/${n}`, page(links('/compare/x/', '/blog/a/', '/blog/b/')))
  put('compare/x', page(links('/blog/a/', '/blog/b/', '/blog/c/') + extra))
  return dir
}
const run = (dir) => spawnSync(process.execPath, [script, dir], { encoding: 'utf8' })

test('a page that reuses the blog CSS and scripts and is linked both ways passes', () => {
  const dir = site()
  const result = run(dir)
  rmSync(dir, { recursive: true, force: true })
  assert.equal(result.status, 0, result.stderr)
})

test('its own script, style, a PNG without dimensions, or a missing image budget fails', () => {
  const dir = site('<script>track()</script><style>.x{}</style><img src="/a.png">')
  const result = run(dir)
  rmSync(dir, { recursive: true, force: true })
  assert.equal(result.status, 1)
  for (const want of ['script of its own', '<style> block of its own', 'not AVIF, WebP or SVG', 'lacks a width and height']) {
    assert.match(result.stderr, new RegExp(want.replace(/[<>]/g, '.')))
  }
})

test('an orphan page fails', () => {
  const dir = site()
  for (const n of ['a', 'b', 'c']) writeFileSync(join(dir, 'blog', n, 'index.html'), page(links('/blog/a/', '/blog/b/', '/blog/c/')))
  const result = run(dir)
  rmSync(dir, { recursive: true, force: true })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /0 pages link to it/)
})
