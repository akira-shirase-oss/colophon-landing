// A stand-in for Colophon's /preview/v1, for the checks that drive the built preview worker
// (scripts/check-preview.mjs, and the preview part of scripts/check-csp-browser.mjs): one project, a draft in
// each of the site's four collections, a one-time code, and tokens that are refused in each documented way.
// It listens on 127.0.0.1 on a port the system picks and answers nothing else. Everything in it is made up:
// the token and the code are fixed strings that no Colophon ever issued.
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

export const PROJECT = '0190a4b0-0000-7000-8000-00000000aaaa'
export const ENVIRONMENT = 'production'
export const ID = { post: '0190a4b0-0000-7000-8000-0000000000e1', page: '0190a4b0-0000-7000-8000-0000000000e2', home: '0190a4b0-0000-7000-8000-0000000000e3', site: '0190a4b0-0000-7000-8000-0000000000e4', other: '0190a4b0-0000-7000-8000-0000000000e5', broken: '0190a4b0-0000-7000-8000-0000000000e6' }
export const TOKEN = 'cpv_Zm9yLXRoZS1jaGVjay1vbmx5LW5ldmVyLXJlYWw'
export const CODE = 'cpc_b25lLXRpbWUtY29kZS1mb3ItdGhlLWNoZWNr'
/** Tokens the stand-in refuses, each the way Colophon would. */
export const REFUSED = {
  cpv_expired: [401, 'unauthorized', 'preview_expired'],
  cpv_revoked: [401, 'unauthorized', 'preview_revoked'],
  cpv_stale: [409, 'conflict', 'preview_stale'],
  cpv_published: [410, 'gone', 'preview_published'],
  cpv_busy: [503, 'unavailable', null],
}
const description = 'A draft that exists only in the stand-in for Colophon this check runs, long enough to pass the limits the build puts on a description.'
export const ENTRIES = {
  posts: {
    [ID.post]: {
      source: 'draft',
      slug: 'draft-only-post',
      content: {
        title: 'A draft only the check has seen',
        slug: 'draft-only-post',
        description,
        pub_date: '2026-11-26',
        tags: ['preview'],
        status: 'This sentence is the draft post’s own status note.',
        body: '## Why "drafts" matter\n\nIt\'s the unpublished sentence: UNPUBLISHED-MARKER-7f3a.\n\n| Left | Right |\n|:--|--:|\n| a | b |\n\n```ts\nconst answer: number = 6 * 7 // <b>not markup</b>\n```\n',
      },
    },
    [ID.other]: {
      source: 'published',
      slug: 'published-neighbour',
      content: { title: 'A published neighbour', slug: 'published-neighbour', description, pub_date: '2026-11-20', body: 'Already live.' },
    },
    [ID.broken]: {
      source: 'draft',
      slug: 'too-long',
      content: { title: 'A title that runs far past the forty-nine characters a post may have', slug: 'too-long', pub_date: '2026-11-26', body: 'Text.' },
    },
  },
  pages: {
    [ID.page]: {
      source: 'changeset',
      slug: 'draft-comparison',
      content: {
        kind: 'compare',
        title: 'A comparison in a publish request',
        slug: 'draft-comparison',
        description,
        target_query: 'colophon preview check',
        pub_date: '2026-11-26',
        related: [
          { href: '/blog/', text: 'The blog' },
          { href: '/compare/', text: 'All comparisons' },
          { href: '/features/', text: 'All features' },
        ],
        faq: [{ q: 'Is this page published?', a: 'No. It exists only in the stand-in this check runs.' }],
        body: 'A page body with the marker PAGE-MARKER-91c2.',
      },
    },
  },
  home: {
    [ID.home]: {
      source: 'draft',
      content: {
        seo_title: 'A home page title only the check has seen | Colophon',
        seo_description: description,
        hero_headline: 'A headline from a draft.',
        hero_description: 'The sentence under it, also from the draft: HOME-MARKER-44d0.',
        benefits: [{ title: 'One card', line_one: 'Its first line.', line_two: 'Its second line.', tag: 'A tag', tone: 'brand', icon: 'receipt' }],
        faq: [{ q: 'Is this the live home page?', a: 'No. These words come from a draft in the stand-in.' }],
        statement_heading: 'A closing heading',
        statement: [{ lead: 'write a', word: 'draft', icon: 'pen', after: '.' }],
        statement_link_text: 'Read on',
        statement_link_href: 'https://404human.dev/colophon/',
      },
    },
  },
  site: {
    [ID.site]: {
      source: 'draft',
      content: { name: 'Colophon website', version: '9.9.9-check', status_checked: '2026-11-25', status_line: 'A status line only the check has seen: STATUS-MARKER-0be7.' },
    },
  },
}

const envelope = (res, status, code, reason, extra = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', 'x-request-id': '0190a4b0-0000-7000-8000-000000000002', 'cache-control': 'private, no-store', ...extra })
  res.end(JSON.stringify({ error: { code, message: `refused: ${reason ?? code}`, request_id: '0190a4b0-0000-7000-8000-000000000002', ...(reason ? { details: { reason } } : {}) } }))
}
const row = (collection, id, entry) => ({ id, revision_id: '0190a4b0-0000-7000-8000-0000000000f1', collection, title: entry.content.title ?? entry.content.seo_title ?? entry.content.name, ...(entry.slug ? { slug: entry.slug } : {}), content: entry.content, content_hash: 'sha256:00', published_in: 2, preview: { source: entry.source } })

/**
 * Starts the stand-in. `pages` are HTML pages it also serves, by path. `seen` lists every API request it received; `exchanges()` counts the codes it was asked to
 * exchange; `oversize(true)` makes an entry's answer run past the site's body cap; `again()` makes the code
 * usable once more; `close()` stops it.
 */
export async function startStub({ pages = {} } = {}) {
  const seen = []
  let exchanges = 0
  let codeSpent = false
  let oversize = false
  const stub = createServer((req, res) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      const url = new URL(req.url, 'http://stub.invalid')
      // A page of the Studio's own (the one that frames a preview, in the browser check): not part of /preview/v1.
      if (req.method === 'GET' && Object.hasOwn(pages, url.pathname)) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
        return res.end(pages[url.pathname])
      }
      seen.push({ method: req.method, path: url.pathname, headers: req.headers, body })
      const base = `/preview/v1/${PROJECT}/${ENVIRONMENT}`
      if (!url.pathname.startsWith(`${base}/`)) return envelope(res, 404, 'not_found', null)
      const rest = url.pathname.slice(base.length + 1).split('/')
      if (req.method === 'POST' && rest.join('/') === 'exchange') {
        exchanges += 1
        let code
        try {
          code = JSON.parse(body).code
        } catch {
          return envelope(res, 400, 'malformed_json', null)
        }
        if (code !== CODE || codeSpent) return envelope(res, 404, 'not_found', 'preview_not_found')
        codeSpent = true
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'private, no-store' })
        return res.end(JSON.stringify({ data: { token: TOKEN, expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), scope: { kind: 'entry', entry: ID.post } } }))
      }
      const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1]
      if (bearer !== TOKEN) {
        const [status, code, reason] = REFUSED[bearer] ?? [401, 'unauthorized', 'preview_invalid']
        return envelope(res, status, code, reason, status === 503 ? { 'retry-after': '7' } : {})
      }
      const [collection, id] = rest
      const entries = ENTRIES[collection]
      if (req.method !== 'GET' || !entries || (id !== undefined && !entries[id])) return envelope(res, 404, 'not_found', null)
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'private, no-store', 'colophon-preview': 'entry' })
      if (id === undefined) return res.end(JSON.stringify({ data: Object.entries(entries).map(([entryId, entry]) => row(collection, entryId, entry)), next_cursor: null }))
      if (oversize) return res.end(JSON.stringify({ data: { ...row(collection, id, entries[id]), padding: 'x'.repeat(3 * 1024 * 1024) } }))
      return res.end(JSON.stringify({ data: row(collection, id, entries[id]) }))
    })
  })
  await new Promise((done) => stub.listen(0, '127.0.0.1', done))
  return {
    origin: `http://127.0.0.1:${stub.address().port}`,
    PROJECT,
    ENVIRONMENT,
    ID,
    TOKEN,
    CODE,
    seen,
    exchanges: () => exchanges,
    oversize: (on) => void (oversize = on),
    again: () => void (codeSpent = false),
    close: () => new Promise((done) => stub.close(done)),
  }
}

// Run on its own, it serves until stopped: `node scripts/preview-stub.mjs` prints its address, for trying the
// built worker by hand.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const stub = await startStub()
  process.stdout.write(`${JSON.stringify({ origin: stub.origin, project: PROJECT, code: CODE, token: TOKEN, ids: ID })}\n`)
}
