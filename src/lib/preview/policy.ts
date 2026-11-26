// The headers a preview route answers with. Cloudflare Pages applies public/_headers to the files it serves and
// never to a response a Function makes, so the preview routes send their own. They are derived from the same
// file instead of written twice: the `/*` rule's headers, with exactly these differences.
//
//   Content-Security-Policy   `frame-ancestors` names the Studio's origin and nothing else, so the Studio can
//                             show the page in its preview pane; `script-src` also allows the one script a
//                             preview page adds (listen.ts), by hash. Every other directive is the public one.
//   X-Frame-Options           left out: it can only say DENY or SAMEORIGIN, and `frame-ancestors` already
//                             names the one origin that may frame the page.
//   Cache-Control             `private, no-store` on a page, `no-store` on the handler: no cache keeps a draft.
//   X-Robots-Tag              `noindex`.
//   Referrer-Policy           `no-referrer`.
import { LISTEN_SCRIPT_HASH } from './listen.ts'
import { originOf } from './sdk.ts'

/** The headers of the `/*` rule in a Cloudflare Pages `_headers` file, names in lower case. */
export function publicHeaders(headersFile: string): Map<string, string> {
  const headers = new Map<string, string>()
  let inAll = false
  for (const line of headersFile.split(/\r?\n/)) {
    const text = line.trim()
    if (text === '' || text.startsWith('#')) continue
    if (!/^\s/.test(line)) {
      inAll = text === '/*'
      continue
    }
    const header = /^([A-Za-z0-9-]+):\s*(.+)$/.exec(text)
    if (inAll && header) headers.set(header[1].toLowerCase(), header[2].trim())
  }
  if (!headers.has('content-security-policy')) throw new Error('public/_headers has no Content-Security-Policy in its /* rule')
  return headers
}

/**
 * The public policy with `frame-ancestors` set to the Studio's exact origin and the preview script's hash added
 * to `script-src`. It fails rather than guess when the public policy lacks either directive.
 */
export function previewPolicy(publicPolicy: string, studioOrigin: string): string {
  const origin = originOf(studioOrigin)
  let framed = false
  let scripted = false
  const directives = publicPolicy
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((directive) => {
      const [name, ...sources] = directive.split(/\s+/)
      if (name.toLowerCase() === 'frame-ancestors') {
        framed = true
        return `frame-ancestors ${origin}`
      }
      if (name.toLowerCase() === 'script-src') {
        scripted = true
        return [name, ...sources.filter((source) => source !== LISTEN_SCRIPT_HASH), LISTEN_SCRIPT_HASH].join(' ')
      }
      return directive
    })
  if (!framed || !scripted) throw new Error('the public Content-Security-Policy has no frame-ancestors or no script-src to build on')
  return directives.join('; ')
}

/**
 * What a preview route answers with, from the public headers: `page` for a page rendered at a preview address
 * (a draft, or the notice that the preview ended), `handler` for the preview handler's own answers.
 */
export function previewRouteHeaders(headers: Map<string, string>, studioOrigin: string, kind: 'page' | 'handler'): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, value] of headers) {
    if (name === 'x-frame-options') continue
    out[name] = name === 'content-security-policy' ? previewPolicy(value, studioOrigin) : value
  }
  out['cache-control'] = kind === 'page' ? 'private, no-store' : 'no-store'
  out['x-robots-tag'] = 'noindex'
  out['referrer-policy'] = 'no-referrer'
  return out
}
