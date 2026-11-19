// The contrast table in `npm test`: every text pair the site draws reads at 4.5:1 and every boundary at 3:1, in
// light and in dark (scripts/design-contrast.mjs has the pairs and the measuring).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { table, themes, ground, ratio } from './design-contrast.mjs'

test('every pair meets its bar in both themes', () => {
  const rows = table()
  assert.ok(rows.length > 100, `measured ${rows.length} pairs`)
  const failed = rows.filter((r) => !r.pass).map((r) => `${r.theme} --${r.fg} on --${r.bg}: ${r.r.toFixed(2)}:1 (bar ${r.bar})`)
  assert.deepEqual(failed, [])
})

test('the measure itself: black on white, a tint over a base, a pair that fails', () => {
  assert.equal(ratio('#000000', '#ffffff').toFixed(2), '21.00')
  assert.equal(ground({ ink: '#000000', paper: '#ffffff' }, 'ink/20 over paper'), '#CCCCCC')
  // A muted grey that reads on white but not on a grey panel: the table must catch it.
  const t = themes()
  const probe = { light: { ...t.light, 'c-text': '#8c8c8c' }, dark: t.dark }
  assert.ok(table(probe).some((r) => !r.pass && r.fg === 'c-text'), 'a low-contrast --c-text fails')
})

test('dark resolves through tokens.css .dark, not the light values', () => {
  const t = themes()
  assert.notEqual(t.light['c-bg'], t.dark['c-bg'])
  assert.equal(t.dark['c-bg'], t.dark.background)
})
