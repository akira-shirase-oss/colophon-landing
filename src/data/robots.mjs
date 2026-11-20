// robots.txt, as plain JavaScript so src/pages/robots.txt.ts and scripts/robots.test.mjs share one source.
//
// AI crawlers are named on their own, each allowed everything. `User-agent: *` already allows them, but a
// crawler that finds a group naming it follows that group alone (RFC 9309, section 2.2.1), so each named
// group carries its own `Allow: /`.
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

/** The whole file, ending with the sitemap's absolute URL. */
export const robots = (sitemap) =>
  [
    'User-agent: *',
    'Allow: /',
    '',
    ...AI_CRAWLERS.flatMap((bot) => [`User-agent: ${bot}`, 'Allow: /', '']),
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n')
