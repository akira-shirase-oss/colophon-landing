// Colophon's state, said once. Every post shows this line under its title (`<Status />`), so no post
// repeats it in prose. Change it here when the facts change, and check them against Colophon's `main`.
export const status = {
  version: '0.1.0-alpha.1',
  checked: '2026-11-17',
  /** The one shared line. Plain words: what Colophon is today, honestly. */
  line: 'Colophon is pre-release (0.1.0-alpha.1) and has no users yet. I build it in public, on my own.',
  /** Where a reader goes for what's done and what broke. */
  done: { href: '/#pricing', text: 'what’s built' },
  log: { href: 'https://404human.dev/colophon/', text: 'the build log' },
} as const
