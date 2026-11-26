// A preview renders a draft's Markdown without the build's pipeline (src/lib/preview/markdown.ts). This holds it
// to the build's output: every post and page in src/content is rendered both ways and compared, and the
// places where the two are known to differ are pinned so a change shows up here first.
//
// The build's side is Astro's own Markdown processor, read from Astro's dependencies; if a new Astro moves it,
// this test fails on its import and says so.
//
//   npm test
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri'
import { MAX_MARKDOWN_CHARS, renderBody, renderMarkdown, smarten } from '../src/lib/preview/markdown.ts'

// The build highlights code with Shiki; a preview doesn't (README, "Draft preview"). Without the highlighter the
// build's processor writes a plain block too, so what is compared is everything else.
const build = await createSatteriMarkdownProcessor({ syntaxHighlight: false })
const decode = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/g, '"').replace(/&#39;/g, "'")
/** The differences that draw nothing: how a quote is escaped, a code block's attributes, line breaks between tags. */
const same = (html) =>
  decode(html)
    .replace(/<pre[^>]*>/g, '<pre>')
    .replace(/<code class="language-[^"]*">/g, '<code>')
    .replace(/\n<\/code><\/pre>/g, '</code></pre>')
    .replace(/>\n+</g, '><')
    .trim()
const both = async (markdown) => [same((await build.render(markdown)).code), same(renderMarkdown(markdown))]

test('every post and page in src/content renders as the build renders it, code colours aside', async () => {
  let documents = 0
  for (const folder of ['blog', 'pages']) {
    for (const name of readdirSync(new URL(`../src/content/${folder}/`, import.meta.url))) {
      const body = readFileSync(new URL(`../src/content/${folder}/${name}`, import.meta.url), 'utf8').replace(/^---[\s\S]*?\n---\n/, '')
      const [built, previewed] = await both(body)
      assert.equal(previewed, built, `${folder}/${name}`)
      documents += 1
    }
  }
  assert.ok(documents >= 30, `compared ${documents} documents`)
})

test('the pieces a draft is likely to use match the build', async () => {
  for (const [what, markdown] of Object.entries({
    quotes: `She said "hello" and 'bye'. It's the '90s -- or --- so... "*emph*" and "[link](/x)". ("paren") 'tis`,
    'a quote around code': 'Set `"x"` to "`y`" and \'`z`\'.',
    alignment: '| a | b | c |\n|:--|--:|:-:|\n| 1 | 2 | 3 |',
    autolinks: 'See https://example.com/x and www.example.com and a@b.co.',
    'heading ids': '## Same\n\n## Same\n\n## Ça va? Yes & no\n\n### `code` in *head*\n\n## "Quoted" heading',
    strikethrough: '~~gone~~ and ~one~',
    'raw HTML': '<div class="x">\n\n**bold inside**\n\n</div>\n\n<!-- comment -->\n\ninline <kbd>K</kbd> html\n\n<h3 id="term">Term</h3>\n\nIts "definition".',
    image: '![alt text](/og.jpg "title")',
    'code blocks': '```ts title="x"\nconst a = 1 < 2 && "q"\n```\n\n    indented code\n\n```\nno language\n```',
    rules: 'a\n\n---\n\nb\n\n***\n',
    'setext headings': 'Title\n=====\n\nSub\n---\n',
    'a quote in a list in a quote': '> quote "with" *it*\n>\n> - item\'s',
    escapes: 'A \\*literal\\* star and a \\"quote\\".',
  })) {
    const [built, previewed] = await both(markdown)
    assert.equal(previewed, built, what)
  }
})

test('where a preview is known to differ from the build', async () => {
  // Whitespace only: a line break after <br> and before a nested list.
  for (const markdown of ['line one  \nline two\\\nline three', '1. one\n2. two\n   - deep']) {
    const [built, previewed] = await both(markdown)
    assert.notEqual(previewed, built)
    assert.equal(previewed.replace(/\s+/g, ''), built.replace(/\s+/g, ''), markdown)
  }
  // A named entity is left as written (the browser shows the same character).
  assert.equal(renderMarkdown('&copy; 2026'), '<p>&copy; 2026</p>\n')
  // Task lists have their boxes but not the build's classes; footnotes aren't rendered as footnotes at all.
  assert.match(renderMarkdown('- [x] done'), /<li><input checked="" disabled="" type="checkbox"> done<\/li>/)
  assert.ok(!renderMarkdown('Text[^1].\n\n[^1]: Note.').includes('footnote'))
})

test('a code block is framed as the build frames it, and its text can never become markup', () => {
  assert.equal(renderMarkdown('```html\n<script>alert("x")</script> & </code></pre>\n```'), '<pre tabindex="0" data-language="html" style="overflow-x: auto;"><code>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &lt;/code&gt;&lt;/pre&gt;</code></pre>\n')
  assert.match(renderMarkdown('```\nplain\n```'), /^<pre tabindex="0" data-language="plaintext" /)
  assert.match(renderMarkdown('```"><script>x</script> more\ncode\n```'), /^<pre tabindex="0" data-language="&quot;&gt;&lt;script&gt;x&lt;\/script&gt;" /)
  assert.ok(!renderMarkdown('```ts\nconst a = "b"\n```').includes('“'), 'no typographic quotes inside code')
  assert.equal(renderMarkdown('Use `"x"` here.'), '<p>Use <code>&quot;x&quot;</code> here.</p>\n')
})

test('typographic punctuation follows the quotes across emphasis, links and code', () => {
  assert.deepEqual(smarten(['"', 'bold', '"']), ['“', 'bold', '”'])
  assert.deepEqual(smarten(['say "', null, '" twice']), ['say “', null, '” twice'])
  assert.deepEqual(smarten(["it's '", 'quoted', "' and the '90s"]), ['it’s ‘', 'quoted', '’ and the ’90s'])
  assert.deepEqual(smarten(['a -- b --- c...']), ['a – b — c…'])
  assert.deepEqual(smarten([null]), [null])
  assert.deepEqual(smarten([]), [])
})

test('a heading gets the id the build would give it, counted per document', () => {
  assert.equal(renderMarkdown('## One\n\n## One\n\n## One'), '<h2 id="one">One</h2>\n<h2 id="one-1">One</h2>\n<h2 id="one-2">One</h2>\n')
  assert.equal(renderMarkdown('## One'), '<h2 id="one">One</h2>\n', 'a second document starts counting again')
})

test('a body past the Studio’s own limit is refused, not rendered', () => {
  assert.equal(MAX_MARKDOWN_CHARS, 100_000)
  assert.doesNotThrow(() => renderMarkdown('a'.repeat(MAX_MARKDOWN_CHARS)))
  assert.throws(() => renderMarkdown('a'.repeat(MAX_MARKDOWN_CHARS + 1)), RangeError)
  assert.deepEqual(renderBody('a'.repeat(MAX_MARKDOWN_CHARS + 1)), { ok: false, message: 'is too long: at most 100,000 characters' })
  assert.deepEqual(renderBody('Fine.'), { ok: true, html: '<p>Fine.</p>\n' })
})

test('markup nested past what the parser can follow is said, never thrown', () => {
  // The parser recurses once per level, so tens of thousands of levels exhaust the stack. A page must not fail on it.
  for (const hostile of ['>'.repeat(20_000) + ' deep', '- '.repeat(5_000) + 'x']) {
    assert.deepEqual(renderBody(hostile), { ok: false, message: 'could not be rendered: its Markdown is nested too deeply' })
  }
  assert.equal(renderBody('>'.repeat(200) + ' deep').ok, true, 'two hundred levels are fine')
})

test('long runs of marks are rendered in bounded time', () => {
  const started = Date.now()
  for (const hostile of ['*'.repeat(50_000), '['.repeat(30_000), '"'.repeat(60_000), ('| a '.repeat(200) + '|\n').repeat(200), '`'.repeat(40_000), '*a '.repeat(30_000), '[a](b '.repeat(15_000), '<'.repeat(90_000)]) {
    assert.equal(renderBody(hostile.slice(0, MAX_MARKDOWN_CHARS)).ok, true)
  }
  // A laptop observation with a wide margin: each takes tens of milliseconds here; seconds would mean a regression.
  assert.ok(Date.now() - started < 10_000, `took ${Date.now() - started} ms`)
})
