// Which inline scripts the policy must hash, which are data, and which fail; and the one third party.
//
//   npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ANALYTICS, DATA_TYPE, scriptKind } from './csp-rules.mjs'

test('executable types need a hash: none, empty, text/javascript, module and the other script types', () => {
  for (const type of [undefined, '', ' ', 'text/javascript', 'module', 'MODULE', 'application/javascript', 'importmap', 'speculationrules']) {
    assert.equal(scriptKind(type), 'runs', String(type))
  }
})

test('only an exact application/ld+json is data', () => {
  for (const type of [DATA_TYPE, 'application/ld+json', ' Application/LD+JSON ']) assert.equal(scriptKind(type), 'data', type)
})

test('any other type is unknown, and the build fails on it', () => {
  for (const type of ['application/ld+json;x', 'application/ld+json; charset=utf-8', 'application/json', 'text/plain', 'ld+json', 'text/template']) {
    assert.equal(scriptKind(type), 'unknown', type)
  }
})

test('the one third party is Cloudflare Web Analytics, by exact origin', () => {
  assert.deepEqual(ANALYTICS, { script: 'https://static.cloudflareinsights.com', report: 'https://cloudflareinsights.com' })
})
