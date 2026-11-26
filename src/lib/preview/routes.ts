// The three preview routes, as functions of a request: what each one answers and with which headers. The pages
// in src/pages/api/preview* and src/pages/preview draw the result; nothing here knows about Astro, so
// scripts/preview-routes.test.mjs runs it against a stub of Colophon.
//
//   enter   GET /api/preview?code=…&path=…    exchange the code, keep the token in the cookie, go to `path`
//   open    GET /preview/<collection>/<id>    the draft of one entry, or why there is none to show
//   leave   GET /api/preview/exit             clear the cookie and go to a public page (in a frame: say so, and stay)
import { ENDED, LEFT, NOT_CONFIGURED, NO_SUCH_PAGE, readNotice, refusalNotice, type Notice } from './notices.ts'
import { previewRouteHeaders } from './policy.ts'
import { createPreviewHandler, exitPreviewHandler, handlerHeaders, previewClient, previewCookie, previewTokenFromRequest, type PreviewEntry } from './sdk.ts'
import { isCollection, isEntryId, isPreviewPath, isPublicPath, type Collection, type PreviewSource } from './site.ts'

/** What the routes need to know about the site they run on. */
export interface Site {
  /** Where drafts are read from; `null` when the build reads no Colophon project. */
  source: PreviewSource | null
  /** The `/*` headers of public/_headers (policy.ts): the preview routes send the same, less what differs. */
  headers: Map<string, string>
  /** The `fetch` that reaches Colophon; the runtime's by default. */
  fetch?: typeof fetch
  /** The clock, for tests. */
  now?: () => number
  /** Whether the site serves a page at a path, so "Exit preview" never lands on a page that isn't there. */
  exists?: (path: string) => Promise<boolean>
}

/** A notice and everything its response carries. */
export interface NoticeAnswer {
  kind: 'notice'
  notice: Notice
  status: number
  headers: Record<string, string>
  /** `Set-Cookie` values, each sent as its own header. */
  cookies: string[]
  /** The Studio's origin, for the page's handshake script; `null` when there is no project to preview. */
  studioOrigin: string | null
  /** A public page of the site to offer in a new tab (after "Exit preview" inside a frame). */
  link?: string
}

/** A draft (or, for an entry outside the preview's scope, its published version) and its response headers. */
export interface DraftAnswer {
  kind: 'draft'
  entry: PreviewEntry
  /** The `site` entry as this preview sees it, for the status line under a post's or a page's title. */
  settings: PreviewEntry | null
  headers: Record<string, string>
  studioOrigin: string
}

/**
 * The headers of a preview route. With a project to preview they let the Studio, and only the Studio, frame the
 * answer; without one there is no Studio to name, and the public headers stand as they are (never framed).
 */
function headersOf(site: Site, kind: 'page' | 'handler'): Record<string, string> {
  if (site.source !== null) return previewRouteHeaders(site.headers, site.source.studioOrigin, kind)
  return { ...Object.fromEntries(site.headers), ...Object.fromEntries(Object.entries(handlerHeaders()).map(([name, value]) => [name.toLowerCase(), value])) }
}

function noticeAnswer(site: Site, kind: 'page' | 'handler', notice: Notice, extra: Record<string, string> = {}): NoticeAnswer {
  const headers = { ...headersOf(site, kind), ...Object.fromEntries(Object.entries(extra).map(([name, value]) => [name.toLowerCase(), value])) }
  if (notice.retryAfter !== undefined) headers['retry-after'] = String(notice.retryAfter)
  return { kind: 'notice', notice, status: notice.status, headers, cookies: notice.forget ? [previewCookie('', 0)] : [], studioOrigin: site.source?.studioOrigin ?? null }
}

/** `GET /api/preview`: a `303` with the cookie, or the notice to draw. */
export async function enter(site: Site, request: Request): Promise<Response | NoticeAnswer> {
  if (site.source === null) return noticeAnswer(site, 'handler', NOT_CONFIGURED)
  const handle = createPreviewHandler({
    baseUrl: site.source.api,
    project: site.source.project,
    environment: site.source.environment,
    isAllowedPath: isPreviewPath,
    ...(site.fetch ? { fetch: site.fetch } : {}),
    ...(site.now ? { now: site.now } : {}),
  })
  const outcome = await handle(request)
  if (!(outcome instanceof Response)) return noticeAnswer(site, 'handler', refusalNotice(outcome), outcome.headers)
  // The redirect carries the handler's own headers; the rest of the site's (HSTS, nosniff) go with it.
  const headers = new Headers(outcome.headers)
  for (const [name, value] of Object.entries(headersOf(site, 'handler'))) if (!headers.has(name)) headers.set(name, value)
  return new Response(null, { status: outcome.status, headers })
}

/**
 * `GET /preview/<collection>/<id>`: the row to draw, or the notice. Nothing is read before the address is known
 * to name one of the four collections and a UUID, and nothing is read without a preview cookie: such a request
 * is told the preview has ended, and never sees a draft or the published page.
 */
export async function open(site: Site, request: Request, collection: string | undefined, id: string | undefined): Promise<DraftAnswer | NoticeAnswer> {
  if (site.source === null) return noticeAnswer(site, 'page', NOT_CONFIGURED)
  if (!isCollection(collection) || !isEntryId(id)) return noticeAnswer(site, 'page', NO_SUCH_PAGE)
  const token = previewTokenFromRequest(request)
  if (token === null) return noticeAnswer(site, 'page', ENDED)
  const reader = previewClient({
    baseUrl: site.source.api,
    project: site.source.project,
    environment: site.source.environment,
    ...(site.fetch ? { fetch: site.fetch } : {}),
  }).reader(token)
  try {
    const wantsSettings: Collection[] = ['posts', 'pages']
    const [entry, settings] = await Promise.all([
      reader.get(collection, id),
      // The status line is the `site` entry's. A role that can't read it still gets its preview, without the line.
      wantsSettings.includes(collection) ? reader.list('site', { limit: 1 }).then((rows) => rows[0] ?? null, () => null) : null,
    ])
    return { kind: 'draft', entry, settings, headers: headersOf(site, 'page'), studioOrigin: site.source.studioOrigin }
  } catch (error) {
    return noticeAnswer(site, 'page', readNotice(error))
  }
}

/**
 * `GET /api/preview/exit`: clears the cookie and goes to `?path=` when it is a public page that exists, else `/`.
 * Inside a frame (the Studio's preview pane) it stays put and says so instead: the site's public pages refuse
 * to be framed, so a redirect to one would leave the pane blank.
 */
export async function leave(site: Site, request: Request): Promise<Response | NoticeAnswer> {
  let outcome = exitPreviewHandler({ isAllowedPath: isPublicPath })(request)
  const target = outcome.headers.get('location') ?? '/'
  if (target !== '/' && site.exists && !(await site.exists(target).catch(() => false))) {
    outcome = exitPreviewHandler()(new Request(new URL('/api/preview/exit', request.url)))
  }
  if (/^(?:iframe|frame|embed|object)$/.test(request.headers.get('sec-fetch-dest') ?? '')) {
    return { ...noticeAnswer(site, 'handler', LEFT), cookies: outcome.headers.getSetCookie(), link: outcome.headers.get('location') ?? '/' }
  }
  const headers = new Headers(outcome.headers)
  for (const [name, value] of Object.entries(headersOf(site, 'handler'))) if (!headers.has(name)) headers.set(name, value)
  return new Response(null, { status: outcome.status, headers })
}
