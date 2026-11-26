// The worker Cloudflare Pages runs for the paths in dist/_routes.json (adapter/pages.mjs): the on-demand
// routes, and nothing else. A path that reaches it without being one of them is answered from the static
// files, as if the worker weren't there.
import { createApp } from 'astro/app/entrypoint'

const app = createApp()

/** A variable of the Pages project, when it is set to something. */
const named = (value) => (typeof value === 'string' && value !== '' ? value : undefined)

/**
 * No answer of the worker may be stored, indexed or framed unless the route said so itself. The routes set
 * their own headers; this is for an answer that didn't come from them (an error page of the framework's).
 */
function sealed(response) {
  if (response.headers.has('content-security-policy') && response.headers.has('cache-control')) return response
  const headers = new Headers(response.headers)
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store')
  if (!headers.has('x-robots-tag')) headers.set('x-robots-tag', 'noindex')
  if (!headers.has('content-security-policy')) {
    headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'none'")
    headers.set('x-frame-options', 'DENY')
  }
  headers.set('x-content-type-options', 'nosniff')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request, env) {
    const routeData = app.match(request)
    if (!routeData) return env.ASSETS.fetch(request)
    const locals = {
      colophon: { api: named(env.COLOPHON_API), project: named(env.COLOPHON_PROJECT), environment: named(env.COLOPHON_ENVIRONMENT) },
      assets: env.ASSETS,
    }
    try {
      return sealed(await app.render(request, { routeData, locals, prerenderedErrorPageFetch: (url) => env.ASSETS.fetch(url) }))
    } catch {
      // Nothing about the failure goes to the visitor or the log: a request here carries a preview token.
      return sealed(new Response('The preview could not be shown.', { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } }))
    }
  },
}
