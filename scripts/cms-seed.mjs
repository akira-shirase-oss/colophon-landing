// Seeds the Colophon project this site reads from: the content types in cms/content-types.json, then one
// draft per Markdown file in src/content and the two single entries from src/data/home.ts. It only ever
// creates: a content type or an entry that is already there is left as it is, so running it twice is safe.
// It doesn't publish; the drafts go live through a publish request, approved by a person.
//
//   COLOPHON_PROJECT=<project id> COLOPHON_TOKEN=<token> node scripts/cms-seed.mjs [--dry-run]
//
// The token is a project API token with schema.change and content.create, or a person's own token.
// COLOPHON_API defaults to the hosted service. --dry-run prints what it would send and sends nothing.
import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { parse as yaml } from 'yaml'

const api = (process.env.COLOPHON_API ?? 'https://colophonapp.404human.dev').replace(/\/+$/, '')
const project = process.env.COLOPHON_PROJECT ?? ''
const environment = process.env.COLOPHON_ENVIRONMENT ?? 'production'
const token = process.env.COLOPHON_TOKEN ?? ''
const dry = process.argv.includes('--dry-run')
if (!dry && (!project || !token)) {
  console.error('set COLOPHON_PROJECT and COLOPHON_TOKEN (or pass --dry-run)')
  process.exit(2)
}
const root = new URL('..', import.meta.url)
const base = `${api}/api/v1/projects/${project}/environments/${environment}`

/** One call. A key makes a repeated create answer with the first one's result instead of a second entry. */
async function call(method, path, body, key) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(key ? { 'idempotency-key': key } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  const text = await response.text()
  let json
  try {
    json = text ? JSON.parse(text) : undefined
  } catch {
    json = undefined
  }
  return { status: response.status, json, text }
}
const fail = (what, r) => {
  console.error(`${what}: HTTP ${r.status} ${r.text.slice(0, 600)}`)
  process.exit(1)
}
const key = (...parts) => `seed-${createHash('sha256').update(parts.join('\n')).digest('hex').slice(0, 40)}`
const day = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value === undefined ? undefined : String(value).slice(0, 10))
/** Colophon stores no empty values: leave them out. */
const compact = (document) => Object.fromEntries(Object.entries(document).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)))

async function markdown(folder) {
  const files = (await readdir(new URL(`src/content/${folder}/`, root))).filter((f) => f.endsWith('.md')).sort()
  return Promise.all(
    files.map(async (file) => {
      const text = await readFile(new URL(`src/content/${folder}/${file}`, root), 'utf8')
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
      if (!match) throw new Error(`${folder}/${file}: no frontmatter`)
      return { slug: file.replace(/\.md$/, ''), data: yaml(match[1]), body: match[2].replace(/^\s+/, '').replace(/\s+$/, '') + '\n' }
    }),
  )
}

const post = ({ slug, data, body }) =>
  compact({
    title: data.title,
    slug,
    description: data.description,
    pub_date: day(data.pubDate),
    updated_date: day(data.updatedDate),
    tags: data.tags,
    glossary: data.glossary === true ? true : undefined,
    status: data.status,
    body,
  })
const page = ({ slug, data, body }) =>
  compact({
    kind: data.kind,
    title: data.title,
    slug,
    description: data.description,
    target_query: data.targetQuery,
    pub_date: day(data.pubDate),
    updated_date: day(data.updatedDate),
    facts_checked: day(data.factsChecked),
    related: data.related,
    faq: data.faq,
    status: data.status,
    body,
  })

const types = JSON.parse(await readFile(new URL('cms/content-types.json', root), 'utf8'))
const { home, site } = await import(new URL('src/data/home.ts', root).href)
const drafts = (list) => list.filter((item) => item.data.draft !== true)
const plan = {
  posts: drafts(await markdown('blog')).map(post),
  pages: drafts(await markdown('pages')).map(page),
  home: [compact({ ...home, statement: home.statement.map(compact) })],
  site: [compact(site)],
}

if (dry) {
  for (const [collection, documents] of Object.entries(plan)) {
    console.log(`${collection}: ${documents.length} entr${documents.length === 1 ? 'y' : 'ies'}`)
    for (const d of documents) console.log(`  ${d.slug ?? d.seo_title ?? d.name}  (${JSON.stringify(d).length} bytes)`)
  }
  process.exit(0)
}

for (const [slug, definition] of Object.entries(types)) {
  const existing = await call('GET', `/content-types/${slug}`)
  if (existing.status === 200) {
    console.log(`type   ${slug}: already there`)
    continue
  }
  if (existing.status !== 404) fail(`GET content-types/${slug}`, existing)
  const made = await call('POST', '/content-types', { slug, definition }, key('type', slug, JSON.stringify(definition)))
  if (made.status !== 201) fail(`create content type ${slug}`, made)
  console.log(`type   ${slug}: created`)
}

const created = []
for (const [collection, documents] of Object.entries(plan)) {
  // What is already there, by URL name (or, for a single type, at all): the export is every draft's content,
  // one JSON document a line.
  const have = new Set()
  const exported = await call('GET', `/collections/${collection}/export`)
  if (exported.status !== 200) fail(`export ${collection}`, exported)
  for (const row of exported.text.split('\n').filter(Boolean)) {
    const content = JSON.parse(row)
    have.add((content.content ?? content).slug ?? '*')
  }
  for (const document of documents) {
    const name = document.slug ?? '*'
    if (have.has(name) || (types[collection].single && have.size > 0)) {
      console.log(`entry  ${collection}/${document.slug ?? ''}: already there`)
      continue
    }
    const made = await call('POST', `/collections/${collection}/entries`, document, key('entry', collection, name, JSON.stringify(document)))
    if (made.status !== 201) fail(`create ${collection}/${document.slug ?? ''}`, made)
    created.push(made.json.data.id)
    console.log(`entry  ${collection}/${document.slug ?? ''}: created ${made.json.data.id}`)
  }
}
console.log(`\n${created.length} draft(s) created. Publish them with a publish request naming these entries:`)
console.log(JSON.stringify(created))
