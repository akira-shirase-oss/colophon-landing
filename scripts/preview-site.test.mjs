// What this site previews and how its preview routes answer: which addresses are preview pages (one of four
// collections, a UUID), where drafts are read from, the headers derived from public/_headers, and the words
// for each of Colophon's refusals.
//
//   npm test
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { LISTEN_SCRIPT_HASH } from '../src/lib/preview/listen.ts'
import { ENDED, readNotice, refusalNotice } from '../src/lib/preview/notices.ts'
import { previewPolicy, previewRouteHeaders, publicHeaders } from '../src/lib/preview/policy.ts'
import { ApiError, handlerHeaders } from '../src/lib/preview/sdk.ts'
import { COLLECTIONS, isCollection, isEntryId, isPreviewPath, isPublicPath, previewPath, previewSource } from '../src/lib/preview/site.ts'

const ID = '0190a4b0-0000-7000-8000-0000000000e1'
const STUDIO = 'https://colophonapp.404human.dev'
const HEADERS = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')

/* ------------------------------------------------------------ addresses */

test('the four collections of the project have a preview page, and nothing else does', () => {
  assert.deepEqual([...COLLECTIONS], ['posts', 'pages', 'home', 'site'])
  for (const name of COLLECTIONS) assert.ok(isCollection(name), name)
  for (const name of ['post', 'Posts', 'drafts', 'session', 'exchange', '', ' posts', 'posts/', '__proto__', 'constructor', 'toString', undefined, null, 1, ['posts']]) assert.equal(isCollection(name), false, String(name))
})

test('an entry id is a lower-case UUID, whole', () => {
  assert.ok(isEntryId(ID))
  assert.ok(isEntryId('01a2093b-bd4e-77e8-a5da-06ab1634576f'))
  for (const id of ['', '1', 'hello-world', ID.toUpperCase(), ` ${ID}`, `${ID}\n`, `${ID}/`, `${ID}/..`, `${ID}?x=1`, ID.replace(/-/g, ''), `${ID}0`, ID.slice(1), '0190a4b0-0000-7000-8000-0000000000g1', '../session', undefined, null, 5]) {
    assert.equal(isEntryId(id), false, JSON.stringify(id))
  }
})

test('the handler redirects only to a preview page: /preview/<collection>/<uuid>, nothing after it', () => {
  for (const collection of COLLECTIONS) {
    assert.ok(isPreviewPath(previewPath(collection, ID)))
    assert.ok(isPreviewPath(`${previewPath(collection, ID)}/`))
  }
  for (const path of ['/', '/blog/', `/preview/${ID}`, `/preview/drafts/${ID}`, '/preview/posts/hello', `/preview/posts/${ID}/more`, `/preview/posts/${ID}?next=/`, `/preview/posts/${ID}#x`, `/preview/posts/${ID.toUpperCase()}`, `/Preview/posts/${ID}`, `/x/preview/posts/${ID}`, `/preview/posts/${ID}//`, '/api/preview', `/api/preview?code=x&path=/preview/posts/${ID}`]) {
    assert.equal(isPreviewPath(path), false, path)
  }
})

test('exit goes to any page of the site but the preview routes', () => {
  for (const path of ['/', '/blog/', '/blog/a-post/', '/compare/x/?a=1#b', '/previews/', '/apiary/']) assert.ok(isPublicPath(path), path)
  for (const path of ['/preview', '/preview/', `/preview/posts/${ID}`, '/api', '/api/', '/api/preview', '/api/preview/exit', '/api/preview?code=x', '/preview?x']) assert.equal(isPublicPath(path), false, path)
})

test('drafts are read from the project the build reads, and the Studio is that server’s origin', () => {
  // The same values src/lib/colophon.ts gives the build (nothing in this process's environment overrides them).
  const fromBuild = previewSource()
  if (process.env.COLOPHON_API === undefined && process.env.COLOPHON_PROJECT === undefined && process.env.COLOPHON_ENVIRONMENT === undefined) {
    assert.deepEqual(fromBuild, { api: STUDIO, project: '01a2093b-bd4e-77e8-a5da-06ab1634576f', environment: 'production', studioOrigin: STUDIO })
  }
  assert.deepEqual(previewSource({ api: 'https://cms.example/', project: ID, environment: 'staging' }), { api: 'https://cms.example', project: ID, environment: 'staging', studioOrigin: 'https://cms.example' })
  assert.equal(previewSource({ api: 'http://127.0.0.1:58000', project: ID }).studioOrigin, 'http://127.0.0.1:58000')
  assert.equal(previewSource({ api: 'https://cms.example/base', project: ID }).studioOrigin, 'https://cms.example', 'only the origin frames the page')
  // No project (a build from the Markdown files), or values that aren't what they claim to be: no preview.
  for (const overrides of [{ project: '' }, { project: 'blog' }, { project: `${ID}/../x` }, { api: 'not a url', project: ID }, { api: 'ftp://cms.example', project: ID }, { api: 'javascript:alert(1)', project: ID }, { project: ID, environment: '' }, { project: ID, environment: '../x' }, { project: ID, environment: 'a b' }]) {
    assert.equal(previewSource(overrides), null, JSON.stringify(overrides))
  }
})

/* --------------------------------------------------------------- headers */

const directives = (csp) => new Map(csp.split(';').map((p) => p.trim().split(/\s+/)).map(([name, ...sources]) => [name, sources]))

test('the preview policy is the public one but for frame-ancestors and the handshake’s hash', () => {
  const open = publicHeaders(HEADERS).get('content-security-policy')
  const preview = previewPolicy(open, STUDIO)
  const [was, is] = [directives(open), directives(preview)]
  assert.deepEqual([...is.keys()], [...was.keys()], 'the same directives, in the same order')
  for (const [name, sources] of was) {
    if (name === 'frame-ancestors') assert.deepEqual(is.get(name), [STUDIO])
    else if (name === 'script-src') assert.deepEqual(is.get(name), [...sources, LISTEN_SCRIPT_HASH])
    else assert.deepEqual(is.get(name), sources, name)
  }
  assert.deepEqual(was.get('frame-ancestors'), ["'none'"], 'the built pages are never framed')
  assert.ok(!was.get('script-src').includes(LISTEN_SCRIPT_HASH), 'no built page runs the handshake')
})

test('the policy names one origin, exactly, or is not made at all', () => {
  const open = publicHeaders(HEADERS).get('content-security-policy')
  assert.match(previewPolicy(open, 'http://127.0.0.1:58000'), /; frame-ancestors http:\/\/127\.0\.0\.1:58000$/)
  for (const bad of ['*', 'https://*.404human.dev', `${STUDIO}/studio/`, `${STUDIO} https://evil.example`, `${STUDIO}; script-src *`, "'self'", '']) assert.throws(() => previewPolicy(open, bad), TypeError, bad)
  assert.throws(() => previewPolicy("default-src 'none'; script-src 'self'", STUDIO), /frame-ancestors/)
  assert.throws(() => previewPolicy("default-src 'none'; frame-ancestors 'none'", STUDIO), /script-src/)
  assert.equal(previewPolicy(previewPolicy(open, STUDIO), STUDIO), previewPolicy(open, STUDIO), 'applying it twice adds the hash once')
})

test('a preview page and the handler answer with the site’s security headers, less X-Frame-Options', () => {
  const open = publicHeaders(HEADERS)
  assert.deepEqual([...open.keys()], ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy'])
  for (const [kind, cache] of [['page', 'private, no-store'], ['handler', 'no-store']]) {
    const headers = previewRouteHeaders(open, STUDIO, kind)
    assert.deepEqual(Object.keys(headers).sort(), ['cache-control', 'content-security-policy', 'cross-origin-opener-policy', 'permissions-policy', 'referrer-policy', 'strict-transport-security', 'x-content-type-options', 'x-robots-tag'])
    assert.equal(headers['cache-control'], cache)
    assert.equal(headers['x-robots-tag'], 'noindex')
    assert.equal(headers['referrer-policy'], 'no-referrer')
    assert.equal(headers['content-security-policy'], previewPolicy(open.get('content-security-policy'), STUDIO))
    for (const same of ['strict-transport-security', 'x-content-type-options', 'permissions-policy', 'cross-origin-opener-policy']) assert.equal(headers[same], open.get(same), same)
  }
})

test('only the /* rule of _headers is read, and a file without a policy is refused', () => {
  const file = '# comment\n/*\n  Content-Security-Policy: default-src \'none\'\n  X-Frame-Options: DENY\n\n/preview/*\n  X-Frame-Options: ALLOWALL\n  Content-Security-Policy: default-src *\n'
  assert.deepEqual([...publicHeaders(file)], [['content-security-policy', "default-src 'none'"], ['x-frame-options', 'DENY']])
  assert.throws(() => publicHeaders('/blog/*\n  Content-Security-Policy: default-src *\n'), /no Content-Security-Policy/)
})

/* ---------------------------------------------------------------- notices */

const refused = (status, code, reason, init = {}) => new ApiError(status, code, `refused: ${reason}`, { details: reason ? { reason } : null, ...init })

test('each refusal of the handler has its page, with the status and reason it came with', () => {
  for (const [reason, status, title] of [
    ['method_not_allowed', 405, 'Preview links are opened, not posted'],
    ['prefetch', 503, 'Preview links are opened, not prefetched'],
    ['path_refused', 400, 'This preview link names no page'],
    ['preview_not_found', 404, 'This preview link has expired'],
    ['rate_limited', 503, 'Preview is busy'],
    ['unavailable', 502, 'The preview could not be started'],
  ]) {
    const notice = refusalNotice({ status, reason, headers: handlerHeaders() })
    assert.deepEqual([notice.status, notice.title, notice.reason, notice.forget, notice.retryAfter], [status, title, reason, undefined, undefined])
    assert.ok(notice.text.length > 20)
  }
  assert.equal(refusalNotice({ status: 503, reason: 'rate_limited', headers: handlerHeaders({ 'Retry-After': '7' }) }).retryAfter, 7)
  assert.match(refusalNotice({ status: 404, reason: 'preview_not_found', headers: {} }).text, /expired or was already used/)
})

test('each refusal of a read says what Colophon said, and a dead token is forgotten', () => {
  for (const [error, status, title, reason, forget] of [
    [refused(401, 'unauthorized', 'preview_expired'), 401, 'This preview has ended', 'preview_expired', true],
    [refused(401, 'unauthorized', 'preview_revoked'), 401, 'This preview has ended', 'preview_revoked', true],
    [refused(401, 'unauthorized', 'preview_invalid'), 401, 'This preview has ended', 'preview_invalid', true],
    [refused(401, 'unauthorized', null), 401, 'This preview has ended', 'unauthorized', true],
    [refused(409, 'conflict', 'preview_stale'), 409, 'The publish request changed', 'preview_stale', undefined],
    [refused(410, 'gone', 'preview_published'), 410, 'This is live now', 'preview_published', undefined],
    [refused(404, 'not_found', null), 404, 'Nothing to preview here', 'not_found', undefined],
    [refused(503, 'unavailable', null, { retryAfterMs: 2500 }), 503, 'Preview is busy', 'unavailable', undefined],
    [refused(429, 'rate_limited', null), 503, 'Preview is busy', 'rate_limited', undefined],
    [refused(0, 'no_answer', null), 502, 'The preview could not be read', 'no_answer', undefined],
    [refused(200, 'invalid_response', null), 502, 'The preview could not be read', 'invalid_response', undefined],
    [refused(200, 'response_too_large', null), 502, 'The preview could not be read', 'response_too_large', undefined],
    [refused(500, 'internal', null), 502, 'The preview could not be read', 'internal', undefined],
    [new TypeError('boom'), 502, 'The preview could not be read', 'unavailable', undefined],
  ]) {
    const notice = readNotice(error)
    assert.deepEqual([notice.status, notice.title, notice.reason, notice.forget], [status, title, reason, forget], reason)
  }
  assert.equal(readNotice(refused(503, 'unavailable', null, { retryAfterMs: 2500 })).retryAfter, 3)
  assert.equal(readNotice(refused(503, 'unavailable', null)).retryAfter, 1)
})

test('no notice repeats what Colophon wrote, or anything from the request', () => {
  const notice = readNotice(refused(401, 'unauthorized', 'preview_expired', { requestId: 'req-1' }))
  assert.ok(!JSON.stringify(notice).includes('refused:') && !JSON.stringify(notice).includes('req-1'))
  assert.deepEqual([ENDED.status, ENDED.title, ENDED.reason], [401, 'This preview has ended', 'no_preview_session'])
})
