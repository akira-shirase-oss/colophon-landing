// A preview row becomes the words a layout takes, by the build's own mapping and schema (src/lib/schemas.ts): what
// the build accepts a preview draws, and what the build would refuse is listed in the Studio's field names,
// never drawn half-right.
//
//   npm test
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import { parse as yaml } from 'yaml'
import { home, site } from '../src/data/home.ts'
import { UNBUILDABLE, homeDraft, pageDraft, postDraft, siteDraft } from '../src/lib/preview/draft.ts'

const ID = '0190a4b0-0000-7000-8000-0000000000e1'
const row = (content, extra = {}) => ({ id: ID, ...(typeof content.slug === 'string' ? { slug: content.slug } : {}), content, preview: { source: 'draft' }, ...extra })
const DESCRIPTION = 'A description long enough to pass: one hundred and twenty characters at least, and no more than one hundred and fifty-five.'
const post = (changes = {}) => row({ title: 'A post', slug: 'a-post', description: DESCRIPTION, pub_date: '2026-11-26', body: '## Heading\n\nText.', ...changes })
const page = (changes = {}) =>
  row({ kind: 'compare', title: 'A page', slug: 'a-page', description: DESCRIPTION, target_query: 'a search', pub_date: '2026-11-26', related: [1, 2, 3].map((n) => ({ href: `/x${n}/`, text: `X ${n}` })), body: 'Text.', ...changes })
const problems = (draft) => {
  assert.equal(draft.ok, false)
  return draft.problems.map((p) => `${p.field} ${p.message}`)
}

/** The site's own Markdown as the entries scripts/cms-seed.mjs made of it: what the project held on day one. */
function seeded(folder, fields) {
  const day = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value === undefined ? undefined : String(value).slice(0, 10))
  return readdirSync(new URL(`../src/content/${folder}/`, import.meta.url))
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const [, front, body] = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(readFileSync(new URL(`../src/content/${folder}/${name}`, import.meta.url), 'utf8'))
      const data = yaml(front)
      const content = Object.fromEntries(Object.entries({ slug: name.replace(/\.md$/, ''), body, ...fields(data, day) }).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)))
      return { name, row: row(content) }
    })
}

test('every post and page the project was seeded with is a draft the preview can draw', () => {
  const posts = seeded('blog', (d, day) => ({ title: d.title, description: d.description, pub_date: day(d.pubDate), updated_date: day(d.updatedDate), tags: d.tags, glossary: d.glossary === true ? true : undefined, status: d.status }))
  const pages = seeded('pages', (d, day) => ({ kind: d.kind, title: d.title, description: d.description, target_query: d.targetQuery, pub_date: day(d.pubDate), updated_date: day(d.updatedDate), facts_checked: day(d.factsChecked), related: d.related, faq: d.faq, status: d.status }))
  assert.ok(posts.length >= 15 && pages.length >= 17, `${posts.length} posts, ${pages.length} pages`)
  for (const { name, row: entry } of posts) {
    const draft = postDraft(entry)
    assert.ok(draft.ok, `${name}: ${JSON.stringify(draft.problems)}`)
    assert.equal(draft.value.id, name.replace(/\.md$/, ''))
    assert.ok(draft.value.data.pubDate instanceof Date && draft.value.html.length > 100)
  }
  for (const { name, row: entry } of pages) {
    const draft = pageDraft(entry)
    assert.ok(draft.ok, `${name}: ${JSON.stringify(draft.problems)}`)
    assert.ok(draft.value.data.related.length >= 3)
  }
})

test('the home page and the site settings the project was seeded with can be drawn', () => {
  const homeEntry = homeDraft(row({ ...home, statement: home.statement.map((part) => Object.fromEntries(Object.entries(part).filter(([, v]) => v !== undefined))) }))
  assert.ok(homeEntry.ok, JSON.stringify(homeEntry.problems))
  assert.equal(homeEntry.value.hero_headline, home.hero_headline)
  const settings = siteDraft(row(site))
  assert.ok(settings.ok, JSON.stringify(settings.problems))
  assert.equal(settings.value.status_line, site.status_line)
  assert.ok(settings.value.status_checked instanceof Date)
})

test('a post’s fields arrive as the layout takes them', () => {
  const draft = postDraft(post({ updated_date: '2026-11-27', tags: ['a', 'b'], glossary: true, status: 'A note.' }))
  assert.ok(draft.ok)
  const { id, data, body, html } = draft.value
  assert.equal(id, 'a-post')
  assert.deepEqual([data.title, data.pubDate.toISOString(), data.updatedDate.toISOString(), data.tags, data.glossary, data.status, data.draft], ['A post', '2026-11-26T00:00:00.000Z', '2026-11-27T00:00:00.000Z', ['a', 'b'], true, 'A note.', false])
  assert.equal(body, '## Heading\n\nText.')
  assert.equal(html, '<h2 id="heading">Heading</h2>\n<p>Text.</p>\n')
  // Colophon stores no empty values: a blank field is absent or null, and reads as unset.
  const bare = postDraft(post({ updated_date: null, tags: null, status: '' }))
  assert.ok(bare.ok)
  assert.deepEqual([bare.value.data.updatedDate, bare.value.data.tags, bare.value.data.status], [undefined, [], undefined])
})

test('what the build would refuse in a post is listed in the Studio’s field names', () => {
  assert.deepEqual(problems(postDraft(post({ title: 'T'.repeat(50) }))), ['Title is too long: at most 49 characters'])
  assert.deepEqual(problems(postDraft(post({ description: 'Too short.' }))), ['Description is too short: at least 120 characters'])
  assert.deepEqual(problems(postDraft(post({ description: 'd'.repeat(156) }))), ['Description is too long: at most 155 characters'])
  assert.deepEqual(problems(postDraft(post({ title: undefined, description: undefined, pub_date: undefined }))), ['Title is missing', 'Description is missing', 'Published on is missing or is not a date'])
  assert.deepEqual(problems(postDraft(post({ pub_date: 'next week' }))), ['Published on is missing or is not a date'])
  assert.deepEqual(problems(postDraft(post({ body: '   \n' }))), ['Body is empty'])
  assert.deepEqual(problems(postDraft(post({ body: undefined }))), ['Body is empty'])
  assert.deepEqual(problems(postDraft(post({ body: 'a'.repeat(100_001) }))), ['Body is too long: at most 100,000 characters'])
  assert.deepEqual(problems(postDraft(post({ body: '>'.repeat(20_000) + ' x' }))), ['Body could not be rendered: its Markdown is nested too deeply'])
  assert.deepEqual(problems(postDraft(post({ tags: 'one' }))), ['Tags invalid input: expected array, received string'])
})

test('a URL name that could not be an address is a problem, not a path', () => {
  for (const slug of ['', 'Hello', 'a b', '../x', 'a/b', 'a--b', '-a', 'a-', 'ünï']) {
    const entry = post({ slug })
    assert.deepEqual(problems(postDraft(entry)), [`URL name ${slug === '' ? 'is empty' : 'may hold only lower-case letters, digits and single hyphens'}`], JSON.stringify(slug))
  }
  const noSlug = post()
  delete noSlug.slug
  delete noSlug.content.slug
  assert.deepEqual(problems(postDraft(noSlug)), ['URL name is empty'])
  // The row's own `slug` wins over a `slug` in the content, as it does for a published entry.
  assert.equal(postDraft({ ...post({ slug: 'in-content' }), slug: 'on-row' }).value.id, 'on-row')
})

test('what the build would refuse in a page is listed too', () => {
  assert.ok(pageDraft(page()).ok)
  assert.deepEqual(problems(pageDraft(page({ kind: 'landing' }))), ['Kind must be one of compare, use-case, feature, guide, hub'])
  assert.deepEqual(problems(pageDraft(page({ related: [{ href: '/a/', text: 'A' }] }))), ['Read next needs at least 3 items'])
  assert.deepEqual(problems(pageDraft(page({ target_query: undefined }))), ['Search it answers is missing'])
  assert.deepEqual(problems(pageDraft(page({ faq: [{ q: 'Why?', a: 'Because.' }] }))), ['Questions and answers, item 1, q is too short: at least 5 characters', 'Questions and answers, item 1, a is too short: at least 20 characters'])
})

test('the home page’s and the site settings’ limits are the build’s', () => {
  assert.deepEqual(problems(siteDraft(row({ name: 'n', version: '1', status_checked: '2026-11-24' }))), ['Status line is missing'])
  assert.deepEqual(problems(siteDraft(row({ name: 'n', version: '1', status_checked: '2026-11-24', status_line: 'x'.repeat(301) }))), ['Status line is too long: at most 300 characters'])
  const listed = problems(homeDraft(row({ ...home, hero_headline: '', benefits: [], statement_link_href: 'not a url' })))
  assert.deepEqual(listed.slice(0, 2), ['Headline is empty', 'Benefit cards needs at least 1 item'])
  assert.equal(listed.length, 3)
  assert.match(listed[2], /^Closing statement: link address /)
})

test('fields the reader’s role hides are named when they leave the draft unbuildable, and only then', () => {
  const hidden = { preview: { source: 'draft', hidden_fields: ['description', 'tags'] } }
  assert.deepEqual(problems(postDraft({ ...post({ description: undefined }), ...hidden })), [
    'Description is missing',
    'Hidden fields your role cannot read description, tags, so the preview has no value for them',
  ])
  assert.ok(postDraft({ ...post(), ...hidden }).ok, 'a hidden field the page can do without is no problem')
})

test('a draft that cannot be shown answers 422, with its reason', () => {
  assert.deepEqual([UNBUILDABLE.status, UNBUILDABLE.reason], [422, 'draft_not_buildable'])
})
