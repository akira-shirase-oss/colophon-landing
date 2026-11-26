// The sections reskinned to the D-210 design tokens must not keep a colour or a font of their own:
// every colour comes from src/styles/tokens.css (var(--primary), var(--card), var(--muted-foreground),
// the radius and shadow tokens…), every font from --font-sans, --font-title or --font-mono. This scans
// the section files and fails on:
//
//   colour   a hex value, a colour function (rgb, hsl, hwb, lab, lch, oklab, oklch, color()), or a
//            named colour in a colour position — colour-mix() is allowed, it derives from tokens.
//   legacy   a var(--c-…) reference, the palette the tokens replaced.
//   font     a font-family declaration that doesn't name one of the three font tokens, or a font
//            name written literally.
//
// Run on its own (node scripts/check-literals.mjs) or as part of npm run check. Exits 1 with every
// hit listed, or prints the count of files that were clean.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

// The D-210 sections' files: the only files this check owns. The foundation (tokens.css, global.css,
// ui/*, Nav, Hero, Footer, Base) is checked by its own branch.
const FILES = [
  'src/components/Benefits.astro',
  'src/components/Benefits.module.css',
  'src/components/Integrations.astro',
  'src/components/Integrations.module.css',
  'src/components/FAQ.astro',
  'src/components/FAQ.module.css',
  'src/components/CTA.astro',
  'src/components/CTA.module.css',
  'src/components/Status.astro',
  'src/components/Blog.module.css',
  'src/pages/blog/index.astro',
  'src/pages/blog/[...slug].astro',
  'src/layouts/Post.astro',
  'src/pages/404.astro',
]

const HEX = /#[0-9a-f]{3,8}\b/gi
const FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/gi
const NAMED =
  /(?:color|background(?:-color)?|fill|stroke|border(?:-[a-z]+)?|outline|box-shadow|text-shadow|stop-color)\s*[:=]\s*["']?[^;"'>]*(?<![-\w])(?:white|black|red|green|blue|gray|grey|silver|yellow|orange|pink|purple|violet|navy|teal|maroon|olive|lime|aqua|fuchsia|gold|beige|ivory|coral|salmon|tomato|crimson|indigo|lavender|plum|khaki|tan)\b/gi
const LEGACY = /var\(\s*--c-[a-z]/g
const FAMILY = /\bfont(?:-family)?\s*:[^;}]*/gi
const FONT_TOKEN = /var\(\s*--font-(?:sans|title|mono)\s*\)/
// A name quoted like a family ('Inter', "Geist Pixel") or a bare system name in a font declaration.
const FAMILY_NAME = /(['"])[A-Za-z][A-Za-z0-9 -]*\1|\b(?:sans-serif|serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-monospace)\b/g

const failures = []

for (const file of FILES) {
  const path = join(root, file)
  if (!existsSync(path)) {
    failures.push(`${file}: missing`)
    continue
  }
  const lines = readFileSync(path, 'utf8').split('\n')
  lines.forEach((line, i) => {
    const at = `${file}:${i + 1}`
    for (const m of line.matchAll(HEX)) {
      // A `#` can also open a URL fragment or an id, not a colour.
      if (/(?:href|id|url\()\s*=?\s*["'`]?[^"'`]*$/.test(line.slice(0, m.index))) continue
      failures.push(`${at}: colour literal ${m[0]}`)
    }
    for (const m of line.matchAll(FN)) failures.push(`${at}: colour function ${m[0]}`)
    for (const m of line.matchAll(NAMED)) failures.push(`${at}: named colour in "${m[0].slice(0, 60)}"`)
    for (const m of line.matchAll(LEGACY)) failures.push(`${at}: legacy token ${m[0]}…`)
    for (const m of line.matchAll(FAMILY)) {
      const decl = m[0]
      if (!FONT_TOKEN.test(decl)) {
        failures.push(`${at}: font not from a token: ${decl.trim().slice(0, 80)}`)
        continue
      }
      // The declaration may stack tokens (a fallback after the var()); a literal name still fails.
      const names = decl.matchAll(FAMILY_NAME)
      for (const n of names) failures.push(`${at}: literal font name ${n[0]}`)
    }
  })
}

if (failures.length) {
  console.error(`check-literals: ${failures.length} literal(s) in the D-210 section files\n`)
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log(`check-literals: ${FILES.length} files clean (tokens only)`)
