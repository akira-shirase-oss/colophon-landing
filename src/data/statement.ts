// The home page's closing statement, read as one sentence: each part is the words before an illustration, the
// word the illustration sits after (kept on one line with it), the illustration, and any punctuation after it.
// The illustrations are decorative; the sentence reads fully without them.
export const statement = {
  heading: 'Follow the build',
  parts: [
    { lead: 'write a ', word: 'post', icon: 'pen', after: ',' },
    { lead: ' send it for ', word: 'review', icon: 'people', after: ',' },
    { lead: ' publish ', word: 'it', icon: 'stamp', after: '' },
    { lead: ' and Colophon prints a ', word: 'receipt', icon: 'receipt', after: '' },
    { lead: ' of what went live, when, and where readers saw ', word: 'it', icon: 'globe', after: '.' },
  ],
  link: { text: 'Read the build log', href: 'https://404human.dev/colophon/' },
} as const
