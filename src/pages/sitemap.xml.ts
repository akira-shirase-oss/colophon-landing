import type { APIRoute } from 'astro'
import { listedPages } from '../lib/site-map'

// Every public page, from the same list as llms.txt (src/lib/site-map.ts); drafts never appear.
export const GET: APIRoute = async ({ site }) => {
  const urls = (await listedPages()).map((p) => ({ loc: new URL(p.path, site).href, lastmod: p.lastmod }))
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
