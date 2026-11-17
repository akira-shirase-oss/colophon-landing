// The site builder illustration in "What's built" renders a page with the renderer copied from
// Colophon. It must stay a picture: no live links, no headings that join the landing page's
// outline, styles kept inside its own shadow root. And the theme card's "Passes AA" must be true
// of the starter palette, computed the way the Studio's design sheet computes it.
//
//   npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canvas, contrast, STARTER_THEME, UnrenderableSite } from '../src/studio-ui/site-renderer.ts'

const page = canvas(
  STARTER_THEME,
  [{ label: 'Home', href: '/' }],
  [
    { _block: 'hero', heading: 'Hello <b>', tagline: 'A tagline', label: 'Start', url: 'https://example.com/' },
    { _block: 'features', heading: 'Rows', items: [{ title: 'One', text: 'First' }] },
    { _block: 'cta', heading: 'Go', label: 'Read', url: '/about', style: { scheme: 'primary', align: 'center' } },
  ],
)

test('the canvas is a declarative shadow root with the theme on its host', () => {
  assert.match(page, /^<template shadowrootmode="open"><style>:host\{display:block;--site-primary:#6d28d9;/)
  assert.ok(page.endsWith('</div></template>'))
  assert.ok(!page.includes(':root'), 'no rule may reach the landing page itself')
  assert.ok(!/(^|[}\n])body\{/.test(page), 'the document body rule becomes the wrapper rule')
})

test('links are inert and headings are marked paragraphs', () => {
  assert.ok(!page.includes('href='), 'no link in the picture goes anywhere')
  assert.ok(!/<\/?h[1-6][\s>]/.test(page), 'no heading joins the outline')
  assert.ok(page.includes('<p data-h="1">Hello &lt;b&gt;</p>'), 'content stays escaped')
  assert.ok(page.includes('[data-h="1"]{font-size:2.5rem}'))
  assert.ok(page.includes('data-scheme="primary"'))
})

test('a section kind the renderer does not know is refused, as in Colophon', () => {
  assert.throws(() => canvas(STARTER_THEME, [], [{ _block: 'carousel' }]), UnrenderableSite)
  assert.throws(() => canvas({ light: { primary: 'purple' } }, [], []), UnrenderableSite)
})

test("the starter theme's pairs pass WCAG AA, as the theme card says", () => {
  const { text, surface, muted, primary, secondary } = STARTER_THEME.light
  const pairs = [
    [text, surface],
    [surface, text],
    [muted, surface],
    ['#ffffff', primary],
    [primary, surface],
    ['#ffffff', secondary],
  ]
  for (const [fg, bg] of pairs) assert.ok(contrast(fg, bg) >= 4.5, `${fg} on ${bg} is ${contrast(fg, bg).toFixed(2)}:1`)
  assert.equal(contrast(text, surface).toFixed(1), '17.7')
  assert.equal(contrast('#ffffff', primary).toFixed(1), '7.1')
  assert.equal(contrast(muted, surface).toFixed(1), '4.8')
})
