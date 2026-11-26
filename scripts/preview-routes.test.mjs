// The three preview routes (src/lib/preview/routes.ts) against a stub of Colophon: what each answers, with
// which headers, and above all what it never does. No cookie reads nothing; an address that isn't one of the
// four collections and a UUID reads nothing; a redirect goes only to a preview page; nothing answers without
// no-store and noindex.
//
//   npm test
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { publicHeaders } from '../src/lib/preview/policy.ts'
import { enter, leave, open } from '../src/lib/preview/routes.ts'
import { previewSource } from '../src/lib/preview/site.ts'

const SITE = 'https://colophon.404human.dev'
const CMS = 'https://cms.example'
const PROJECT = '0190a4b0-0000-7000-8000-00000000aaaa'
const ID = '0190a4b0-0000-7000-8000-0000000000e1'
const TOKEN = 'cpv_tok3n'
const NOW = Date.parse('2026-11-26T12:00:00Z')
const headers = publicHeaders(readFileSync(new URL('../public/_headers', import.meta.url), 'utf8'))
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...extra } })
const refuse = (status, code, reason) => json({ error: { code, message: 'no', request_id: 'r', ...(reason ? { details: { reason } } : {}) } }, status)
const row = (collection, source = 'draft') => ({ id: ID, collection, slug: 'hello', content: { title: 'Hello' }, preview: { source } })

/** A site whose Colophon answers with `handler`, and the calls it received. */
function site(handler = () => refuse(500, 'internal'), extra = {}) {
  const calls = []
  const fetch = async (input, init = {}) => {
    calls.push({ url: String(input), method: init.method ?? 'GET', headers: init.headers ?? {}, body: init.body })
    return handler(String(input), init)
  }
  return { calls, site: { source: previewSource({ api: CMS, project: PROJECT, environment: 'production' }), headers, fetch, now: () => NOW, ...extra } }
}
const get = (path, cookie) => new Request(`${SITE}${path}`, cookie ? { headers: { cookie } } : {})
const sealed = (answerHeaders, cache) => {
  const h = answerHeaders instanceof Headers ? Object.fromEntries(answerHeaders) : answerHeaders
  assert.equal(h['cache-control'], cache)
  assert.equal(h['x-robots-tag'], 'noindex')
  assert.equal(h['referrer-policy'], 'no-referrer')
  assert.match(h['content-security-policy'], /; frame-ancestors https:\/\/cms\.example$/)
  assert.equal(h['x-frame-options'], undefined)
  assert.equal(h['x-content-type-options'], 'nosniff')
  assert.match(h['strict-transport-security'], /max-age=31536000/)
}

/* -------------------------------------------------------------------- enter */

test('enter: a code becomes a cookie and a 303 to the preview page, with the site’s headers', async () => {
  const { calls, site: s } = site(() => json({ data: { token: TOKEN, expires_at: '2026-11-26T12:15:00Z', scope: { kind: 'entry', entry: ID } } }))
  const response = await enter(s, get(`/api/preview?code=cpc_abc&path=/preview/posts/${ID}`))
  assert.ok(response instanceof Response)
  assert.equal(response.status, 303)
  assert.equal(response.headers.get('location'), `/preview/posts/${ID}`)
  assert.equal(response.headers.get('set-cookie'), `colophon_preview=${TOKEN}; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=900`)
  sealed(response.headers, 'no-store')
  assert.deepEqual(calls.map((c) => `${c.method} ${c.url} ${c.body}`), [`POST ${CMS}/preview/v1/${PROJECT}/production/exchange {"code":"cpc_abc"}`])
})

test('enter: a path that is not a preview page of this site is refused before the code is spent', async () => {
  const { calls, site: s } = site()
  for (const path of ['', '/', '/blog/', '//evil.example', 'https://evil.example/', `/preview/drafts/${ID}`, '/preview/posts/1', `/preview/posts/${ID}?next=//evil.example`, `/preview/posts/../../api/preview/exit`, '/api/preview/exit']) {
    const answer = await enter(s, get(`/api/preview?code=cpc_abc${path === '' ? '' : `&path=${encodeURIComponent(path)}`}`))
    assert.equal(answer.kind, 'notice', path)
    assert.deepEqual([answer.status, answer.notice.reason, answer.cookies], [400, 'path_refused', []], path)
    sealed(answer.headers, 'no-store')
  }
  assert.equal(calls.length, 0)
})

test('enter: an expired or used code, a limit and a silent Colophon each get their page and no cookie', async () => {
  for (const [handler, status, reason, retry] of [
    [() => refuse(404, 'not_found', 'preview_not_found'), 404, 'preview_not_found', undefined],
    [() => new Response(JSON.stringify({ error: { code: 'rate_limited', message: 'slow down', request_id: 'r' } }), { status: 429, headers: { 'retry-after': '9' } }), 503, 'rate_limited', '9'],
    [() => Promise.reject(new TypeError('fetch failed')), 502, 'unavailable', undefined],
    [() => new Response(null, { status: 302, headers: { location: 'https://evil.example/' } }), 502, 'unavailable', undefined],
  ]) {
    const answer = await enter(site(handler).site, get(`/api/preview?code=cpc_abc&path=/preview/posts/${ID}`))
    assert.deepEqual([answer.kind, answer.status, answer.notice.reason, answer.cookies, answer.headers['retry-after']], ['notice', status, reason, [], retry], reason)
    sealed(answer.headers, 'no-store')
  }
})

test('enter and open: without a project to preview, nothing is asked and nothing may frame the answer', async () => {
  const { calls, site: s } = site()
  const none = { ...s, source: null }
  for (const answer of [await enter(none, get(`/api/preview?code=cpc_abc&path=/preview/posts/${ID}`)), await open(none, get(`/preview/posts/${ID}`, `colophon_preview=${TOKEN}`), 'posts', ID)]) {
    assert.deepEqual([answer.kind, answer.status, answer.notice.reason, answer.studioOrigin], ['notice', 404, 'preview_not_configured', null])
    assert.match(answer.headers['content-security-policy'], /; frame-ancestors 'none'$/)
    assert.equal(answer.headers['x-frame-options'], 'DENY')
    assert.deepEqual([answer.headers['cache-control'], answer.headers['x-robots-tag'], answer.headers['referrer-policy']], ['no-store', 'noindex', 'no-referrer'])
  }
  assert.equal(calls.length, 0)
})

/* --------------------------------------------------------------------- open */

test('open: without a preview cookie nothing is read, and the answer is "ended"', async () => {
  const { calls, site: s } = site(() => json({ data: row('posts') }))
  for (const cookie of [undefined, 'theme=dark', 'colophon_preview=', 'colophon_preview=a b', 'colophon_previews=cpv_x']) {
    const answer = await open(s, get(`/preview/posts/${ID}`, cookie), 'posts', ID)
    assert.deepEqual([answer.kind, answer.status, answer.notice.reason, answer.cookies, answer.studioOrigin], ['notice', 401, 'no_preview_session', [], CMS], String(cookie))
    sealed(answer.headers, 'private, no-store')
  }
  assert.equal(calls.length, 0)
})

test('open: a collection that is not one of the four, or an id that is not a UUID, reads nothing', async () => {
  const { calls, site: s } = site(() => json({ data: row('posts') }))
  for (const [collection, id] of [['drafts', ID], ['session', ID], ['exchange', ID], ['posts', 'hello'], ['posts', `${ID}/../../session`], ['posts', ID.toUpperCase()], ['posts', undefined], [undefined, ID], ['posts', '']]) {
    const answer = await open(s, get('/preview/x/y', `colophon_preview=${TOKEN}`), collection, id)
    assert.deepEqual([answer.kind, answer.status, answer.notice.reason], ['notice', 404, 'not_a_preview_page'], `${collection}/${id}`)
    sealed(answer.headers, 'private, no-store')
  }
  assert.equal(calls.length, 0)
})

test('open: a post or a page is read with the token, along with the site settings for its status line', async () => {
  for (const collection of ['posts', 'pages']) {
    const { calls, site: s } = site((url) => (url.endsWith('/site?limit=1') ? json({ data: [row('site', 'published')], next_cursor: null }) : json({ data: row(collection) })))
    const answer = await open(s, get(`/preview/${collection}/${ID}`, `a=1; colophon_preview=${TOKEN}`), collection, ID)
    assert.equal(answer.kind, 'draft')
    assert.deepEqual([answer.entry.collection, answer.entry.preview.source, answer.settings.preview.source, answer.studioOrigin], [collection, 'draft', 'published', CMS])
    sealed(answer.headers, 'private, no-store')
    assert.deepEqual(calls.map((c) => c.url).sort(), [`${CMS}/preview/v1/${PROJECT}/production/${collection}/${ID}`, `${CMS}/preview/v1/${PROJECT}/production/site?limit=1`])
    for (const call of calls) assert.deepEqual(call.headers, { accept: 'application/json', authorization: `Bearer ${TOKEN}` })
  }
})

test('open: the home page and the site settings are one read each', async () => {
  for (const collection of ['home', 'site']) {
    const { calls, site: s } = site(() => json({ data: row(collection) }))
    const answer = await open(s, get(`/preview/${collection}/${ID}`, `colophon_preview=${TOKEN}`), collection, ID)
    assert.deepEqual([answer.kind, answer.settings, calls.length], ['draft', null, 1])
  }
})

test('open: a reader who cannot see the site settings still gets the preview, without the status line', async () => {
  for (const settings of [() => refuse(404, 'not_found'), () => json({ data: [], next_cursor: null }), () => Promise.reject(new TypeError('fetch failed'))]) {
    const { site: s } = site((url) => (url.includes('/site?') ? settings() : json({ data: row('posts') })))
    const answer = await open(s, get(`/preview/posts/${ID}`, `colophon_preview=${TOKEN}`), 'posts', ID)
    assert.deepEqual([answer.kind, answer.settings], ['draft', null])
  }
})

test('open: what Colophon refuses is said, never drawn; a dead token’s cookie is cleared', async () => {
  const CLEAR = 'colophon_preview=; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=0'
  for (const [handler, status, reason, cookies] of [
    [() => refuse(401, 'unauthorized', 'preview_expired'), 401, 'preview_expired', [CLEAR]],
    [() => refuse(401, 'unauthorized', 'preview_revoked'), 401, 'preview_revoked', [CLEAR]],
    [() => refuse(401, 'unauthorized', 'preview_invalid'), 401, 'preview_invalid', [CLEAR]],
    [() => refuse(409, 'conflict', 'preview_stale'), 409, 'preview_stale', []],
    [() => refuse(410, 'gone', 'preview_published'), 410, 'preview_published', []],
    [() => refuse(404, 'not_found'), 404, 'not_found', []],
    [() => new Response('{}', { status: 503, headers: { 'retry-after': '4' } }), 503, 'invalid_response', []],
    [() => Promise.reject(new TypeError('fetch failed')), 502, 'no_answer', []],
    [() => json({ data: { id: ID, content: 'not an object', preview: { source: 'draft' } } }), 502, 'invalid_response', []],
    [() => new Response('x'.repeat(3 * 1024 * 1024)), 502, 'response_too_large', []],
  ]) {
    const { site: s } = site((url) => (url.includes('/site?') ? json({ data: [], next_cursor: null }) : handler()))
    const answer = await open(s, get(`/preview/posts/${ID}`, `colophon_preview=${TOKEN}`), 'posts', ID)
    assert.deepEqual([answer.kind, answer.status, answer.notice.reason, answer.cookies], ['notice', status, reason, cookies], reason)
    sealed(answer.headers, 'private, no-store')
    if (status === 503) assert.equal(answer.headers['retry-after'], '4')
  }
})

/* -------------------------------------------------------------------- leave */

test('leave: the cookie is cleared and the visitor goes to a public page that exists, else to /', async () => {
  const asked = []
  const { calls, site: s } = site(undefined, {
    exists: async (path) => {
      asked.push(path)
      if (path === '/blog/broken/') throw new Error('asset lookup failed')
      return path === '/blog/hello/'
    },
  })
  for (const [path, want] of [
    ['/blog/hello/', '/blog/hello/'],
    ['/blog/unpublished/', '/'],
    ['/blog/broken/', '/'],
    [undefined, '/'],
    ['//evil.example', '/'],
    ['https://evil.example/x', '/'],
    [`/preview/posts/${ID}`, '/'],
    ['/api/preview', '/'],
    ['/api/preview/exit?path=/api/preview/exit', '/'],
  ]) {
    const response = await leave(s, get(`/api/preview/exit${path === undefined ? '' : `?path=${encodeURIComponent(path)}`}`, `colophon_preview=${TOKEN}`))
    assert.deepEqual([response.status, response.headers.get('location')], [303, want], String(path))
    assert.equal(response.headers.get('set-cookie'), 'colophon_preview=; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=0')
    sealed(response.headers, 'no-store')
  }
  assert.deepEqual(asked, ['/blog/hello/', '/blog/unpublished/', '/blog/broken/'], 'only a public path is looked up')
  assert.equal(calls.length, 0, 'exit never talks to Colophon')
  assert.equal((await leave({ ...s, exists: undefined }, get('/api/preview/exit?path=/blog/any/'))).headers.get('location'), '/blog/any/')
})
