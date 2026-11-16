import { getCollection, type CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'blog'>

/** Published posts, newest first. Drafts are included only in `astro dev`. */
export async function posts(): Promise<Post[]> {
  const all = await getCollection('blog', (p) => import.meta.env.DEV || !p.data.draft)
  return all.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
