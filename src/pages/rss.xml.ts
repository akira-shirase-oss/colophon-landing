import type { APIRoute } from 'astro'
import { posts } from '../lib/posts'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// RSS 2.0 for the blog, hand-written so the site needs no extra dependency.
export const GET: APIRoute = async ({ site }) => {
  const base = site!.href
  const items = (await posts())
    .map((p) => {
      const link = new URL(`/blog/${p.id}/`, base).href
      return `    <item>
      <title>${esc(p.data.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${esc(p.data.description)}</description>
      <pubDate>${p.data.pubDate.toUTCString()}</pubDate>
    </item>`
    })
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Colophon blog</title>
    <link>${new URL('/blog/', base).href}</link>
    <atom:link href="${new URL('/rss.xml', base).href}" rel="self" type="application/rss+xml" />
    <description>How Colophon proves what it published.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
