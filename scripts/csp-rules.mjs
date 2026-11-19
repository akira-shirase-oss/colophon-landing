// Content-security-policy rules the build check applies (scripts/check-dist.mjs), kept apart so they can be
// tested on their own. The docs site (colophon-docs, scripts/lib/csp-inline.mjs) applies the same rules.

/** Script types a browser runs, and so the CSP governs: each inline one needs a hash. */
export const JS_TYPES = new Set(['', 'module', 'importmap', 'speculationrules', 'text/javascript', 'application/javascript'])
/** The one data type that needs no hash: JSON-LD, which the browser parses for search engines and never runs.
 *  An exact match (case-insensitive, trimmed, no parameters); any other type fails, so `application/json`,
 *  `application/ld+json;x` or a typo can't pass as data. The docs site applies the same rule. */
export const DATA_TYPE = 'application/ld+json'
/** 'runs' | 'data' | 'unknown' for one script element. */
export const scriptKind = (type) => {
  const t = (type ?? '').trim().toLowerCase()
  return JS_TYPES.has(t) ? 'runs' : t === DATA_TYPE ? 'data' : 'unknown'
}

/** The one third party (maintainer, 19 November 2026): Cloudflare Web Analytics, cookieless page views and
 *  real-user Core Web Vitals. Its beacon loads from the first origin; it reports to the page's own origin
 *  (/cdn-cgi/rum on this proxied site) or to the second. The policy may name these and no other origin. */
export const ANALYTICS = { script: 'https://static.cloudflareinsights.com', report: 'https://cloudflareinsights.com' }
