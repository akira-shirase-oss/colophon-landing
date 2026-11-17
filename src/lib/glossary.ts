/** One term of a glossary post: its anchor, its name and its definition's first paragraph as plain text. */
export type Term = { id: string; name: string; description: string }

/**
 * The terms of a glossary post, read from its Markdown source: every `<h3 id="…">Name</h3>` and the
 * paragraph after it. The post page turns them into `DefinedTermSet` structured data, so the terms
 * live in one place (the post) and the data can't drift from what readers see.
 */
export function glossaryTerms(markdown: string): Term[] {
  return [...markdown.matchAll(/^<h3 id="([a-z0-9-]+)">([^<]+)<\/h3>\r?\n\r?\n(.+)$/gm)].map(([, id, name, text]) => ({
    id,
    name: name.trim(),
    description: plainText(text),
  }))
}

/** A Markdown paragraph as plain text: links keep their words, emphasis and code marks go. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
