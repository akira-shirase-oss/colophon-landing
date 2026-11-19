// src/styles/tokens.css is a byte copy of colophon-cms design/tokens.css (D-210): the site never edits it. These
// pin its bytes and the Geist Pixel subset it names. CI also fetches the source at COLOPHON_REF and compares
// (.github/workflows/ci.yml), so a copy can't drift from the commit it claims. Adopting a token change is a
// deliberate step: copy the file again, move COLOPHON_REF and the hash below together.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** The colophon-cms commit the copy comes from (release/train-alpha1); a release tag once there is one. */
export const COLOPHON_REF = '15b283db0391cff47fab8ac2d9fbf3d0e46b582a'
const TOKENS_SHA256 = '67639559251246553e5fd3dc0cb16a7f1953d6ae9293fa962eae68444f6f2b3c'
/** Recorded in the source's own header. */
const GEIST_PIXEL_SHA256 = 'a50494ed7ca60a21f2ffb7fd93bc996aaa7b5a2f0246184543ad0dfd5f557ed5'

const sha = (path) => createHash('sha256').update(readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)))).digest('hex')

test('tokens.css is the pinned byte copy of colophon-cms design/tokens.css', () => {
  assert.equal(sha('src/styles/tokens.css'), TOKENS_SHA256, `src/styles/tokens.css changed: copy colophon-cms design/tokens.css at ${COLOPHON_REF} again, never edit it`)
})

test('the Geist Pixel subset is the one the tokens name', () => {
  assert.equal(sha('public/fonts/geist-pixel-latin.woff2'), GEIST_PIXEL_SHA256)
  assert.match(readFileSync(fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)), 'utf8'), new RegExp(GEIST_PIXEL_SHA256))
})

test('the global styles load the tokens, then the site layer over them', () => {
  const css = readFileSync(fileURLToPath(new URL('../src/styles/global.css', import.meta.url)), 'utf8')
  const tokens = css.indexOf("@import './tokens.css';")
  const theme = css.indexOf("@import './theme.css';")
  assert.ok(tokens >= 0 && theme > tokens, 'tokens.css first, then theme.css')
})
