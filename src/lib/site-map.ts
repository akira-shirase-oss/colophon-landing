import { posts } from './posts'
import { pathOf, seoPages } from './pages'

/** One public page: what the sitemap and llms.txt both list, from this one list so the two can't drift. */
export type ListedPage = {
  path: string
  title: string
  description: string
  /** Where llms.txt groups it. */
  section: 'Start here' | 'Features' | 'Comparisons' | 'Use cases' | 'Guides' | 'Blog' | 'Project'
  lastmod?: Date
}

const SECTION_OF = { compare: 'Comparisons', 'use-case': 'Use cases', feature: 'Features', guide: 'Guides' } as const

// Pages built by src/pages rather than from a collection. Those pages take their title and description from
// here, so the sitemap, llms.txt and the page itself say the same thing.
export const HOME = {
  path: '/',
  title: 'Open-source headless CMS with publish receipts | Colophon',
  description:
    'Open-source headless CMS in Rust and Svelte: every publish is a numbered release with a receipt, rollbacks are reviewed, and roles reach each field.',
} as const
export const BLOG = {
  path: '/blog/',
  title: 'Colophon blog: publishing, releases and proof',
  description:
    'How Colophon proves what it published: releases, receipts, reviewed rollbacks and safe automation, explained from the code that does it.',
} as const
export const COMMUNITY = {
  path: '/community/',
  title: 'Community, support and security | Colophon',
  description:
    'Where to ask about Colophon, report a bug or a security problem, and follow what changes: GitHub issues, private advisories, the docs and the changelog.',
} as const

/**
 * Every public page: the home page, the blog index, each published post, each published page from
 * src/content/pages and the community page. Drafts never appear (posts() and seoPages() leave them out).
 */
export async function listedPages(): Promise<ListedPage[]> {
  const list = await posts()
  const pages = await seoPages()
  const changed = (d: { pubDate: Date; updatedDate?: Date }) => d.updatedDate ?? d.pubDate
  // The blog index changes whenever a post is published or updated.
  const newest = list.map((p) => changed(p.data)).reduce<Date | undefined>((a, d) => (a && a >= d ? a : d), undefined)
  return [
    { ...HOME, section: 'Start here' },
    { ...BLOG, section: 'Blog', lastmod: newest },
    ...pages.map((p) => ({
      path: pathOf(p),
      title: p.data.title,
      description: p.data.description,
      section: p.data.kind === 'hub' ? SECTION_OF[hubKind(p.id)] : SECTION_OF[p.data.kind],
      lastmod: changed(p.data),
    })),
    ...list.map((p) => ({
      path: `/blog/${p.id}/`,
      title: p.data.title,
      description: p.data.description,
      section: 'Blog' as const,
      lastmod: changed(p.data),
    })),
    { ...COMMUNITY, section: 'Project' },
  ]
}

/** The section a hub indexes, from its id (compare, use-cases, features, guides). */
function hubKind(id: string): keyof typeof SECTION_OF {
  const kind = { compare: 'compare', 'use-cases': 'use-case', features: 'feature', guides: 'guide' }[id]
  if (!kind) throw new Error(`hub "${id}" indexes no known section`)
  return kind as keyof typeof SECTION_OF
}
