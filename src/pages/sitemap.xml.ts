import type { APIRoute } from 'astro'
import { posts } from '../lib/posts'

// Every public page: the home page, the blog index and each published post (drafts never appear).
export const GET: APIRoute = async ({ site }) => {
  const base = site!.href
  const list = await posts()
  const urls = [
    { loc: new URL('/', base).href },
    { loc: new URL('/blog/', base).href, lastmod: list[0]?.data.pubDate },
    ...list.map((p) => ({ loc: new URL(`/blog/${p.id}/`, base).href, lastmod: p.data.updatedDate ?? p.data.pubDate })),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
