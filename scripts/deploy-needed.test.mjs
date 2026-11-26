import assert from 'node:assert/strict'
import { test } from 'node:test'
import { builtFrom } from './deploy-needed.mjs'

test('the release a page was built from is read from its marker, exactly as a site check reads it', () => {
  assert.equal(builtFrom('<head><title>x</title><meta name="colophon-generation" content="12"></head>'), 12)
  assert.equal(builtFrom('<head><title>x</title></head>'), 0)
  // Not the marker: another name, or a value that isn't digits.
  assert.equal(builtFrom('<meta name="generator" content="3">'), 0)
  assert.equal(builtFrom('<meta name="colophon-generation" content="v3">'), 0)
})
