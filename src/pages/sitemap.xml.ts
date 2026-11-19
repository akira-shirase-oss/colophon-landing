import type { APIRoute } from 'astro'
import { posts } from '../lib/posts'
import { pathOf, seoPages } from '../lib/pages'

// Every public page: the home page, the blog index, each published post and each published page from
// src/content/pages (drafts never appear).
export const GET: APIRoute = async ({ site }) => {
  const base = site!.href
  const list = await posts()
  const pages = await seoPages()
  const changed = (p: (typeof list)[number]) => p.data.updatedDate ?? p.data.pubDate
  // The blog index changes whenever a post is published or updated.
  const newest = list.map(changed).reduce<Date | undefined>((a, d) => (a && a >= d ? a : d), undefined)
  const urls = [
    { loc: new URL('/', base).href },
    { loc: new URL('/blog/', base).href, lastmod: newest },
    ...list.map((p) => ({ loc: new URL(`/blog/${p.id}/`, base).href, lastmod: changed(p) })),
    ...pages.map((p) => ({ loc: new URL(pathOf(p), base).href, lastmod: p.data.updatedDate ?? p.data.pubDate })),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
