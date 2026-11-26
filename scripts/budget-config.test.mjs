import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LIGHTHOUSE, tbtLimit } from './budget-config.mjs'

test('the TBT limit is the budget at the reference runner, more on a slower one, and capped', () => {
  // At the reference speed, and on anything faster, the budget itself.
  assert.equal(tbtLimit(LIGHTHOUSE.tbtAtBenchmark), LIGHTHOUSE.tbtMs)
  assert.equal(tbtLimit(4000), LIGHTHOUSE.tbtMs)
  // The runners of 26 November 2026: what they measured on unchanged pages fits, with little to spare.
  assert.equal(tbtLimit(2233), 193)
  assert.equal(tbtLimit(2065), 209)
  assert.ok(194 <= tbtLimit(2065) && 152 <= tbtLimit(2233))
  // However slow the runner, a page is never excused more than tbtSlackMost times the budget.
  assert.equal(tbtLimit(500), Math.round(LIGHTHOUSE.tbtMs * LIGHTHOUSE.tbtSlackMost))
  // No benchmark reported: the budget as it is.
  for (const none of [undefined, NaN, 0, -1]) assert.equal(tbtLimit(none), LIGHTHOUSE.tbtMs)
})
