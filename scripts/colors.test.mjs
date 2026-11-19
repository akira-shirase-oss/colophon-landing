// Every colour lives in src/styles/tokens.css (the byte copy of Colophon's design tokens, light on :root, dark on
// .dark; scripts/tokens.test.mjs checks it) or src/styles/theme.css (the site's names for them, and its own few
// colours, each with a dark twin). Components, pages, posts and the global styles use var(--…) only, so a new
// screen can't forget dark mode. Exempt, by explicit path only: the two token files and the static SVG assets, which are drawn once
// in one colour and tinted through CSS masks where they need to follow the theme.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const EXEMPT = new Set([
  'src/styles/tokens.css',
  'src/styles/theme.css',
  'public/favicon.svg',
  'public/icons/arrow.svg',
  'public/icons/close.svg',
  'public/icons/github.svg',
  'public/icons/plus.svg',
  'public/icons/x.svg',
])
const SCANNED = /\.(css|astro|ts|mjs|js|md|mdx|svg|html)$/

const files = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : SCANNED.test(e.name) ? [join(dir, e.name).split(sep).join('/')] : [],
  )

// A literal colour: hex, a colour function, or a named colour as the value of a colour property or attribute.
const NAMED = 'white|black|red|green|blue|gray|grey|silver|yellow|orange|pink|purple|violet|navy|teal|maroon|olive|lime|aqua|fuchsia|gold|beige|ivory|coral|salmon|tomato|crimson|indigo|lavender|plum|khaki|tan'
const LITERAL = [
  /#[0-9a-f]{3,8}\b/gi,
  /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi,
  new RegExp(`(?:color|background(?:-color)?|fill|stroke|border(?:-[a-z]+)?|outline|box-shadow|text-shadow|stop-color)\\s*[:=]\\s*["']?[^;"'>]*(?<![-\\w])(?:${NAMED})\\b`, 'gi'),
]

test('no hard-coded colour outside the token file', () => {
  const found = []
  for (const file of [...files('src'), ...files('public').filter((f) => f.endsWith('.svg'))]) {
    if (EXEMPT.has(file)) continue
    const lines = readFileSync(join(root, file), 'utf8').split('\n')
    lines.forEach((line, i) => {
      // `#` followed by hex digits is also an id in a URL fragment or an href: only flag it in a colour position.
      for (const re of LITERAL) {
        for (const m of line.matchAll(re)) {
          if (re === LITERAL[0] && /(?:href|id|url\()\s*=?\s*["']?[^"']*$/.test(line.slice(0, m.index))) continue
          found.push(`${file}:${i + 1}: ${m[0]}`)
        }
      }
    })
  }
  assert.deepEqual(found, [], `hard-coded colours (use a token from src/styles/tokens.css):\n${found.join('\n')}`)
})

test("every colour of the site's own has a dark twin, and the dark block holds nothing else", () => {
  const css = readFileSync(join(root, 'src/styles/theme.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const block = (selector) => {
    const at = css.indexOf(`${selector} {`)
    assert.ok(at >= 0, `theme.css has no ${selector} block`)
    return css.slice(at, css.indexOf('}', at))
  }
  const decls = (text) => Object.fromEntries([...text.matchAll(/(--(?:c|surface|hero)-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
  const light = decls(block(':root'))
  const dark = decls(block('.dark'))
  // An alias (var(--token)) follows tokens.css's .dark by itself; a literal colour needs its own dark value.
  const own = Object.keys(light).filter((name) => !/^var\(--[\w-]+\)$/.test(light[name]) && !/^color-mix\(/.test(light[name]) && light[name] !== 'transparent').sort()
  assert.ok(Object.keys(light).length > 30, 'the site\'s names are on :root')
  assert.deepEqual(Object.keys(dark).sort(), own, 'the .dark block names exactly the site\'s own colours')
  assert.doesNotMatch(css, /prefers-color-scheme/, 'dark is the .dark class (set by Base.astro), as in tokens.css')
})

test('the scanner itself catches each kind of literal', () => {
  const probe = ['color: #fff;', 'background: rgba(0, 0, 0, 0.3)', 'fill="#000"', 'stop-color="white"', 'border: 1px solid black']
  for (const line of probe) assert.ok(LITERAL.some((re) => { re.lastIndex = 0; return re.test(line) }), line)
  for (const line of ['href="/blog/#faq"', 'color: var(--c-ink)', 'fill="currentColor"', 'background: transparent', 'fill: var(--c-px-blue)']) {
    const hit = LITERAL.some((re) => { re.lastIndex = 0; const m = re.exec(line); return m && !(re === LITERAL[0] && /href/.test(line)) })
    assert.ok(!hit, `false positive: ${line}`)
  }
  void relative
})
