// Build-time reads of Colophon's public delivery API: this site's posts, pages and home copy are entries in a
// Colophon project, edited and published in the Studio. Published content is public, so there is no credential
// here. Every read of one build names the same release, so a publish that lands mid-build can't mix two.

/** The site's own project on the hosted service. An id, not a secret: published content is public. */
const SITE_PROJECT = '01a2093b-bd4e-77e8-a5da-06ab1634576f'

/**
 * Where the content lives. All three are public values; the environment can point a build somewhere else
 * (another server, a copy of the project), and `COLOPHON_PROJECT=` (empty) reads the Markdown files instead.
 */
export const source = {
  api: (process.env.COLOPHON_API ?? 'https://colophonapp.404human.dev').replace(/\/+$/, ''),
  project: process.env.COLOPHON_PROJECT ?? SITE_PROJECT,
  environment: process.env.COLOPHON_ENVIRONMENT ?? 'production',
}

/** Whether this build reads Colophon. With an empty project it reads the Markdown files in src/content. */
export const fromColophon = source.project !== ''

/** One published entry, as the delivery API answers it. */
export interface Entry {
  id: string
  revision_id: string
  collection: string
  title: string
  slug?: string
  content: Record<string, unknown>
  content_hash: string
  /** The release this version went live in. */
  published_in: number
}

const TIMEOUT_MS = 15_000
const TRIES = 3
const MAX_PAGES = 50 // 50 pages of 100: 5,000 entries a collection

/** GET with a deadline; a network failure or a 5xx is tried again, anything else is the answer. */
async function get(url: URL): Promise<Response> {
  let last: unknown
  for (let attempt = 1; attempt <= TRIES; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (response.status < 500) return response
      last = new Error(`HTTP ${response.status}`)
    } catch (error) {
      last = error
    }
    if (attempt < TRIES) await new Promise((done) => setTimeout(done, 500 * attempt))
  }
  throw new Error(`GET ${url.pathname}: ${last instanceof Error ? last.message : String(last)}`)
}

const base = (collection: string) =>
  `${source.api}/content/v1/${source.project}/${source.environment}/${encodeURIComponent(collection)}`

const named = (response: Response) => {
  const n = Number(response.headers.get('colophon-generation') ?? NaN)
  return Number.isSafeInteger(n) && n > 0 ? n : 0
}

let pinned: Promise<number> | undefined

/**
 * The release this build reads: the newest one when the build first asks, then the same number for every
 * read after it. 0 means nothing is published yet.
 */
export function release(): Promise<number> {
  pinned ??= (async () => {
    const url = new URL(base('posts'))
    url.searchParams.set('limit', '1')
    const response = await get(url)
    if (!response.ok) throw new Error(`GET ${url.pathname}: HTTP ${response.status}`)
    return named(response)
  })()
  return pinned
}

/** Every published entry of a collection, at this build's release. A failed read fails the build. */
export async function entries(collection: string): Promise<Entry[]> {
  const generation = await release()
  if (generation === 0) return []
  const items: Entry[] = []
  let cursor: string | null = null
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(base(collection))
    url.searchParams.set('limit', '100')
    // A cursor already carries the release of its first page.
    if (cursor !== null) url.searchParams.set('cursor', cursor)
    else url.searchParams.set('generation', String(generation))
    const response = await get(url)
    if (!response.ok) throw new Error(`GET ${url.pathname}: HTTP ${response.status}`)
    const body = (await response.json()) as { data: Entry[]; next_cursor: string | null }
    items.push(...body.data)
    cursor = body.next_cursor
    if (cursor === null) return items
  }
  throw new Error(`${collection}: more than ${MAX_PAGES * 100} entries; raise MAX_PAGES`)
}
