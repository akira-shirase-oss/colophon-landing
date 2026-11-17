// The glossary's structured data is read from the post itself: every term needs an anchor, a name and a
// definition, anchors are unique, and the definitions are plain text.
//
//   npm test
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { glossaryTerms, plainText } from '../src/lib/glossary.ts'

test('a term is its h3 anchor, its name and the paragraph after it, as plain text', () => {
  const md = '## A\n\n<h3 id="api-token">API token</h3>\n\nA secret for **scripts**, see [tokens](/blog/x/) and `curl`.\n\nMore.\n'
  assert.deepEqual(glossaryTerms(md), [
    { id: 'api-token', name: 'API token', description: 'A secret for scripts, see tokens and curl.' },
  ])
})

test('plain text drops link targets and marks, and keeps the words', () => {
  assert.equal(plainText('**In Colophon:** read [the post](/blog/a/#b) `now`'), 'In Colophon: read the post now')
})

test('the glossary post has terms with unique anchors, each with a definition', () => {
  const md = readFileSync(new URL('../src/content/blog/headless-cms-glossary.md', import.meta.url), 'utf8')
  const terms = glossaryTerms(md)
  const headings = [...md.matchAll(/^<h3 /gm)].length
  assert.ok(terms.length >= 40, `want at least 40 terms, found ${terms.length}`)
  assert.equal(terms.length, headings, 'every <h3> term is followed by a blank line and its definition')
  assert.equal(new Set(terms.map((t) => t.id)).size, terms.length, 'anchors are unique')
  for (const t of terms) assert.ok(t.description.length >= 20, `${t.id} has a definition`)
})
