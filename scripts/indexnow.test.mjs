// Which addresses IndexNow is told about, for which changed files; and the key file.
//
//   npm test
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { SITE, keyOf, urlsFor } from './indexnow.mjs'

const all = [`${SITE}/`, `${SITE}/blog/`, `${SITE}/blog/a/`, `${SITE}/compare/`]

test('a changed post sends itself and the blog index', () => {
  assert.deepEqual(urlsFor([{ path: 'src/content/blog/a.md', text: 'x' }], all), [`${SITE}/blog/`, `${SITE}/blog/a/`])
})

test('a deleted post is still sent, so engines see it gone', () => {
  assert.deepEqual(urlsFor([{ path: 'src/content/blog/gone.md' }], all), [`${SITE}/blog/`, `${SITE}/blog/gone/`])
})

test('pages go to their section, with the section index; a hub to its own address', () => {
  assert.deepEqual(urlsFor([{ path: 'src/content/pages/x.md', text: '---\nkind: compare\n---' }], all), [`${SITE}/compare/`, `${SITE}/compare/x/`])
  assert.deepEqual(urlsFor([{ path: 'src/content/pages/y.md', text: 'kind: use-case' }], all), [`${SITE}/use-cases/`, `${SITE}/use-cases/y/`])
  assert.deepEqual(urlsFor([{ path: 'src/content/pages/compare.md', text: 'kind: hub' }], all), [`${SITE}/compare/`])
})

test('a layout, style, config or public file sends every address; docs and scripts send none', () => {
  for (const path of ['src/layouts/Base.astro', 'src/styles/global.css', 'astro.config.mjs', 'public/_headers']) {
    assert.deepEqual(urlsFor([{ path, text: '' }], all), [...all].sort(), path)
  }
  assert.deepEqual(urlsFor([{ path: 'README.md' }, { path: 'scripts/check-dist.mjs' }, { path: 'docs/screens/a.webp' }], all), [])
})

test('the key is the one public/<32 hex>.txt that holds its own name', () => {
  const dir = mkdtempSync(join(tmpdir(), 'indexnow-'))
  const key = '0123456789abcdef0123456789abcdef'
  writeFileSync(join(dir, `${key}.txt`), key)
  writeFileSync(join(dir, 'robots.txt'), 'x')
  assert.equal(keyOf(dir), key)
  writeFileSync(join(dir, `${key}.txt`), 'something else')
  assert.throws(() => keyOf(dir))
  rmSync(dir, { recursive: true, force: true })
})

test('the committed key file is valid', () => {
  assert.match(keyOf(), /^[0-9a-f]{32}$/)
})

test('a list file gives only this site\'s addresses, each once', async () => {
  const { urlsOf, SITE } = await import('./indexnow.mjs')
  assert.deepEqual(urlsOf(`${SITE}/blog/a/\n\n  ${SITE}/blog/a/  \nhttps://elsewhere.example/x\n${SITE}.evil.example/\n${SITE}/\n`), [`${SITE}/`, `${SITE}/blog/a/`])
})
