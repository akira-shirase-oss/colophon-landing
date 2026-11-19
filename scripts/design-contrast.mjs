#!/usr/bin/env node
// The website's contrast table (D-210): every text pair the site draws, and every non-text boundary, in both
// themes, measured from src/styles/tokens.css (the byte copy of colophon-cms design/tokens.css) and
// src/styles/theme.css (the site's --c-* names and its own colours). The measuring is colophon-cms's
// scripts/design-contrast.mjs, ported: WCAG 2.x relative luminance, oklch converted to sRGB the CSS Color 4
// way, out-of-gamut channels clipped as a browser shows them, and a translucent ground written
// `name/NN over base` (the token at NN% over another, blended in sRGB as the browser does).
// Text needs 4.5:1 (WCAG 1.4.3); field edges, focus rings and marks need 3:1 (1.4.11).
//
//   node scripts/design-contrast.mjs     # prints the table; exits 1 if any pair misses its bar
//
// scripts/design-contrast.test.mjs runs the same table in `npm test`, so CI fails on a pair below its bar.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (name) => readFileSync(fileURLToPath(new URL(`../src/styles/${name}`, import.meta.url)), 'utf8')

/** The `--name: value` declarations of the first `selector {` block (`:root` or `.dark`). */
export function block(css, selector) {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) return {}
  const body = css.slice(start, css.indexOf('}', start))
  const tokens = {}
  for (const m of body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) tokens[m[1]] = m[2].trim()
  return tokens
}

/** Both themes' tokens, every `var(--x)` resolved: dark is light with tokens.css's and theme.css's .dark over it. */
export function themes(tokensCss = read('tokens.css'), themeCss = read('theme.css')) {
  const light = { ...block(tokensCss, ':root'), ...block(themeCss, ':root') }
  const dark = { ...light, ...block(tokensCss, '.dark'), ...block(themeCss, '.dark') }
  const resolve = (t) => {
    const out = {}
    const get = (name, seen = []) => {
      if (seen.includes(name)) throw new Error(`--${name} refers to itself`)
      const v = t[name]
      if (v === undefined) return undefined
      const m = v.match(/^var\(--([a-z0-9-]+)\)$/)
      return m ? get(m[1], [...seen, name]) : v
    }
    for (const name of Object.keys(t)) out[name] = get(name)
    return out
  }
  return { light: resolve(light), dark: resolve(dark) }
}

/** A colour as linear sRGB, clipped to the gamut, and its alpha. */
export function linear(value) {
  let m = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)$/)
  if (m) {
    const [L, C, h] = m.slice(1, 4).map(Number)
    const a = C * Math.cos((h * Math.PI) / 180)
    const b = C * Math.sin((h * Math.PI) / 180)
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
    return [
      4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
    ].map((x) => Math.min(1, Math.max(0, x)))
  }
  m = value.match(/^#([0-9a-f]{6})$/i)
  if (m) {
    return [0, 2, 4].map((i) => {
      const c = parseInt(m[1].slice(i, i + 2), 16) / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
  }
  throw new Error(`can't measure ${value}`)
}

const encode = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
export const luminance = (value) => {
  const [r, g, b] = linear(value)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const ratio = (x, y) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p)
  return (hi + 0.05) / (lo + 0.05)
}
export const hex = (value) =>
  '#' + linear(value).map((c) => Math.round(encode(c) * 255).toString(16).padStart(2, '0').toUpperCase()).join('')

/** A ground: a token, or `name/NN over base`, the token at NN% over another, blended in sRGB. */
export function ground(t, name) {
  const m = name.match(/^([a-z0-9-]+)\/(\d+) over ([a-z0-9-]+)$/)
  if (!m) return t[name]
  if (t[m[1]] === undefined || t[m[3]] === undefined) return undefined
  const [top, base, a] = [linear(t[m[1]]).map(encode), linear(t[m[3]]).map(encode), Number(m[2]) / 100]
  return '#' + top.map((c, i) => Math.round((a * c + (1 - a) * base[i]) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}

// What the site draws on what. A pair is here because a component draws it; adding a component that puts text
// on a new ground means adding its pair.
const PAGES = ['c-bg', 'c-surface', 'c-raised', 'c-raised-hover', 'card', 'popover']
export const TEXT = [
  // Running text, titles, the soft half of a title, captions: on the page, the panels and the cards.
  ...PAGES.flatMap((g) => [['c-ink', g], ['c-prose', g], ['c-text', g], ['c-muted', g]]),
  ['c-link', 'c-bg'], ['c-link', 'c-surface'], ['c-link', 'card'],
  // Buttons (ui/Button.astro): primary and its hover, secondary and ghost on their grounds and hover.
  ['primary-foreground', 'primary'], ['primary-foreground', 'primary-hover'],
  ['foreground', 'popover'], ['accent-foreground', 'accent'], ['foreground', 'c-bg'],
  // Badges (ui/Badge.astro) and the section label.
  ['brand-ink', 'brand-soft'], ['secondary-foreground', 'secondary'],
  ...['live', 'changed', 'pending', 'attention', 'draft'].map((s) => [`${s}-ink`, `${s}-soft`]),
  ['c-blue-ink', 'c-blue-tint'], ['c-green-ink', 'c-green-tint'], ['c-pink-ink', 'c-pink-tint'],
  ['c-chip-ink', 'c-blue-tint'], ['c-chip-ink', 'c-green-tint'], ['c-chip-ink', 'c-pink-tint'],
  ['c-draft-ink', 'c-draft-bg'],
  // A field (ui/Input.astro): its text and placeholder.
  ['foreground', 'popover'], ['muted-foreground', 'popover'],
  // Diagrams in posts.
  ['c-figure-ink', 'c-figure-fill'], ['c-figure-text', 'c-figure-fill'],
  // The hero's brand block: navy type on the white-to-#0061ff gradient. The type sits in its top 70% (the
  // button's label is on the button), so the deepest ground it meets is the blue at 70% over the white.
  ['c-on-brand', 'c-brand-top'], ['c-on-brand', 'c-brand-bottom/70 over c-brand-top'],
  ['c-brand-button-text', 'c-brand-button'], ['c-brand-button-text', 'c-brand-button-hover'],
  // Hover grounds on the page (secondary's tint over the page, the switch's ground).
  ['c-ink', 'c-switch-bg'], ['c-ink', 'muted/50 over c-bg'], ['c-text', 'muted/50 over c-bg'],
]
export const MARKS = [
  ['input', 'c-bg'], ['input', 'popover'], ['ring', 'c-bg'], ['ring', 'card'], ['ring', 'c-surface'],
  ['brand', 'c-bg'], ['c-focus', 'c-bg'],
  // The hero's button against the gradient under it: its edges sit 62–77% of the way down the block (measured
  // at 1440 and 390), so the deepest ground is checked with a margin, at 80%; and its focus edge on the blue.
  ['c-brand-button', 'c-brand-bottom/80 over c-brand-top'], ['c-brand-button-hover', 'c-brand-bottom/80 over c-brand-top'],
  ['c-on-brand', 'c-brand-bottom/80 over c-brand-top'],
  ['live', 'c-bg'], ['changed', 'c-bg'], ['pending', 'c-bg'], ['attention', 'c-bg'], ['draft', 'c-bg'],
]

export function table(t = themes()) {
  const rows = []
  for (const theme of ['light', 'dark']) {
    for (const [pairs, bar, kind] of [[TEXT, 4.5, 'text'], [MARKS, 3, 'non-text']]) {
      for (const [fg, bg] of pairs) {
        const g = ground(t[theme], bg)
        const f = t[theme][fg]
        if (f === undefined || g === undefined) throw new Error(`${theme}: --${fg} or --${bg} is missing`)
        const r = ratio(f, g)
        rows.push({ theme, fg, bg, kind, bar, r, pass: r >= bar, fgHex: hex(f), bgHex: g.startsWith('#') ? g : hex(g) })
      }
    }
  }
  return rows
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = table()
  for (const r of rows) console.log(`${r.pass ? 'pass' : 'FAIL'}  ${r.theme.padEnd(5)} --${r.fg} on --${r.bg}: ${r.r.toFixed(2)}:1 (bar ${r.bar})`)
  const failed = rows.filter((r) => !r.pass)
  if (failed.length > 0) {
    console.error(`${failed.length} pair(s) below their bar`)
    process.exit(1)
  }
  console.log(`${rows.length} pairs, all at or above their bar`)
}
