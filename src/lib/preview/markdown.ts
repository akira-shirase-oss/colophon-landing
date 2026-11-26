// A draft's Markdown as HTML, at request time.
//
// The build renders Markdown with Astro's own pipeline (Sätteri, a native parser, and Shiki), which can't run
// in a Cloudflare Function: the parser is a native binary, and Shiki's grammars cost about a second of CPU the
// first time TypeScript is coloured, against a 10 ms allowance on the free plan. So a preview draws the same
// document a lighter way, with `marked`, and says where it differs (README, "Draft preview"):
//
//   - code blocks are plain: the same block, surface and font, but no syntax colours;
//   - everything else aims at the same HTML: GitHub-flavoured Markdown (tables, strikethrough, autolinks, task
//     lists), raw HTML passed through as written, typographic quotes, dashes and ellipses, and the same `id` on
//     every heading (github-slugger, as Astro uses), so links to a section work in a preview too.
//
// scripts/preview-markdown.test.mjs renders every post and page in src/content both ways and compares them.
import GithubSlugger from 'github-slugger'
import { Marked, type Token, type Tokens } from 'marked'

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const SPACE = /\s/
const PUNCTUATION = /[\p{P}\p{S}]/u
const QUOTES = { "'": ['\u2018', '\u2019'], '"': ['\u201c', '\u201d'] } as const

/**
 * Typographic punctuation for one run of inline text (a paragraph, a heading, a table cell), as CommonMark's
 * "smart" rules write it: `...` is an ellipsis, `--` an en dash and `---` an em dash; a quote that opens and is
 * closed later in the run becomes a pair, and a single quote with no partner is an apostrophe (it's, '90s).
 * Whether a quote can open or close is read from the characters on either side of it, across the whole run,
 * so a quote next to emphasis or a link still turns the right way. `text` is the run's pieces in order; a
 * `null` piece stands for something that isn't text (code, raw HTML, an image) and counts as a word.
 */
export function smarten(pieces: (string | null)[]): (string | null)[] {
  const texts = pieces.map((piece) => (piece === null ? null : piece.replace(/\.\.\./g, '\u2026').replace(/---/g, '\u2014').replace(/--/g, '\u2013')))
  // The run as one string of characters, each remembering the piece it came from.
  const chars: { char: string; piece: number }[] = []
  texts.forEach((text, piece) => {
    if (text === null) chars.push({ char: 'x', piece: -1 })
    else for (const char of text) chars.push({ char, piece })
  })
  const openers: { at: number; char: "'" | '"' }[] = []
  chars.forEach(({ char, piece }, at) => {
    if (piece < 0 || (char !== "'" && char !== '"')) return
    const before = at > 0 ? chars[at - 1].char : '\n'
    const after = at + 1 < chars.length ? chars[at + 1].char : '\n'
    const [spaceBefore, spaceAfter, markBefore, markAfter] = [SPACE.test(before), SPACE.test(after), PUNCTUATION.test(before), PUNCTUATION.test(after)]
    const leftFlanking = !spaceAfter && (!markAfter || spaceBefore || markBefore)
    const rightFlanking = !spaceBefore && (!markBefore || spaceAfter || markAfter)
    // Alone, a single quote is an apostrophe and a double quote opens.
    chars[at].char = char === "'" ? QUOTES[char][1] : QUOTES[char][0]
    if (rightFlanking) {
      const open = openers.findLastIndex((opener) => opener.char === char)
      if (open >= 0) {
        chars[openers[open].at].char = QUOTES[char][0]
        openers.length = open
      }
      chars[at].char = QUOTES[char][1]
    }
    if (leftFlanking && !rightFlanking) openers.push({ at, char })
  })
  const out = texts.map((text) => (text === null ? null : ''))
  for (const { char, piece } of chars) if (piece >= 0) out[piece] += char
  return out
}

/** The text a token shows, for a heading's `id`. */
function plain(token: Token): string {
  if (token.type === 'codespan' || token.type === 'escape') return (token as Tokens.Codespan).text
  if (token.type === 'html' || token.type === 'br' || token.type === 'image') return ''
  const nested = (token as { tokens?: Token[] }).tokens
  if (nested) return nested.map(plain).join('')
  return 'text' in token && typeof token.text === 'string' ? token.text : ''
}

/** The text tokens of one inline run, in reading order, with `null` where something that isn't text sits. */
function leaves(tokens: Token[], out: (Tokens.Text | null)[] = []): (Tokens.Text | null)[] {
  for (const token of tokens) {
    const nested = (token as { tokens?: Token[] }).tokens
    if (token.type === 'text' && !nested) out.push(token as Tokens.Text)
    else if (token.type === 'br') out.push({ type: 'text', raw: '\n', text: '\n', escaped: true } as Tokens.Text)
    else if (nested && token.type !== 'codespan' && token.type !== 'html') leaves(nested, out)
    else out.push(null)
  }
  return out
}

/** Rewrites the text tokens of one inline run (a paragraph, a heading, a cell) with typographic punctuation. */
function smartenInline(tokens: Token[]): void {
  const run = leaves(tokens)
  smarten(run.map((leaf) => leaf?.text ?? null)).forEach((text, i) => {
    const leaf = run[i]
    if (leaf && text !== null && leaf.raw !== '\n') leaf.text = text
  })
}

/** Every inline run of a document: paragraphs, headings, table cells, list items, block quotes. */
function smartenBlocks(tokens: Token[]): void {
  for (const token of tokens) {
    if (token.type === 'paragraph' || token.type === 'heading') smartenInline((token as Tokens.Paragraph).tokens)
    else if (token.type === 'text' && (token as Tokens.Text).tokens) smartenInline((token as Tokens.Text).tokens!)
    else if (token.type === 'blockquote') smartenBlocks((token as Tokens.Blockquote).tokens)
    else if (token.type === 'list') for (const item of (token as Tokens.List).items) smartenBlocks(item.tokens)
    else if (token.type === 'table') {
      const table = token as Tokens.Table
      for (const cell of [...table.header, ...table.rows.flat()]) smartenInline(cell.tokens)
    }
  }
}

/** The most Markdown a preview renders: the Studio's own limit for a body (cms/content-types.json). */
export const MAX_MARKDOWN_CHARS = 100_000

/** A draft's Markdown as the HTML of the article body. */
export function renderMarkdown(source: string): string {
  if (source.length > MAX_MARKDOWN_CHARS) throw new RangeError(`the body is ${source.length} characters; a preview renders at most ${MAX_MARKDOWN_CHARS}`)
  const slugger = new GithubSlugger()
  const marked = new Marked({
    gfm: true,
    breaks: false,
    async: false,
    renderer: {
      heading({ tokens, depth }) {
        return `<h${depth} id="${escapeHtml(slugger.slug(tokens.map(plain).join('')))}">${this.parser.parseInline(tokens)}</h${depth}>\n`
      },
      // A code block as the build frames it (focusable, scrollable, its language named), without the colours.
      code({ text, lang }) {
        const language = (lang ?? '').trim().split(/\s+/)[0] || 'plaintext'
        return `<pre tabindex="0" data-language="${escapeHtml(language)}" style="overflow-x: auto;"><code>${escapeHtml(text.replace(/\n$/, ''))}</code></pre>\n`
      },
      // A column's alignment as a style, as the build writes it: the page's own rule for cells would win over
      // the `align` attribute `marked` writes.
      tablecell({ tokens, header, align }) {
        const tag = header ? 'th' : 'td'
        return `<${tag}${align ? ` style="text-align: ${align}"` : ''}>${this.parser.parseInline(tokens)}</${tag}>\n`
      },
    },
  })
  const tokens = marked.lexer(source)
  smartenBlocks(tokens)
  return marked.parser(tokens)
}

/**
 * A draft's body for a preview page: its HTML, or why it has none. A body too long, or nested so deeply that
 * the parser gives up, is said in a sentence instead of failing the page.
 */
export function renderBody(source: string): { ok: true; html: string } | { ok: false; message: string } {
  if (source.length > MAX_MARKDOWN_CHARS) return { ok: false, message: `is too long: at most ${MAX_MARKDOWN_CHARS.toLocaleString('en-GB')} characters` }
  try {
    return { ok: true, html: renderMarkdown(source) }
  } catch {
    return { ok: false, message: 'could not be rendered: its Markdown is nested too deeply' }
  }
}

