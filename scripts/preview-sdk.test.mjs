// The vendored preview helpers (src/lib/preview/sdk.ts) keep the contract of Colophon's SDK they came from:
// the handler never redirects off the site, its cookie carries exactly the documented attributes and
// lifetime, every answer is no-store and noindex, the reads carry the bearer token and nothing else, every
// request has a deadline and a bounded body, and failures keep their `details.reason`. Ported from the SDK's own
// tests (packages/sdk/test/preview.test.ts), against a stub `fetch`.
//
//   npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApiError, PREVIEW_COOKIE, createPreviewHandler, exitPreviewHandler, originOf, previewClient, previewCookie, previewHeaders, previewTokenFromRequest, safePreviewPath, secondsLeft } from '../src/lib/preview/sdk.ts'

function stubFetch(handler) {
  const calls = []
  const fetch = async (input, init = {}) => {
    const seen = { url: String(input), method: init.method ?? 'GET', headers: init.headers ?? {}, body: typeof init.body === 'string' ? init.body : undefined, init }
    calls.push(seen)
    return handler(seen)
  }
  return { calls, fetch }
}
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
const REQUEST_ID = '0190a4b0-0000-7000-8000-000000000002'
const envelope = (status, code, reason, headers = {}) => json({ error: { code, message: `refused: ${reason}`, request_id: REQUEST_ID, details: { reason } } }, status, headers)
const failure = async (promise) => {
  try {
    await promise
  } catch (error) {
    assert.ok(error instanceof ApiError, `an ApiError, not ${error}`)
    return error
  }
  assert.fail('the call should have failed')
}

const NOW = Date.parse('2026-11-17T12:00:00Z')
const IN_15_MIN = '2026-11-17T12:15:00Z'
const SCOPE = { kind: 'entry', entry: '0190a4b0-0000-7000-8000-0000000000e1' }
const SITE = 'https://site.example'
const CMS = 'https://cms.example'
const PROJECT = '0190a4b0-0000-7000-8000-00000000aaaa'
const TOKEN = 'cpv_tok3n'
const exchanged = (expiresAt = IN_15_MIN) => stubFetch(() => json({ data: { token: TOKEN, expires_at: expiresAt, scope: SCOPE } }))
const handlerWith = (fetch, extra = {}) => createPreviewHandler({ baseUrl: CMS, project: PROJECT, fetch, now: () => NOW, ...extra })
const previewRequest = (query, init = {}) => new Request(`${SITE}/api/preview?${query}`, init)
const GUARD = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' }
const guarded = (headers) => {
  assert.equal(headers.get('cache-control'), 'no-store')
  assert.equal(headers.get('x-robots-tag'), 'noindex')
  assert.equal(headers.get('referrer-policy'), 'no-referrer')
}

/* ------------------------------------------------------------ open redirects */

test('safePreviewPath keeps a same-site relative path, resolved and percent-encoded', () => {
  for (const [path, safe] of [
    ['/blog/hello', '/blog/hello'],
    ['/blog/hello?x=1#part', '/blog/hello?x=1#part'],
    ['/', '/'],
    ['/café', '/caf%C3%A9'],
    ['/a/../b', '/b'],
    ['/a/./b', '/a/b'],
  ]) assert.equal(safePreviewPath(path), safe, path)
  assert.equal(safePreviewPath(`/${'a'.repeat(2047)}`).length, 2048)
})

test('safePreviewPath refuses everything that could leave the site', () => {
  for (const [why, path] of [
    ['protocol-relative', '//evil.example/x'],
    ['absolute URL', 'https://evil.example/x'],
    ['scheme', 'javascript:alert(1)'],
    ['no leading slash', 'evil.example'],
    ['backslash first', '\\evil.example'],
    ['slash-backslash', '/\\evil.example'],
    ['backslash later', '/a\\b'],
    ['dot segment to //', '/..//evil.example'],
    ['dot segment, single', '/.//evil.example'],
    ['encoded dots to //', '/%2e%2e//evil.example'],
    ['tab', '/\t/evil.example'],
    ['newline', '/a\nSet-Cookie: x=1'],
    ['carriage return', '/a\rb'],
    ['NUL', '/a\u0000b'],
    ['DEL', '/a\u007fb'],
    ['empty', ''],
    ['too long', `/${'a'.repeat(2048)}`],
    ['missing', null],
    ['undefined', undefined],
  ]) assert.equal(safePreviewPath(path), null, why)
})

test('isAllowedPath is asked about the resolved path, so dot segments cannot sneak past a prefix', () => {
  const seen = []
  const blogOnly = (path) => {
    seen.push(path)
    return path.startsWith('/blog/')
  }
  assert.equal(safePreviewPath('/blog/post', blogOnly), '/blog/post')
  assert.equal(safePreviewPath('/blog/../admin', blogOnly), null)
  assert.deepEqual(seen, ['/blog/post', '/admin'])
})

/* ---------------------------------------------------------------- the handler */

test('the handler exchanges the code server-side and answers 303 with the documented cookie', async () => {
  const stub = exchanged()
  const response = await handlerWith(stub.fetch)(previewRequest('code=cpc_abc&path=/blog/post', { headers: { cookie: 'session=visitor' } }))
  assert.ok(response instanceof Response)
  assert.equal(response.status, 303)
  assert.equal(response.headers.get('location'), '/blog/post')
  assert.equal(response.headers.get('set-cookie'), `colophon_preview=${TOKEN}; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=900`)
  guarded(response.headers)
  assert.equal(stub.calls.length, 1)
  const [call] = stub.calls
  assert.equal(call.url, `${CMS}/preview/v1/${PROJECT}/production/exchange`)
  assert.equal(call.method, 'POST')
  assert.equal(call.body, JSON.stringify({ code: 'cpc_abc' }))
  assert.deepEqual(call.headers, { accept: 'application/json', 'content-type': 'application/json' }, 'nothing of the visitor’s goes to Colophon')
  assert.equal(call.init.redirect, 'manual')
  assert.ok(call.init.signal instanceof AbortSignal, 'the exchange has a deadline')
  assert.ok(!('cache' in call.init), 'no `cache` option: Cloudflare refuses it on older compatibility dates')
})

test('a missing, foreign or refused path is answered before the exchange, so the code is not spent', async () => {
  const stub = exchanged()
  const handle = handlerWith(stub.fetch, { isAllowedPath: (path) => path.startsWith('/preview/') })
  for (const query of ['code=cpc_abc', 'code=cpc_abc&path=//evil.example', 'code=cpc_abc&path=https://evil.example/', 'code=cpc_abc&path=/blog/post', 'code=cpc_abc&path=/preview/../admin']) {
    const refusal = await handle(previewRequest(query))
    assert.deepEqual(refusal, { status: 400, reason: 'path_refused', headers: GUARD }, query)
  }
  assert.equal(stub.calls.length, 0)
})

test('the handler percent-encodes the path it redirects to', async () => {
  const response = await handlerWith(exchanged().fetch)(previewRequest(`code=cpc_abc&path=${encodeURIComponent('/blog/café ?q=1')}`))
  assert.equal(response.headers.get('location'), '/blog/caf%C3%A9%20?q=1')
})

test('the cookie lives exactly as long as the token, within 0 to 8 hours', async () => {
  for (const [expiresAt, maxAge] of [[IN_15_MIN, 900], ['2026-11-17T11:00:00Z', 0], ['2026-11-18T12:00:00Z', 28800], ['2026-11-17T12:00:59.999Z', 59]]) {
    const response = await handlerWith(exchanged(expiresAt).fetch)(previewRequest('code=cpc_abc&path=/'))
    assert.match(response.headers.get('set-cookie'), new RegExp(`; Max-Age=${maxAge}$`), expiresAt)
  }
  assert.equal(secondsLeft('not a date', NOW), 0)
})

test('the cookie can be named, and a name that is not a cookie name is refused', async () => {
  const response = await handlerWith(exchanged().fetch, { cookieName: 'draft_token' })(previewRequest('code=cpc_abc&path=/'))
  assert.match(response.headers.get('set-cookie'), /^draft_token=cpv_tok3n; /)
  assert.throws(() => handlerWith(exchanged().fetch, { cookieName: 'bad name;' }), TypeError)
  assert.throws(() => previewCookie('x', 1, 'a=b'), TypeError)
})

test('an unknown, used or expired code is a 404 refusal with Colophon’s words, and no cookie', async () => {
  const stub = stubFetch(() => envelope(404, 'not_found', 'preview_not_found'))
  const refusal = await handlerWith(stub.fetch)(previewRequest('code=cpc_used&path=/'))
  assert.deepEqual(refusal, { status: 404, reason: 'preview_not_found', headers: GUARD, message: 'refused: preview_not_found' })
})

test('a missing or oversized code is refused without asking Colophon', async () => {
  const stub = exchanged()
  for (const query of ['path=/', 'code=&path=/', `code=${'c'.repeat(513)}&path=/`]) {
    const refusal = await handlerWith(stub.fetch)(previewRequest(query))
    assert.equal(refusal.status, 404, query)
    assert.equal(refusal.reason, 'preview_not_found', query)
  }
  assert.equal(stub.calls.length, 0)
})

test('502 when Colophon cannot be reached or makes no sense, 503 when it is at its limit: never a cookie', async () => {
  const down = stubFetch(() => {
    throw new TypeError('fetch failed')
  })
  assert.deepEqual(await handlerWith(down.fetch)(previewRequest('code=cpc_abc&path=/')), { status: 502, reason: 'unavailable', headers: GUARD })
  const odd = stubFetch(() => json({ data: { token: 'has space', expires_at: IN_15_MIN, scope: SCOPE } }))
  assert.equal((await handlerWith(odd.fetch)(previewRequest('code=cpc_abc&path=/'))).status, 502)
  const limited = stubFetch(() => envelope(429, 'rate_limited', 'preview_limit', { 'retry-after': '7' }))
  assert.deepEqual(await handlerWith(limited.fetch)(previewRequest('code=cpc_abc&path=/')), { status: 503, reason: 'rate_limited', headers: { ...GUARD, 'Retry-After': '7' } })
  const busy = stubFetch(() => envelope(503, 'unavailable', 'unavailable'))
  assert.equal((await handlerWith(busy.fetch)(previewRequest('code=cpc_abc&path=/'))).headers['Retry-After'], '1')
})

test('anything but GET is refused, and a code is never spent on a prefetch', async () => {
  const stub = exchanged()
  const handle = handlerWith(stub.fetch)
  assert.deepEqual(await handle(previewRequest('code=cpc_abc&path=/', { method: 'POST' })), { status: 405, reason: 'method_not_allowed', headers: { ...GUARD, Allow: 'GET' } })
  for (const header of ['sec-purpose', 'purpose']) {
    const refusal = await handle(previewRequest('code=cpc_abc&path=/', { headers: { [header]: 'prefetch;prerender' } }))
    assert.equal(refusal.status, 503, header)
    assert.equal(refusal.reason, 'prefetch', header)
  }
  assert.equal(stub.calls.length, 0)
})

/* -------------------------------------------------------- cookie and headers */

test('the token is found among other cookies, and anything that is not a token is ignored', () => {
  const request = (cookie) => new Request(`${SITE}/blog/post`, cookie === undefined ? {} : { headers: { cookie } })
  assert.equal(PREVIEW_COOKIE, 'colophon_preview')
  assert.equal(previewTokenFromRequest(request(`theme=dark; colophon_preview=${TOKEN}; other=1`)), TOKEN)
  assert.equal(previewTokenFromRequest(request('other=1; draft=cpv_x'), 'draft'), 'cpv_x')
  for (const cookie of [undefined, 'theme=dark', 'colophon_preview=', 'colophon_preview="quoted value"', 'colophon_preview=has space', 'colophon_preview=semi;colon', `xcolophon_preview=${TOKEN}`, `colophon_preview=${'a'.repeat(1025)}`]) {
    assert.equal(previewTokenFromRequest(request(cookie)), cookie === 'colophon_preview=semi;colon' ? 'semi' : null, String(cookie))
  }
})

test('a page in preview mode is private, unstored, unindexed and framable only by the Studio', () => {
  assert.deepEqual(previewHeaders({ studioOrigin: 'https://cms.example' }), {
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex',
    'Content-Security-Policy': 'frame-ancestors https://cms.example',
  })
  assert.equal(originOf('http://localhost:58000'), 'http://localhost:58000')
  assert.equal(originOf('https://cms.example/'), 'https://cms.example')
  for (const bad of ['*', 'https://*.example', 'https://cms.example/studio', 'https://cms.example?x', 'https://cms.example#x', 'https://user:pw@cms.example', 'ftp://cms.example', 'cms.example', '', "https://cms.example 'self'", 'https://cms.example; script-src *']) {
    assert.throws(() => originOf(bad), TypeError, bad)
  }
})

test('exit clears the cookie with the attributes that set it, and goes to a checked path or the fallback', () => {
  const exit = exitPreviewHandler()
  const response = exit(new Request(`${SITE}/api/preview/exit`))
  assert.equal(response.status, 303)
  assert.equal(response.headers.get('location'), '/')
  assert.equal(response.headers.get('set-cookie'), 'colophon_preview=; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=0')
  guarded(response.headers)
  assert.equal(exit(new Request(`${SITE}/api/preview/exit?path=/blog/post`)).headers.get('location'), '/blog/post')
  assert.equal(exit(new Request(`${SITE}/api/preview/exit?path=//evil.example`)).headers.get('location'), '/')
  const blogOnly = exitPreviewHandler({ redirectTo: '/blog/', isAllowedPath: (path) => path.startsWith('/blog/') })
  assert.equal(blogOnly(new Request(`${SITE}/x?path=/admin`)).headers.get('location'), '/blog/')
  assert.throws(() => exitPreviewHandler({ redirectTo: 'https://evil.example' }), TypeError)
})

/* ---------------------------------------------------------------- the client */

const row = (extra = {}) => ({ id: SCOPE.entry, revision_id: 'r1', collection: 'posts', title: 'T', slug: 'hello', content: { title: 'T' }, preview: { source: 'draft' }, ...extra })

test('an exchange answers { token, expiresAt, scope }, and anything else is refused', async () => {
  const client = (body) => previewClient({ baseUrl: CMS, project: PROJECT, fetch: stubFetch(() => json(body)).fetch })
  assert.deepEqual(await client({ data: { token: TOKEN, expires_at: IN_15_MIN, scope: SCOPE } }).exchange('cpc_abc'), { token: TOKEN, expiresAt: IN_15_MIN, scope: SCOPE })
  for (const data of [{}, { token: TOKEN, expires_at: IN_15_MIN }, { token: 'a b', expires_at: IN_15_MIN, scope: SCOPE }, { token: TOKEN, expires_at: 'soon', scope: SCOPE }, { token: TOKEN, expires_at: IN_15_MIN, scope: { kind: 'everything' } }, { token: 'tok;en', expires_at: IN_15_MIN, scope: SCOPE }]) {
    const error = await failure(client({ data }).exchange('cpc_abc'))
    assert.equal(error.code, 'invalid_response', JSON.stringify(data))
  }
})

test('reads carry Authorization: Bearer and nothing else, to the documented paths', async () => {
  const stub = stubFetch((call) => (call.url.endsWith('/session') ? json({ data: { scope: SCOPE, expires_at: IN_15_MIN } }) : call.url.endsWith(`/${SCOPE.entry}`) ? json({ data: row() }) : json({ data: [row(), row({ preview: { source: 'published', hidden_fields: ['tags', 7] } })], next_cursor: null })))
  const reader = previewClient({ baseUrl: `${CMS}/`, project: PROJECT, environment: 'staging', fetch: stub.fetch }).reader(TOKEN)
  assert.equal((await reader.get('posts', SCOPE.entry)).slug, 'hello')
  const rows = await reader.list('site', { limit: 1 })
  assert.deepEqual(rows[1].preview, { source: 'published', hidden_fields: ['tags'] })
  assert.deepEqual(await reader.session(), { scope: SCOPE, expiresAt: IN_15_MIN })
  assert.deepEqual(stub.calls.map((c) => `${c.method} ${c.url}`), [
    `GET ${CMS}/preview/v1/${PROJECT}/staging/posts/${SCOPE.entry}`,
    `GET ${CMS}/preview/v1/${PROJECT}/staging/site?limit=1`,
    `GET ${CMS}/preview/v1/${PROJECT}/staging/session`,
  ])
  for (const call of stub.calls) {
    assert.deepEqual(call.headers, { accept: 'application/json', authorization: `Bearer ${TOKEN}` })
    assert.equal(call.init.redirect, 'manual')
    assert.ok(call.init.signal instanceof AbortSignal)
  }
})

test('a path segment is encoded, so a collection or an id cannot reach another endpoint', async () => {
  const stub = stubFetch(() => json({ data: row() }))
  await previewClient({ baseUrl: CMS, project: PROJECT, fetch: stub.fetch }).reader(TOKEN).get('../exchange', 'a/../../session?x=1')
  assert.equal(stub.calls[0].url, `${CMS}/preview/v1/${PROJECT}/production/..%2Fexchange/a%2F..%2F..%2Fsession%3Fx%3D1`)
})

test('a row that is not in the documented shape is refused, not drawn', async () => {
  for (const data of [null, [], { id: 1, content: {}, preview: { source: 'draft' } }, { id: 'x', content: 'text', preview: { source: 'draft' } }, { id: 'x', content: {} }, { id: 'x', content: {}, preview: { source: 'secret' } }]) {
    const reader = previewClient({ baseUrl: CMS, project: PROJECT, fetch: stubFetch(() => json({ data })).fetch }).reader(TOKEN)
    assert.equal((await failure(reader.get('posts', 'x'))).code, 'invalid_response', JSON.stringify(data))
  }
  const list = previewClient({ baseUrl: CMS, project: PROJECT, fetch: stubFetch(() => json({ data: { not: 'a list' } })).fetch }).reader(TOKEN)
  assert.equal((await failure(list.list('site'))).code, 'invalid_response')
})

test('a token that could break a header is refused before any request', () => {
  const client = previewClient({ baseUrl: CMS, project: PROJECT, fetch: exchanged().fetch })
  for (const token of ['', 'has space', 'line\nbreak', 'semi;colon', 'comma,', 'quo"te', 'back\\slash', 'x'.repeat(1025), 'café']) assert.throws(() => client.reader(token), TypeError, JSON.stringify(token))
})

test('a refusal keeps its status, code, reason, request id and wait', async () => {
  const reader = (response) => previewClient({ baseUrl: CMS, project: PROJECT, fetch: stubFetch(response).fetch }).reader(TOKEN)
  for (const [status, code, reason] of [[401, 'unauthorized', 'preview_expired'], [401, 'unauthorized', 'preview_revoked'], [409, 'conflict', 'preview_stale'], [410, 'gone', 'preview_published']]) {
    const error = await failure(reader(() => envelope(status, code, reason)).get('posts', 'x'))
    assert.deepEqual([error.status, error.code, error.reason, error.requestId, error.retryable], [status, code, reason, REQUEST_ID, false])
  }
  const busy = await failure(reader(() => envelope(503, 'unavailable', 'unavailable', { 'retry-after': '3' })).get('posts', 'x'))
  assert.deepEqual([busy.status, busy.retryable, busy.retryAfterMs], [503, true, 3000])
  const long = await failure(reader(() => envelope(503, 'unavailable', 'unavailable', { 'retry-after': '99999' })).get('posts', 'x'))
  assert.equal(long.retryAfterMs, 60_000, 'a wait is never longer than a minute')
})

test('no answer, a non-JSON body and a redirect are client-side codes, never a row', async () => {
  const reader = (response) => previewClient({ baseUrl: CMS, project: PROJECT, fetch: stubFetch(response).fetch }).reader(TOKEN)
  const down = await failure(
    reader(() => {
      throw new TypeError('fetch failed')
    }).get('posts', 'x'),
  )
  assert.deepEqual([down.status, down.code, down.retryable], [0, 'no_answer', true])
  assert.equal((await failure(reader(() => new Response('<html>proxy page</html>', { status: 502 })).get('posts', 'x'))).code, 'invalid_response')
  assert.equal((await failure(reader(() => new Response('<html>ok?</html>', { status: 200 })).get('posts', 'x'))).code, 'invalid_response')
  const moved = await failure(reader(() => new Response(null, { status: 302, headers: { location: 'https://evil.example/' } })).get('posts', 'x'))
  assert.deepEqual([moved.status, moved.code], [302, 'invalid_response'])
})

test('a body past the cap is not read, declared or not', async () => {
  const big = 'x'.repeat(4096)
  const reader = (response) => previewClient({ baseUrl: CMS, project: PROJECT, maxBodyBytes: 1024, fetch: stubFetch(response).fetch }).reader(TOKEN)
  assert.equal((await failure(reader(() => new Response(big, { headers: { 'content-length': '4096' } })).get('posts', 'x'))).code, 'response_too_large')
  let pulled = 0
  const endless = () =>
    new Response(
      new ReadableStream({
        pull(controller) {
          pulled += 1
          controller.enqueue(new TextEncoder().encode(big))
        },
      }),
    )
  assert.equal((await failure(reader(endless).get('posts', 'x'))).code, 'response_too_large')
  assert.ok(pulled < 8, `the stream was cancelled after ${pulled} chunks`)
})

test('a request that gets no answer in time is abandoned', async () => {
  const hanging = (_input, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)))
  const started = Date.now()
  const error = await failure(previewClient({ baseUrl: CMS, project: PROJECT, timeoutMs: 30, fetch: hanging }).reader(TOKEN).get('posts', 'x'))
  assert.deepEqual([error.status, error.code], [0, 'no_answer'])
  assert.ok(Date.now() - started < 5000)
})

test('a base URL that is not http(s), or no project, is refused when the client is made', () => {
  assert.throws(() => previewClient({ baseUrl: 'ftp://cms.example', project: PROJECT }), TypeError)
  assert.throws(() => previewClient({ baseUrl: 'javascript:alert(1)', project: PROJECT }), TypeError)
  assert.throws(() => previewClient({ baseUrl: CMS, project: '' }), TypeError)
})
