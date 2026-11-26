import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import type { Loader } from 'astro/loaders'
import { z } from 'astro/zod'
import { entries, fromColophon, release, type Entry } from './lib/colophon'
import { home as homeDefaults, site as siteDefaults } from './data/home'
import { homeSchema, pageFields, pageSchema, postFields, postSchema, siteSchema } from './lib/schemas'

// Where the content comes from. With COLOPHON_PROJECT set, posts and pages are entries of that Colophon project,
// read from its public delivery API at one release; an entry's fields are the frontmatter below and its
// `body` field is the Markdown. Without it, the Markdown files in src/content are read, as before. Either
// way the same schema checks every entry (src/lib/schemas.ts, which a draft preview uses too), so a title that
// is too long fails the build instead of going live.

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

// Blog posts: Markdown in src/content/blog. A post with `draft: true` shows in `astro dev` only.
const blog = defineCollection({
  loader: fromColophon ? colophon('posts', postFields) : glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: postSchema,
})

// Pages written for one search intent (comparisons, features, use cases, framework guides, hubs): Markdown in
// src/content/pages, all rendered by src/layouts/SeoPage.astro with the blog's own components and styles.
// Static HTML; the page itself adds no script. The FAQ lives in frontmatter, so the visible questions and
// the FAQPage data can't drift apart.
const pages = defineCollection({
  loader: fromColophon ? colophon('pages', pageFields) : glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: pageSchema,
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

// The home page's words (src/data/home.ts says what each is) and the status line under every post's title.
const home = defineCollection({ loader: single('home', homeDefaults), schema: homeSchema })
const site = defineCollection({ loader: single('site', siteDefaults), schema: siteSchema })

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
