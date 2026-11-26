// robots.txt, as plain JavaScript so src/pages/robots.txt.ts and scripts/robots.test.mjs share one source.
//
// AI crawlers are named on their own, each allowed every page. `User-agent: *` already allows them, but a
// crawler that finds a group naming it follows that group alone (RFC 9309, section 2.2.1), so each named
// group carries its own `Allow: /` and its own copy of the two paths no crawler may fetch.
export const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
]

/**
 * The draft-preview routes (README, "Draft preview"): the handler that spends a one-time code, and the pages
 * that answer only to a preview cookie. No crawler has business there, and a crawler that followed a preview
 * link would spend its code. Each group repeats them, because a named group replaces `*` for its crawler.
 */
export const PREVIEW_PATHS = ['/api/preview', '/preview/']

const rules = ['Allow: /', ...PREVIEW_PATHS.map((path) => `Disallow: ${path}`)]

/** The whole file, ending with the sitemap's absolute URL. */
export const robots = (sitemap) =>
  [
    'User-agent: *',
    ...rules,
    '',
    ...AI_CRAWLERS.flatMap((bot) => [`User-agent: ${bot}`, ...rules, '']),
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n')
