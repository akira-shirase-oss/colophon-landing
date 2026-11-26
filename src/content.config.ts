import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import type { Loader } from 'astro/loaders'
import { z } from 'astro/zod'
import { entries, fromColophon, release, type Entry } from './lib/colophon'
import { BENEFIT_ICONS, BENEFIT_TONES, STATEMENT_ICONS, home as homeDefaults, site as siteDefaults } from './data/home'

// Where the content comes from. With COLOPHON_PROJECT set, posts and pages are entries of that Colophon project,
// read from its public delivery API at one release; an entry's fields are the frontmatter below and its
// `body` field is the Markdown. Without it, the Markdown files in src/content are read, as before. Either
// way the same schema checks every entry, so a title that is too long fails the build instead of going live.

/** Colophon stores no empty values: a field left blank is absent (or null), which the schema reads as unset. */
const set = (content: Record<string, unknown>, field: string) => {
  const value = content[field]
  return value === null || value === '' ? undefined : value
}

/** A collection of the Colophon project as an Astro collection: `fields` maps an entry to its frontmatter. */
function colophon(collection: string, fields: (content: Record<string, unknown>) => Record<string, unknown>): Loader {
  return {
    name: `colophon-${collection}`,
    async load({ store, parseData, renderMarkdown, generateDigest }) {
      const items: Entry[] = await entries(collection)
      store.clear()
      for (const item of items) {
        const id = item.slug ?? item.id
        const body = String(item.content.body ?? '')
        const data = await parseData({ id, data: fields(item.content) })
        store.set({ id, data, body, rendered: await renderMarkdown(body), digest: generateDigest(item.content_hash) })
      }
    },
  }
}

const postFields = (c: Record<string, unknown>) => ({
  title: c.title,
  description: c.description,
  pubDate: c.pub_date,
  updatedDate: set(c, 'updated_date'),
  tags: set(c, 'tags') ?? [],
  glossary: c.glossary === true,
  status: set(c, 'status'),
})

const pageFields = (c: Record<string, unknown>) => ({
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

// Blog posts: Markdown in src/content/blog. A post with `draft: true` shows in `astro dev` only.
const blog = defineCollection({
  loader: fromColophon ? colophon('posts', postFields) : glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
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
  }),
})

// Pages written for one search intent (comparisons, features, use cases, framework guides, hubs): Markdown in
// src/content/pages, all rendered by src/layouts/SeoPage.astro with the blog's own components and styles.
// Static HTML; the page itself adds no script. The FAQ lives in frontmatter, so the visible questions and
// the FAQPage data can't drift apart.
const pages = defineCollection({
  loader: fromColophon ? colophon('pages', pageFields) : glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
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
  }),
})

/**
 * A single type of the Colophon project (one entry, `current`), or `local` when the build reads no project.
 * A build that reads Colophon fails when the entry isn't published: a page without its words must not deploy.
 */
function single(collection: string, local: Record<string, unknown>): Loader {
  return {
    name: `colophon-${collection}`,
    async load({ store, parseData, generateDigest }) {
      let content = local
      let digest = generateDigest(local)
      if (fromColophon) {
        const [entry] = await entries(collection)
        if (!entry) throw new Error(`Colophon: the "${collection}" entry isn't published`)
        content = entry.content
        digest = generateDigest(entry.content_hash)
      }
      store.clear()
      store.set({ id: 'current', data: await parseData({ id: 'current', data: content }), digest })
    },
  }
}

const line = z.string().min(1)

// The home page's words (src/data/home.ts says what each is). Limits here match the fields of the Colophon
// `home` type, so the Studio refuses what the page can't hold before the build would.
const home = defineCollection({
  loader: single('home', homeDefaults),
  schema: z.object({
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
  }),
})

// The status line under every post's title.
const site = defineCollection({
  loader: single('site', siteDefaults),
  schema: z.object({ name: line, version: line.max(40), status_checked: z.coerce.date(), status_line: line.max(300) }),
})

// The release this build was made from: one entry, `current`. Base.astro prints it in every page's head as
// <meta name="colophon-generation">, which is what a Colophon site check looks for on the live site. 0 when the
// build reads the Markdown files or nothing is published yet; then no marker is printed.
const build = defineCollection({
  loader: {
    name: 'colophon-release',
    async load({ store, parseData }) {
      const generation = fromColophon ? await release() : 0
      store.clear()
      store.set({ id: 'current', data: await parseData({ id: 'current', data: { generation } }) })
    },
  },
  schema: z.object({ generation: z.number().int().min(0) }),
})

export const collections = { blog, pages, home, site, build }
