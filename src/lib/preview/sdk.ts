// Draft preview against Colophon's `/preview/v1` surface, on the Web `Request`/`Response` types.
//
// Vendored from Colophon's own SDK, which isn't on npm yet: `packages/sdk/src/preview.ts` and the error type
// in `packages/sdk/src/error.ts` of github.com/akira-shirase-oss/colophon-cms (MIT, the same project and
// licence as this site), as of its commit 5c6eedd. Only what this site uses is here, and what it guarantees
// is kept as the SDK wrote it:
//
//   - `path` is a same-site relative path or nothing: never an open redirect, even through `/..//`;
//   - the cookie is `HttpOnly; Secure; SameSite=None; Partitioned` and lives exactly as long as the token;
//   - every answer of the handler is `no-store`, `no-referrer` and `noindex`; a page rendered in preview mode
//     is `private, no-store`, `noindex` and framable only by the Studio's exact origin;
//   - the token never reaches the browser's JavaScript, a URL or a `Referer`;
//   - every request to Colophon has a deadline and a bounded body, and never follows a redirect;
//   - every failure from Colophon is an `ApiError` keeping `details.reason`.
//
// Where it differs from the SDK, on purpose:
//
//   - the handler answers a refusal as data (`Refusal`) instead of a small HTML page, so the site draws it in
//     its own layout (src/pages/api/preview.astro);
//   - a `path` the site refuses is answered before the exchange, so the one-time code isn't spent on a link
//     that could only land on the wrong page (the SDK exchanges it and goes to `/`);
//   - `fetch` is called without `cache: 'no-store'`: Cloudflare's runtime refuses the `cache` option on
//     projects with an older compatibility date, and a Worker's subrequest isn't cached unless asked. The
//     answers are `private, no-store` on Colophon's side either way;
//   - only `exchange`, `get`, `list` and `session` are read; the body cap is 2 MiB, not 16.
//
// The browser half (`listenForDraftUpdates`) is in listen.ts. The tests are scripts/preview-sdk.test.mjs,
// ported from the SDK's own.

/* ------------------------------------------------------------------ errors */

/** `error.details`, as far as this site reads it. */
export interface ErrorDetails {
  reason?: string
  [key: string]: unknown
}

/**
 * Every failure a call can meet, as one typed error: the HTTP `status` (0 when no answer ever arrived), the
 * envelope's `code` (or `no_answer`, `invalid_response`, `response_too_large`, raised here), its `details`, and
 * the request id to quote in support.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError'
  readonly status: number
  readonly code: string
  readonly requestId: string | null
  readonly details: ErrorDetails | null
  /** `Retry-After` as milliseconds, when the answer named a wait. */
  readonly retryAfterMs: number | null

  constructor(status: number, code: string, message: string, init: { requestId?: string | null; details?: ErrorDetails | null; retryAfterMs?: number | null; cause?: unknown } = {}) {
    super(message, { cause: init.cause })
    this.status = status
    this.code = code
    this.requestId = init.requestId ?? null
    this.details = init.details ?? null
    this.retryAfterMs = init.retryAfterMs ?? null
  }

  /** The refusal's semantic reason (`details.reason`), or `null`. */
  get reason(): string | null {
    return typeof this.details?.reason === 'string' ? this.details.reason : null
  }

  /** Whether nothing was decided: no answer, a rate limit, a deadline or a 5xx. */
  get retryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500 || this.code === 'deadline_exceeded' || this.code === 'rate_limited' || this.code === 'unavailable'
  }
}

/** Narrows a parsed body to the error envelope, or `null` when it isn't one. */
function errorOf(body: unknown): { code: string; message: string; request_id?: string; details?: ErrorDetails } | null {
  const error = record(record(body)?.['error'])
  if (error === null || typeof error['code'] !== 'string' || typeof error['message'] !== 'string') return null
  return {
    code: error['code'],
    message: error['message'],
    ...(typeof error['request_id'] === 'string' ? { request_id: error['request_id'] } : {}),
    ...(record(error['details']) === null ? {} : { details: error['details'] as ErrorDetails }),
  }
}

/* ------------------------------------------------------------------ types */

/** What a preview grant covers: one entry (and its translations) or one publish request's pinned revisions. */
export interface PreviewScope {
  kind: 'entry' | 'changeset'
  entry?: string
  changeset?: string
  collection?: string
}

/** A code exchanged: the bearer token to keep in the site's own cookie, when it ends, and what it may read. */
export interface PreviewExchange {
  /** `cpv_…`: sent as `Authorization: Bearer`; never shown to the page's JavaScript. */
  token: string
  /** When the token stops working (ISO 8601). */
  expiresAt: string
  scope: PreviewScope
}

/** The live session a token names. */
export interface PreviewSession {
  scope: PreviewScope
  expiresAt: string
}

/**
 * One row of the preview surface: the published view's shape plus `preview`, which says where the content came
 * from (`draft`: the entry's latest saved draft; `changeset`: a publish request's pinned revision; `published`:
 * an entry outside the preview's scope, as the public sees it) and which fields the issuer's role may not read.
 */
export interface PreviewEntry {
  id: string
  revision_id?: string
  collection?: string
  title?: string
  slug?: string
  content: Record<string, unknown>
  preview: { source: 'published' | 'draft' | 'changeset'; hidden_fields?: string[] }
}

export interface PreviewClientOptions {
  /** Colophon's origin, such as `https://cms.example.com`. */
  baseUrl: string
  /** The project's id (a UUID, as `/content/v1` and `/preview/v1` name it). */
  project: string
  /** The environment; `production` by default. */
  environment?: string
  /** The `fetch` to use; defaults to the runtime's. */
  fetch?: typeof fetch
  /** How long one request may take. Default 10,000 ms: a page render waits on it. */
  timeoutMs?: number
  /** The most a response body may run to, in bytes. Default 2 MiB. */
  maxBodyBytes?: number
}

/** Reads with one preview token. */
export interface PreviewReader {
  /** `GET /preview/v1/{project}/{environment}/{collection}`: a page of rows, drafts where the scope covers them. */
  list(collection: string, opts?: { limit?: number }): Promise<PreviewEntry[]>
  /** `GET /preview/v1/{project}/{environment}/{collection}/{entry}`: one row. */
  get(collection: string, id: string): Promise<PreviewEntry>
  /** `GET /preview/v1/{project}/{environment}/session`: the scope and end of this token. */
  session(): Promise<PreviewSession>
}

export interface PreviewClient {
  /** `POST /preview/v1/{project}/{environment}/exchange`: trade a one-time code for a token. Unknown, used and
   *  expired codes all fail as a 404 `ApiError` (`preview_not_found`). */
  exchange(code: string): Promise<PreviewExchange>
  /** The reads one token may make. */
  reader(token: string): PreviewReader
}

/* ------------------------------------------------------------- the transport */

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024
/** The exchange body's cap on the server is 1 KiB; a code never comes near it. */
const MAX_CODE_LENGTH = 512
const segment = encodeURIComponent

interface Call {
  method: 'GET' | 'POST'
  path: string
  query?: Record<string, string | number | undefined>
  token?: string
  body?: unknown
}

interface Answer {
  body: unknown
  status: number
  requestId: string | null
}

async function readBounded(response: Response, cap: number, status: number, requestId: string | null): Promise<string> {
  const tooLarge = () => new ApiError(status, 'response_too_large', `the response ran past the ${cap}-byte cap`, { requestId })
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > cap) {
    await response.body?.cancel().catch(() => {})
    throw tooLarge()
  }
  if (response.body === null) {
    const text = await response.text()
    if (text.length > cap) throw tooLarge()
    return text
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > cap) {
        await reader.cancel().catch(() => {})
        throw tooLarge()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    body.set(chunk, at)
    at += chunk.byteLength
  }
  return new TextDecoder().decode(body)
}

function retryAfterMs(header: string | null): number | null {
  const text = header?.trim() ?? ''
  if (!/^\d+$/.test(text)) return null
  return Math.min(Number(text) * 1000, 60_000)
}

/** A `fetch` for `/preview/v1`: bounded wait, bounded body, every failure an `ApiError`. */
function transport(options: PreviewClientOptions): (call: Call) => Promise<Answer> {
  const base = options.baseUrl.replace(/\/+$/, '')
  const parsed = new URL(base)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TypeError(`baseUrl ${JSON.stringify(options.baseUrl)} is not an http(s) URL`)
  }
  if (options.project === '') throw new TypeError('previewClient needs a project')
  const agent = options.fetch ?? globalThis.fetch
  if (agent === undefined) throw new TypeError('no fetch in this runtime: pass `fetch`')
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const cap = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES

  return async (call) => {
    const url = new URL(base + call.path)
    for (const [key, value] of Object.entries(call.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
    const headers: Record<string, string> = { accept: 'application/json' }
    if (call.token !== undefined) headers['authorization'] = `Bearer ${call.token}`
    if (call.body !== undefined) headers['content-type'] = 'application/json'

    let response: Response
    try {
      response = await agent(url, {
        method: call.method,
        headers,
        ...(call.body === undefined ? {} : { body: JSON.stringify(call.body) }),
        signal: AbortSignal.timeout(timeoutMs),
        // A preview read never follows a redirect: a bearer token goes to Colophon only, and a 3xx fails
        // below as `invalid_response`.
        redirect: 'manual',
      })
    } catch (cause) {
      throw new ApiError(0, 'no_answer', `no answer from ${base}`, { cause })
    }

    const requestId = response.headers.get('x-request-id')
    let text: string
    try {
      text = await readBounded(response, cap, response.status, requestId)
    } catch (cause) {
      if (cause instanceof ApiError) throw cause
      // The deadline cut the body off: nothing usable came back.
      throw new ApiError(0, 'no_answer', `the answer from ${base} was cut off`, { requestId, cause })
    }
    let body: unknown = null
    if (text !== '') {
      try {
        body = JSON.parse(text)
      } catch (cause) {
        throw new ApiError(response.status, 'invalid_response', `a non-JSON body answered HTTP ${response.status}`, { requestId, cause })
      }
    }
    if (response.ok) return { body, status: response.status, requestId }
    const error = errorOf(body)
    throw new ApiError(response.status, error?.code ?? 'invalid_response', error?.message ?? `request failed (HTTP ${response.status})`, {
      requestId: requestId ?? error?.request_id ?? null,
      details: error?.details ?? null,
      retryAfterMs: retryAfterMs(response.headers.get('retry-after')),
    })
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function invalid(answer: Answer, what: string): ApiError {
  return new ApiError(answer.status, 'invalid_response', `the preview ${what} is not in the documented shape`, { requestId: answer.requestId })
}

function scopeOf(value: unknown): PreviewScope | null {
  const fields = record(value)
  if (fields === null || (fields['kind'] !== 'entry' && fields['kind'] !== 'changeset')) return null
  const scope: PreviewScope = { kind: fields['kind'] }
  for (const key of ['entry', 'changeset', 'collection'] as const) {
    const named = fields[key]
    if (typeof named === 'string') scope[key] = named
  }
  return scope
}

/** One row in the shape this site reads, or `null`: an id, a `content` object and where it came from. */
function entryOf(value: unknown): PreviewEntry | null {
  const row = record(value)
  const content = record(row?.['content'])
  const preview = record(row?.['preview'])
  const source = preview?.['source']
  if (row === null || content === null || typeof row['id'] !== 'string') return null
  if (source !== 'published' && source !== 'draft' && source !== 'changeset') return null
  const hidden = preview?.['hidden_fields']
  return {
    id: row['id'],
    ...(typeof row['revision_id'] === 'string' ? { revision_id: row['revision_id'] } : {}),
    ...(typeof row['collection'] === 'string' ? { collection: row['collection'] } : {}),
    ...(typeof row['title'] === 'string' ? { title: row['title'] } : {}),
    ...(typeof row['slug'] === 'string' ? { slug: row['slug'] } : {}),
    content,
    preview: { source, ...(Array.isArray(hidden) ? { hidden_fields: hidden.filter((name): name is string => typeof name === 'string') } : {}) },
  }
}

/** A token as the cookie and the `Authorization` header carry it: RFC 6265 cookie octets only. */
const TOKEN = /^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]{1,1024}$/

/* ---------------------------------------------------------------- the client */

/**
 * The preview surface of one project's environment, for the site's server: `exchange` a one-time code, then
 * `reader(token)` for the reads a page makes.
 */
export function previewClient(options: PreviewClientOptions): PreviewClient {
  const send = transport(options)
  const root = `/preview/v1/${segment(options.project)}/${segment(options.environment ?? 'production')}`

  const reader = (token: string): PreviewReader => {
    if (!TOKEN.test(token)) throw new TypeError('not a preview token')
    return {
      async list(collection, opts = {}) {
        const answer = await send({ method: 'GET', path: `${root}/${segment(collection)}`, token, query: { limit: opts.limit } })
        const rows = record(answer.body)?.['data']
        if (!Array.isArray(rows)) throw invalid(answer, 'list')
        return rows.map((row) => {
          const entry = entryOf(row)
          if (entry === null) throw invalid(answer, 'list')
          return entry
        })
      },
      async get(collection, id) {
        const answer = await send({ method: 'GET', path: `${root}/${segment(collection)}/${segment(id)}`, token })
        const entry = entryOf(record(answer.body)?.['data'])
        if (entry === null) throw invalid(answer, 'entry')
        return entry
      },
      async session() {
        const answer = await send({ method: 'GET', path: `${root}/session`, token })
        const data = record(record(answer.body)?.['data'])
        const scope = scopeOf(data?.['scope'])
        const expiresAt = data?.['expires_at']
        if (scope === null || typeof expiresAt !== 'string') throw invalid(answer, 'session')
        return { scope, expiresAt }
      },
    }
  }

  return {
    async exchange(code) {
      if (code === '' || code.length > MAX_CODE_LENGTH) {
        throw new ApiError(404, 'not_found', 'this preview link has expired or was already used', { details: { reason: 'preview_not_found' } })
      }
      const answer = await send({ method: 'POST', path: `${root}/exchange`, body: { code } })
      const data = record(record(answer.body)?.['data'])
      const token = data?.['token']
      const expiresAt = data?.['expires_at']
      const scope = scopeOf(data?.['scope'])
      if (typeof token !== 'string' || !TOKEN.test(token) || typeof expiresAt !== 'string' || Number.isNaN(Date.parse(expiresAt)) || scope === null) {
        throw invalid(answer, 'exchange')
      }
      return { token, expiresAt, scope }
    },
    reader,
  }
}

/* ------------------------------------------------------- the site's server */

/** The site's preview cookie. */
export const PREVIEW_COOKIE = 'colophon_preview'
/** The longest a preview cookie may live: a renewed grant ends 8 hours after it was made. */
const MAX_COOKIE_SECONDS = 8 * 60 * 60
/** The longest `path` a handler follows. */
const MAX_PATH_LENGTH = 2048
/** RFC 6265 `token`: what a cookie name may be. */
const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/
// Control characters are the point: a tab, a line break or a NUL in a path is refused.
// oxlint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x1f\x7f]/

function cookieNameOf(name: string | undefined): string {
  const cookieName = name ?? PREVIEW_COOKIE
  if (!COOKIE_NAME.test(cookieName)) throw new TypeError(`${JSON.stringify(cookieName)} is not a valid cookie name`)
  return cookieName
}

/**
 * `path` as a same-site redirect target, or `null`: a relative path starting with one `/`, no backslash or
 * control character, at most 2,048 characters, that still names a path on this site once resolved (so
 * `/..//evil.example` is refused too). The answer is the resolved, percent-encoded form, which is what
 * `isAllowedPath` sees and what `Location` carries.
 */
export function safePreviewPath(path: string | null | undefined, isAllowedPath?: (path: string) => boolean): string | null {
  if (typeof path !== 'string' || path.length === 0 || path.length > MAX_PATH_LENGTH) return null
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || CONTROL.test(path)) return null
  const probe = 'http://site.invalid'
  let resolved: URL
  try {
    resolved = new URL(path, probe)
  } catch {
    return null
  }
  if (resolved.origin !== probe) return null
  const safe = resolved.pathname + resolved.search + resolved.hash
  if (!safe.startsWith('/') || safe.startsWith('//') || safe.includes('\\') || safe.length > MAX_PATH_LENGTH) return null
  if (isAllowedPath !== undefined && !isAllowedPath(safe)) return null
  return safe
}

/** The headers every answer of the handler carries. */
export function handlerHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex', ...extra }
}

/** The preview cookie: unreadable by scripts, sent only over TLS, and partitioned so it works in the Studio's frame. */
export function previewCookie(value: string, maxAge: number, name: string = PREVIEW_COOKIE): string {
  return `${cookieNameOf(name)}=${value}; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=${maxAge}`
}

/** Seconds from now until `expiresAt`, within `0 ..= 8 h`. */
export function secondsLeft(expiresAt: string, now: number): number {
  const left = Math.floor((Date.parse(expiresAt) - now) / 1000)
  return Number.isFinite(left) ? Math.min(Math.max(left, 0), MAX_COOKIE_SECONDS) : 0
}

/** Why the handler didn't start a preview, for the site to say in its own words (notices.ts). */
export interface Refusal {
  /** The HTTP status the page answers with. */
  status: 400 | 404 | 405 | 502 | 503
  /**
   * `method_not_allowed`; `prefetch` (a speculative load would spend the code); `path_refused` (`path` is
   * missing, foreign or not a page this site previews); `preview_not_found` (an unknown, used or expired code);
   * `rate_limited` (Colophon is at its limit); `unavailable` (no answer, or one that made no sense).
   */
  reason: 'method_not_allowed' | 'prefetch' | 'path_refused' | 'preview_not_found' | 'rate_limited' | 'unavailable'
  /** The headers the page answers with: the handler's guard, plus `Allow` or `Retry-After` where they apply. */
  headers: Record<string, string>
  /** What Colophon said, safe to show a person; absent when the refusal is the handler's own. */
  message?: string
}

export interface PreviewHandlerOptions extends PreviewClientOptions {
  /** The cookie the token is kept in. Default `colophon_preview`. */
  cookieName?: string
  /** A further rule for `path` (say, only `/preview/…`), given the resolved path. */
  isAllowedPath?: (path: string) => boolean
  /** The clock, for tests. */
  now?: () => number
}

/**
 * The site's preview endpoint, `GET /api/preview?code=…&path=…` (the Studio's preview target names it). It
 * exchanges the code, keeps the token in an `HttpOnly; Secure; SameSite=None; Partitioned` cookie that lives
 * exactly as long as the token, and answers `303` to `path`. Anything else is a `Refusal` for the site to draw,
 * with the handler's headers: a missing, foreign or refused `path` (before the code is spent), an unknown, used
 * or expired code, a limit, or no answer. Every answer is `no-store`, `noindex` and `no-referrer`.
 */
export function createPreviewHandler(options: PreviewHandlerOptions): (request: Request) => Promise<Response | Refusal> {
  const client = previewClient(options)
  const cookieName = cookieNameOf(options.cookieName)
  const now = options.now ?? Date.now

  return async (request) => {
    if (request.method !== 'GET') {
      return { status: 405, reason: 'method_not_allowed', headers: handlerHeaders({ Allow: 'GET' }) }
    }
    // A speculative prefetch would spend the one-time code before the person ever looks.
    if ((request.headers.get('sec-purpose') ?? request.headers.get('purpose') ?? '').includes('prefetch')) {
      return { status: 503, reason: 'prefetch', headers: handlerHeaders() }
    }
    const url = new URL(request.url)
    const code = url.searchParams.get('code') ?? ''
    const target = safePreviewPath(url.searchParams.get('path'), options.isAllowedPath)
    if (target === null) return { status: 400, reason: 'path_refused', headers: handlerHeaders() }

    let exchanged: PreviewExchange
    try {
      // Not `request.signal`: some servers abort it once the request body is read, and a code spent by an
      // aborted exchange is gone for good. The client's deadline bounds it.
      exchanged = await client.exchange(code)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return { status: 404, reason: 'preview_not_found', headers: handlerHeaders(), message: error.message }
      }
      if (error instanceof ApiError && (error.status === 429 || error.status === 503)) {
        return { status: 503, reason: 'rate_limited', headers: handlerHeaders({ 'Retry-After': String(Math.ceil((error.retryAfterMs ?? 1000) / 1000)) }) }
      }
      return { status: 502, reason: 'unavailable', headers: handlerHeaders() }
    }

    return new Response(null, {
      status: 303,
      headers: handlerHeaders({
        Location: target,
        'Set-Cookie': previewCookie(exchanged.token, secondsLeft(exchanged.expiresAt, now()), cookieName),
      }),
    })
  }
}

/** The preview token the request's cookie carries, or `null` when there is none (or it is not a token at all). */
export function previewTokenFromRequest(request: Request, cookieName: string = PREVIEW_COOKIE): string | null {
  const name = cookieNameOf(cookieName)
  const header = request.headers.get('cookie')
  if (header === null) return null
  for (const pair of header.split(';')) {
    const at = pair.indexOf('=')
    if (at < 0 || pair.slice(0, at).trim() !== name) continue
    const value = pair.slice(at + 1).trim()
    if (TOKEN.test(value)) return value
  }
  return null
}

/**
 * `studioOrigin` as an exact `scheme://host[:port]`, or a `TypeError`: it lands in a CSP and in `postMessage`'s
 * `targetOrigin`, where a `*`, a path or a credential would widen who is trusted.
 */
export function originOf(studioOrigin: string): string {
  let parsed: URL | null = null
  try {
    parsed = new URL(studioOrigin)
  } catch {
    // reported below
  }
  if (
    parsed === null ||
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== '' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    studioOrigin.includes('*')
  ) {
    throw new TypeError(`studioOrigin ${JSON.stringify(studioOrigin)} is not an origin (scheme://host[:port], nothing after)`)
  }
  return parsed.origin
}

/**
 * The headers a page rendered in preview mode answers with: never stored by any cache, never indexed, and
 * framable only by the Studio. (This site sends a fuller policy with the same `frame-ancestors`: policy.ts.)
 */
export function previewHeaders(options: { studioOrigin: string }): Record<string, string> {
  return {
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex',
    'Content-Security-Policy': `frame-ancestors ${originOf(options.studioOrigin)}`,
  }
}

export interface ExitPreviewOptions {
  cookieName?: string
  /** Where to go when the request names no (acceptable) `?path=`. Default `/`. */
  redirectTo?: string
  /** The same kind of rule as the preview handler's, for `?path=`. */
  isAllowedPath?: (path: string) => boolean
}

/**
 * The site's "exit preview" endpoint: clears the preview cookie and answers `303` to `?path=` (checked exactly
 * as the preview handler checks it) or `redirectTo`.
 */
export function exitPreviewHandler(options: ExitPreviewOptions = {}): (request: Request) => Response {
  const cookieName = cookieNameOf(options.cookieName)
  const fallback = safePreviewPath(options.redirectTo ?? '/')
  if (fallback === null) throw new TypeError(`redirectTo ${JSON.stringify(options.redirectTo)} is not a same-site path`)
  return (request) => {
    const target = safePreviewPath(new URL(request.url).searchParams.get('path'), options.isAllowedPath) ?? fallback
    return new Response(null, {
      status: 303,
      headers: handlerHeaders({ Location: target, 'Set-Cookie': previewCookie('', 0, cookieName) }),
    })
  }
}
