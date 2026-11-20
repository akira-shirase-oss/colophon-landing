import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

// Blog posts: Markdown in src/content/blog. A post with `draft: true` shows in `astro dev` only.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
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
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    /** Decides the address: compare → /compare/<id>/; use-case → /use-cases/<id>/; feature → /features/<id>/; hub → /<id>/ (the index of a section, such as /compare/). */
    kind: z.enum(['compare', 'use-case', 'feature', 'hub']),
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

export const collections = { blog, pages }
