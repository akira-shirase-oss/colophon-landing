// What a preview route says when it has no draft to show, in plain words: why, and what to do next. Colophon
// answers a refusal with a stable `reason`; each one this site can meet has its sentence here, and the reason
// itself is shown beside it so it can be quoted.
import { ApiError, type Refusal } from './sdk.ts'

export interface Notice {
  /** The HTTP status the page answers with. */
  status: number
  title: string
  text: string
  /** Colophon's reason (or this site's own), shown small under the text. */
  reason: string
  /** Seconds to wait before trying again, sent as `Retry-After`. */
  retryAfter?: number
  /** The cookie names a preview Colophon no longer honours: clear it. */
  forget?: boolean
}

const AGAIN = 'Open the preview again from the Studio.'

/** No preview cookie arrived: never a draft, and never the published page at a preview address. */
export const ENDED: Notice = {
  status: 401,
  title: 'This preview has ended',
  text: `There is no preview session for this page: it has ended, or the browser did not keep this site's cookie. ${AGAIN}`,
  reason: 'no_preview_session',
}

/** The build reads no Colophon project, so there is nothing to preview. */
export const NOT_CONFIGURED: Notice = {
  status: 404,
  title: 'Draft preview is not set up',
  text: 'This build of the site reads no Colophon project, so it has no drafts to show.',
  reason: 'preview_not_configured',
}

/** The address names no entry this site previews. */
export const NO_SUCH_PAGE: Notice = {
  status: 404,
  title: 'There is no preview here',
  text: `This address is not a preview of a post, a page, the home page or the site settings. ${AGAIN}`,
  reason: 'not_a_preview_page',
}

const HANDLER: Record<Refusal['reason'], Pick<Notice, 'title' | 'text'>> = {
  method_not_allowed: { title: 'Preview links are opened, not posted', text: AGAIN },
  prefetch: { title: 'Preview links are opened, not prefetched', text: 'A preview link works once, so the browser may not load it ahead of time. Open it from the Studio.' },
  path_refused: {
    title: 'This preview link names no page',
    text: 'The link must end in the page to show, such as path=/preview/posts/<entry id>. Check the preview address in the Studio’s project settings.',
  },
  preview_not_found: { title: 'This preview link has expired', text: `A preview link works once and for one minute. This one has expired or was already used. ${AGAIN}` },
  rate_limited: { title: 'Preview is busy', text: 'Too many previews are open right now. Try again in a moment.' },
  unavailable: { title: 'The preview could not be started', text: `Colophon did not answer. ${AGAIN}` },
}

/** The handler's refusal, as a page. */
export function refusalNotice(refusal: Refusal): Notice {
  const retryAfter = Number(refusal.headers['Retry-After'])
  return { status: refusal.status, ...HANDLER[refusal.reason], reason: refusal.reason, ...(Number.isFinite(retryAfter) && retryAfter > 0 ? { retryAfter } : {}) }
}

const READ: Record<string, Pick<Notice, 'title' | 'text'> & { forget?: boolean }> = {
  preview_expired: { title: 'This preview has ended', text: `It expired. ${AGAIN}`, forget: true },
  preview_revoked: { title: 'This preview has ended', text: `It was ended from the Studio, or the person who opened it can no longer read this project. ${AGAIN}`, forget: true },
  preview_invalid: { title: 'This preview has ended', text: `The preview session is not one this project issued. ${AGAIN}`, forget: true },
  preview_stale: { title: 'The publish request changed', text: 'It was edited after this preview was opened. Preview it again from the Studio.' },
  preview_published: { title: 'This is live now', text: 'The publish request went live, so there is no draft left to preview. The site shows it once it is rebuilt.' },
}

/** A failed preview read, as a page: Colophon's reason in plain words, never the draft and never a guess. */
export function readNotice(error: unknown): Notice {
  if (!(error instanceof ApiError)) return { status: 502, title: 'The preview could not be read', text: 'Something went wrong while reading the draft. Try again.', reason: 'unavailable' }
  const reason = error.reason ?? error.code
  const known = READ[reason]
  if (known) return { status: error.status, title: known.title, text: known.text, reason, ...(known.forget ? { forget: true } : {}) }
  if (error.status === 401) return { status: 401, title: 'This preview has ended', text: AGAIN, reason, forget: true }
  if (error.status === 404) {
    return { status: 404, title: 'Nothing to preview here', text: `This preview does not include this entry, or the person who opened it cannot read it. ${AGAIN}`, reason }
  }
  if (error.status === 429 || error.status === 503) {
    return { status: 503, title: 'Preview is busy', text: 'Too many previews are being read right now. Try again in a moment.', reason, retryAfter: Math.max(1, Math.ceil((error.retryAfterMs ?? 1000) / 1000)) }
  }
  return { status: 502, title: 'The preview could not be read', text: 'Colophon did not answer. Try again in a moment.', reason }
}
