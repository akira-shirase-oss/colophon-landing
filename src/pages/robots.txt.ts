import type { APIRoute } from 'astro'
import { robots } from '../data/robots.mjs'

// Every crawler, AI crawlers named one by one, may read every page and none may fetch the draft-preview routes
// (src/data/robots.mjs).
export const GET: APIRoute = ({ site }) =>
  new Response(robots(new URL('/sitemap.xml', site).href), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
