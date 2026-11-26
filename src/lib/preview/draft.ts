// A preview row from Colophon as the words a layout takes: the entry's fields, mapped and checked exactly as
// the build maps and checks a published entry (src/lib/schemas.ts). A draft the build would refuse isn't drawn
// half-right: its problems are listed instead, in the Studio's own field names.
import type { z } from 'astro/zod'
import { homeSchema, pageFields, pageSchema, postFields, postSchema, siteSchema, type HomeCopy, type PageData, type PostData, type SiteCopy } from '../schemas.ts'
import { renderBody } from './markdown.ts'
import type { PreviewEntry } from './sdk.ts'

/** One thing the build would refuse, said for the person editing: the field's name in the Studio, and why. */
export interface Problem {
  field: string
  message: string
}

export type Draft<T> = { ok: true; value: T } | { ok: false; problems: Problem[] }

/** The notice above a draft's problems: the preview session is fine, the draft isn't something the site can build. */
export const UNBUILDABLE = {
  status: 422,
  title: 'This draft can’t be shown yet',
  text: 'The site would refuse it as it is, and a build that reads it would fail. Fix what is listed below in the Studio and save: this page reloads.',
  reason: 'draft_not_buildable',
} as const

/** The site's names for a post's and a page's fields, as the Studio labels them (cms/content-types.json). */
const LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  pubDate: 'Published on',
  updatedDate: 'Last updated',
  tags: 'Tags',
  status: 'Status note',
  kind: 'Kind',
  targetQuery: 'Search it answers',
  factsChecked: 'Facts checked on',
  related: 'Read next',
  faq: 'Questions and answers',
  body: 'Body',
  slug: 'URL name',
  seo_title: 'Page title',
  seo_description: 'Page description',
  hero_headline: 'Headline',
  hero_description: 'Sentence under the headline',
  benefits: 'Benefit cards',
  statement_heading: 'Closing statement: heading',
  statement: 'Closing statement: parts',
  statement_link_text: 'Closing statement: link text',
  statement_link_href: 'Closing statement: link address',
  name: 'Name',
  version: 'Version it speaks of',
  status_checked: 'Checked on',
  status_line: 'Status line',
  blog_title: 'Blog index: page title',
  blog_description: 'Blog index: page description',
}

/** `faq.2.a` as "Questions and answers, item 3, a". */
function fieldName(path: PropertyKey[]): string {
  const [first, ...rest] = path
  const parts = [LABELS[String(first)] ?? String(first)]
  for (const key of rest) parts.push(typeof key === 'number' ? `item ${key + 1}` : String(key))
  return parts.join(', ')
}

/** A schema issue in a sentence's worth of words: what is wrong with the field, and the limit it missed. */
function say(issue: z.core.$ZodIssue): string {
  if (issue.code === 'invalid_type' && issue.expected === 'date') return 'is missing or is not a date'
  if (issue.code === 'invalid_type' && /received undefined/.test(issue.message)) return 'is missing'
  if (issue.code === 'too_big' && issue.origin === 'string') return `is too long: at most ${issue.maximum} characters`
  if (issue.code === 'too_small' && issue.origin === 'string') return Number(issue.minimum) <= 1 ? 'is empty' : `is too short: at least ${issue.minimum} characters`
  if (issue.code === 'too_big' && issue.origin === 'array') return `has too many items: at most ${issue.maximum}`
  if (issue.code === 'too_small' && issue.origin === 'array') return `needs at least ${issue.minimum} item${Number(issue.minimum) === 1 ? '' : 's'}`
  if (issue.code === 'invalid_value') return `must be one of ${issue.values.map(String).join(', ')}`
  return issue.message.charAt(0).toLowerCase() + issue.message.slice(1)
}

function check<S extends z.ZodType>(schema: S, fields: unknown, entry: PreviewEntry, extra: Problem[] = []): Draft<z.infer<S>> {
  const parsed = schema.safeParse(fields)
  const problems = [...extra, ...(parsed.success ? [] : parsed.error.issues.map((issue) => ({ field: fieldName(issue.path), message: say(issue) })))]
  const hidden = entry.preview.hidden_fields ?? []
  if (hidden.length > 0 && problems.length > 0) {
    problems.push({ field: 'Hidden fields', message: `your role cannot read ${hidden.join(', ')}, so the preview has no value for them` })
  }
  return problems.length === 0 && parsed.success ? { ok: true, value: parsed.data } : { ok: false, problems }
}

/** The entry's URL name: its `slug`, as the build uses it for the page's address. */
function urlName(entry: PreviewEntry): { id: string; problems: Problem[] } {
  const slug = entry.slug ?? (typeof entry.content.slug === 'string' ? entry.content.slug : '')
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { id: slug, problems: [] }
  return { id: entry.id, problems: [{ field: LABELS.slug, message: slug === '' ? 'is empty' : 'may hold only lower-case letters, digits and single hyphens' }] }
}

/** The entry's Markdown and its HTML (markdown.ts), as the build's loader takes `body` and renders it. */
function bodyOf(entry: PreviewEntry): { body: string; html: string; problems: Problem[] } {
  const body = entry.content.body
  if (typeof body !== 'string' || body.trim() === '') return { body: '', html: '', problems: [{ field: LABELS.body, message: 'is empty' }] }
  const rendered = renderBody(body)
  return rendered.ok ? { body, html: rendered.html, problems: [] } : { body, html: '', problems: [{ field: LABELS.body, message: rendered.message }] }
}

/** A `posts` row as a post page's words: its URL name, its fields, its Markdown and the HTML of it. */
export function postDraft(entry: PreviewEntry): Draft<{ id: string; data: PostData; body: string; html: string }> {
  const name = urlName(entry)
  const text = bodyOf(entry)
  const checked = check(postSchema, postFields(entry.content), entry, [...name.problems, ...text.problems])
  return checked.ok ? { ok: true, value: { id: name.id, data: checked.value, body: text.body, html: text.html } } : checked
}

/** A `pages` row as a page's words. */
export function pageDraft(entry: PreviewEntry): Draft<{ id: string; data: PageData; body: string; html: string }> {
  const name = urlName(entry)
  const text = bodyOf(entry)
  const checked = check(pageSchema, pageFields(entry.content), entry, [...name.problems, ...text.problems])
  return checked.ok ? { ok: true, value: { id: name.id, data: checked.value, body: text.body, html: text.html } } : checked
}

/** The `home` row as the home page's words. */
export const homeDraft = (entry: PreviewEntry): Draft<HomeCopy> => check(homeSchema, entry.content, entry)

/** The `site` row as the site settings. */
export const siteDraft = (entry: PreviewEntry): Draft<SiteCopy> => check(siteSchema, entry.content, entry)
