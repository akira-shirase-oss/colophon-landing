// The home page's words and the site-wide status line, as two documents with the same field names as the
// Colophon entries that hold them (`home` and `site`, both single types; cms/content-types.json). A build
// that reads Colophon takes the published entries; a build without a project takes these. Icons and tones
// are named here and drawn by the components, so the words can change without touching markup.

export const BENEFIT_ICONS = ['file-check', 'dice', 'history', 'receipt', 'shield-check', 'bot'] as const
export const BENEFIT_TONES = ['brand', 'live', 'changed'] as const
export const STATEMENT_ICONS = ['pen', 'people', 'stamp', 'receipt', 'globe'] as const

export const home = {
  // What people search for comes first in the title, the brand last, as on every other page.
  seo_title: 'Open-source headless CMS with publish receipts | Colophon',
  seo_description:
    'Open-source headless CMS in Rust and Svelte: every publish is a numbered release with a receipt, rollbacks are reviewed, and roles reach each field.',
  hero_headline: 'Know exactly what went live.',
  hero_description:
    "Colophon is an open-source CMS. Write, review and ship your site's articles, then see what went live, when, and where readers saw it.",
  // Every claim here is built and tested in Colophon today (README "The four promises", roles and automation).
  benefits: [
    { title: 'Lose nothing', line_one: 'Pull the plug mid-save and your work is still there.', line_two: 'A publish lands once and completely, or not at all.', tag: 'Crash-safe', tone: 'brand', icon: 'file-check' },
    { title: 'Replayable bugs', line_one: 'Every failing test run hands back a seed number.', line_two: 'Replay that seed and get the exact same failure.', tag: 'Deterministic tests', tone: 'live', icon: 'dice' },
    { title: 'Time travel', line_one: 'Read any past release, minus what was taken down since.', line_two: 'Going back is simply a new release.', tag: 'Release history', tone: 'live', icon: 'history' },
    { title: 'Honest status', line_one: 'A release is verified only once a site check sees it.', line_two: 'Until then it shows published or pending, never verified.', tag: 'Delivery receipts', tone: 'changed', icon: 'receipt' },
    { title: 'Roles down to a field', line_one: 'Decide who can read, edit or publish, down to a field.', line_two: 'Access changes land in an append-only audit log.', tag: 'Permissions', tone: 'brand', icon: 'shield-check' },
    { title: 'Agents ask, people approve', line_one: 'AI apps act with your role and ask before they publish.', line_two: 'Scripts use scoped tokens that can never approve.', tag: 'Safe automation', tone: 'changed', icon: 'bot' },
  ],
  faq: [
    { q: 'What is Colophon?', a: "A content management system for writing, reviewing and publishing a website's articles, built so you always know which version readers are seeing." },
    { q: 'Why is it called Colophon?', a: 'Printed books end with a colophon: a short note on how, when and by whom the book was made. Colophon gives a website that same kind of record.' },
    { q: 'Can AI agents and scripts use it?', a: 'Yes. An AI app connects by signing in, acts with your role and asks you before anything that publishes. Scripts use scoped tokens with spending caps and request quotas, and nothing they submit can be approved by another token.' },
    { q: 'What happens if it crashes mid-publish?', a: 'Your saved work survives, and the half-finished publish never reaches readers. Crash recovery is tested on every change.' },
    { q: 'Can I use it for my site today?', a: 'Yes, in alpha. Anyone can sign up for the hosted service and publish, or run it on their own server. It is built in public by one person, and the stability promises of v0.1 come next.' },
  ],
  // The closing statement, read as one sentence: each part is the words before an illustration, the word the
  // illustration sits after (kept on one line with it), the illustration, and any punctuation after it.
  statement_heading: 'Follow the build',
  statement: [
    { lead: 'write a', word: 'post', icon: 'pen', after: ',' },
    { lead: 'send it for', word: 'review', icon: 'people', after: ',' },
    { lead: 'publish', word: 'it', icon: 'stamp' },
    { lead: 'and Colophon prints a', word: 'receipt', icon: 'receipt' },
    { lead: 'of what went live, when, and where readers saw', word: 'it', icon: 'globe', after: '.' },
  ],
  statement_link_text: 'Read the build log',
  statement_link_href: 'https://404human.dev/colophon/',
}

// Colophon's state, said once. Every post shows this line under its title (`<Status />`), so no post repeats
// it in prose. Change it when the facts change, and check them against Colophon's `main`.
export const site = {
  name: 'Colophon website',
  version: '0.1.0-alpha.7',
  status_checked: '2026-11-24',
  /** The one shared line. Plain words: what Colophon is today, honestly. */
  status_line: 'Colophon is live, in alpha (0.1.0-alpha.7): anyone can sign up for the hosted service. I build it in public, on my own.',
}
