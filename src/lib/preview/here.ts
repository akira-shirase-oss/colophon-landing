// The preview routes' view of this deployment: the project they preview and the site's own security headers.
// The only preview module that needs the build: it reads public/_headers as text, so the routes send the
// headers that file gives every other page (policy.ts says what differs) and the two can't drift.
import headersFile from '../../../public/_headers?raw'
import { publicHeaders } from './policy.ts'
import type { NoticeAnswer, Site } from './routes.ts'
import { previewSource } from './site.ts'

const headers = publicHeaders(headersFile)

/** `Astro.locals` as the Pages worker fills it (adapter/worker.mjs); empty in `astro dev`. */
export function here(locals: App.Locals): Site {
  const assets = locals.assets
  return {
    source: previewSource(locals.colophon),
    headers,
    ...(assets
      ? {
          exists: async (path: string) => (await assets.fetch(new Request(new URL(path, 'https://assets.invalid'), { method: 'HEAD' }))).ok,
        }
      : {}),
  }
}

/** Puts an answer's status and headers on the page's response. */
export function answerWith(response: { status?: number; headers: Headers }, answer: { status?: number; headers: Record<string, string>; cookies?: NoticeAnswer['cookies'] }): void {
  if (answer.status !== undefined) response.status = answer.status
  for (const [name, value] of Object.entries(answer.headers)) response.headers.set(name, value)
  for (const cookie of answer.cookies ?? []) response.headers.append('set-cookie', cookie)
}
