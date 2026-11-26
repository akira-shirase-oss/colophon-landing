import assert from 'node:assert/strict'
import { test } from 'node:test'
import { changedPages, comparable, locs } from './changed-pages.mjs'

const page = (body, generation) => `<head><title>t</title><meta name="colophon-generation" content="${generation}"></head><body>${body}</body>`

test('a page changes when its words do, not when only the release marker moves', async () => {
  const built = { 'https://s/': page('home', 4), 'https://s/blog/a/': page('edited', 4), 'https://s/blog/new/': page('new', 4) }
  const live = { 'https://s/': page('home', 3), 'https://s/blog/a/': page('as it was', 3), 'https://s/blog/gone/': page('gone', 3) }
  const changed = await changedPages(Object.keys(built), Object.keys(live), async (u) => built[u], async (u) => live[u])
  // Edited, new (the live site has no such page) and gone (the live sitemap lists it, the build doesn't).
  assert.deepEqual(changed, ['https://s/blog/a/', 'https://s/blog/gone/', 'https://s/blog/new/'])
})

test('a page that could not be read counts as changed, so a failed read never hides one', async () => {
  const changed = await changedPages(['https://s/'], ['https://s/'], async () => page('home', 4), async () => undefined)
  assert.deepEqual(changed, ['https://s/'])
})

test('the marker is the only thing set aside, and a sitemap gives its addresses in order', () => {
  assert.equal(comparable(page('x', 12)), comparable(page('x', 3)))
  assert.notEqual(comparable(page('x', 3)), comparable(page('y', 3)))
  assert.deepEqual(locs('<urlset><url><loc>https://s/</loc></url><url><loc>https://s/blog/</loc></url></urlset>'), ['https://s/', 'https://s/blog/'])
})
