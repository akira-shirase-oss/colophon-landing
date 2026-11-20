import { getCollection, type CollectionEntry } from 'astro:content'

export type SeoPage = CollectionEntry<'pages'>

/** Where a page of each kind is served. */
export const SECTION = { compare: 'compare', 'use-case': 'use-cases', feature: 'features', guide: 'guides' } as const satisfies Record<Exclude<SeoPage['data']['kind'], 'hub'>, string>

/** The address of a page: /compare/colophon-vs-contentful/, or a hub's own section: /compare/. */
export const pathOf = (page: SeoPage) => (page.data.kind === 'hub' ? `/${page.id}/` : `/${SECTION[page.data.kind]}/${page.id}/`)

/** Published pages of one kind (or all), newest first. Drafts are included only in `astro dev`. */
export async function seoPages(kind?: SeoPage['data']['kind']): Promise<SeoPage[]> {
  const all = await getCollection('pages', (p) => (import.meta.env.DEV || !p.data.draft) && (!kind || p.data.kind === kind))
  return all.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
}
