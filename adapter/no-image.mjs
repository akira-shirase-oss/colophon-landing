// The site draws no image through astro:assets, so the image endpoint Astro adds to a server build has nothing
// to serve. This stands in for it (adapter/pages.mjs), so Astro's own, and the code it pulls in, stay out of
// the worker. dist/_routes.json doesn't send /_image to the worker either.
export const prerender = false

export const GET = () => new Response(null, { status: 404 })
