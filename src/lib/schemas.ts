// What a post, a page, the home page and the site settings must hold, and how a Colophon entry's fields become
// them. One copy, used twice: the build checks every published entry with these (src/content.config.ts), and
// a draft preview checks the draft with the same ones (src/lib/preview), so a preview can only show what a
// build would accept.
import { z } from 'astro/zod'
import { BENEFIT_ICONS, BENEFIT_TONES, STATEMENT_ICONS } from '../data/home.ts'

/** Colophon stores no empty values: a field left blank is absent (or null), which the schema reads as unset. */
const set = (content: Record<string, unknown>, field: string) => {
  const value = content[field]
  return value === null || value === '' ? undefined : value
}

export const postFields = (c: Record<string, unknown>) => ({
  title: c.title,
  description: c.description,
  pubDate: c.pub_date,
  updatedDate: set(c, 'updated_date'),
  tags: set(c, 'tags') ?? [],
  glossary: c.glossary === true,
  status: set(c, 'status'),
})

export const pageFields = (c: Record<string, unknown>) => ({
  kind: c.kind,
  title: c.title,
  description: c.description,
  targetQuery: c.target_query,
  pubDate: c.pub_date,
  updatedDate: set(c, 'updated_date'),
  factsChecked: set(c, 'facts_checked'),
  related: set(c, 'related') ?? [],
  faq: set(c, 'faq') ?? [],
  status: set(c, 'status'),
})

export const postSchema = z.object({
  // At most 49 characters: the layout adds " | Colophon", and the whole title stays within 60.
  title: z.string().max(49),
  // 120 to 155 characters: long enough to say what the post teaches, short enough not to be cut in results.
  description: z.string().min(120).max(155),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  // A glossary post: its <h3 id> terms also become DefinedTermSet structured data.
  glossary: z.boolean().default(false),
  // One sentence on what is still missing for this post's topic, shown after the shared status line.
  status: z.string().optional(),
})

export const pageSchema = z.object({
  /** Decides the address: compare → /compare/<id>/; use-case → /use-cases/<id>/; feature → /features/<id>/; guide → /guides/<id>/; hub → /<id>/ (the index of a section, such as /compare/). */
  kind: z.enum(['compare', 'use-case', 'feature', 'guide', 'hub']),
  title: z.string().max(49),
  description: z.string().min(120).max(155),
  /** The search the page answers. Recorded, not rendered: the plan and Search Console are read against it. */
  targetQuery: z.string().min(3),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  /** Comparisons: the day every competitor fact on the page was checked against the vendor's own pages. */
  factsChecked: z.coerce.date().optional(),
  /** At least three pages to read next, on this site or the docs; rendered at the end. */
  related: z.array(z.object({ href: z.string(), text: z.string() })).min(3),
  faq: z.array(z.object({ q: z.string().min(5), a: z.string().min(20) })).default([]),
  draft: z.boolean().default(false),
  status: z.string().optional(),
})

const line = z.string().min(1)

// The home page's words (src/data/home.ts says what each is). Limits here match the fields of the Colophon
// `home` type, so the Studio refuses what the page can't hold before the build would.
export const homeSchema = z.object({
  seo_title: line.max(60),
  seo_description: z.string().min(120).max(155),
  hero_headline: line.max(60),
  hero_description: line.max(300),
  benefits: z
    .array(z.object({ title: line.max(40), line_one: line.max(120), line_two: line.max(120), tag: line.max(30), tone: z.enum(BENEFIT_TONES), icon: z.enum(BENEFIT_ICONS) }))
    .min(1)
    .max(9),
  faq: z.array(z.object({ q: z.string().min(5).max(200), a: z.string().min(20).max(600) })).min(1).max(12),
  statement_heading: line.max(60),
  statement: z.array(z.object({ lead: line.max(120), word: line.max(30), icon: z.enum(STATEMENT_ICONS), after: z.string().max(3).nullish() })).min(1).max(8),
  statement_link_text: line.max(60),
  statement_link_href: z.string().url(),
})

// The status line under every post's title.
export const siteSchema = z.object({
  name: line,
  version: line.max(40),
  status_checked: z.coerce.date(),
  status_line: line.max(300),
  // The blog index's title and description. Unset (an entry published before the fields existed) falls back to
  // the words in src/data/home.ts.
  blog_title: line.max(60).nullish(),
  blog_description: z.string().min(120).max(155).nullish(),
})

export type PostData = z.infer<typeof postSchema>
export type PageData = z.infer<typeof pageSchema>
export type HomeCopy = z.infer<typeof homeSchema>
export type SiteCopy = z.infer<typeof siteSchema>
