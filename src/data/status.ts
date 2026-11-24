// Colophon's state, said once. Every post shows this line under its title (`<Status />`), so no post
// repeats it in prose. Change it here when the facts change, and check them against Colophon's `main`.
export const status = {
  version: '0.1.0-alpha.7',
  checked: '2026-11-24',
  /** The one shared line. Plain words: what Colophon is today, honestly. */
  line: 'Colophon is live, in alpha (0.1.0-alpha.7): anyone can sign up for the hosted service. I build it in public, on my own.',
  /** Where a reader goes for what's done and what broke. */
  done: { href: 'https://github.com/akira-shirase-oss/colophon-cms/blob/main/docs/ROADMAP.md', text: 'what’s built' },
  log: { href: 'https://404human.dev/colophon/', text: 'the build log' },
} as const
