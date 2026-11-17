// Copied from Colophon (MIT): the site renderer, packages/site-renderer/src/ (escape.ts, errors.ts,
// theme.ts, css.ts, sections.ts, document.ts), with isAllowedHref from packages/editor/src/schema.ts
// and the starter's seed content from packages/site-template/src/index.ts.
// https://github.com/akira-shirase-oss/colophon-cms/tree/main/packages/site-renderer/src
//
// It turns a website-starter page's sections and theme entry into HTML and CSS, the same strings
// the Studio's canvas and the static site build use. Adapted for the landing page's illustration:
// only the parts the canvas needs are here, the rich-text section kind is left out (it needs the
// content renderer, and the illustration doesn't use it), and `canvas()` at the end places the
// result in a declarative shadow root instead of the Studio's iframe, with links made inert and
// headings turned into marked paragraphs.

// ---------- escape.ts ----------

export function escapeText(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function escapeAttribute(text: string): string {
  return escapeText(text).replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

// ---------- errors.ts ----------

/** Thrown when stored site content can't be rendered — the renderer refuses rather than guess. */
export class UnrenderableSite extends Error {
  override name = 'UnrenderableSite'
}

// ---------- editor/schema.ts (links) ----------

function isAllowedHref(href: string): boolean {
  const length = [...href].length
  if (length === 0 || length > 2048) return false
  // oxlint-disable-next-line no-control-regex -- the same check as Colophon's: control characters never reach an href
  if (/[\u0000- \u007f\\]/.test(href)) return false
  if (href.startsWith('#')) return true
  if (href.startsWith('/')) return !href.startsWith('//')
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return false
  }
  return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:'
}

// ---------- theme.ts ----------

export interface ThemeMode {
  primary?: unknown
  secondary?: unknown
  accent?: unknown
  surface?: unknown
  text?: unknown
  muted?: unknown
  radius_sm?: unknown
  radius_md?: unknown
  radius_lg?: unknown
  shadow?: unknown
  font_body?: unknown
  font_heading?: unknown
  base_size?: unknown
}

export interface ThemeContent {
  light?: ThemeMode
}

const FONT_STACKS: Record<string, string> = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  sans: 'ui-sans-serif, "Helvetica Neue", Arial, sans-serif',
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
}

const SHADOWS: Record<string, string> = {
  none: 'none',
  subtle: '0 1px 2px rgb(0 0 0 / 0.06), 0 1px 3px rgb(0 0 0 / 0.08)',
  raised: '0 4px 12px rgb(0 0 0 / 0.12)',
  floating: '0 12px 32px rgb(0 0 0 / 0.16)',
}

function colour(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new UnrenderableSite(`theme ${name} is not a #rrggbb colour`)
  return value.toLowerCase()
}

function pixels(value: unknown, name: string): string {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new UnrenderableSite(`theme ${name} is not a size in pixels`)
  return `${value}px`
}

function preset(value: unknown, table: Record<string, string>, name: string): string {
  if (typeof value !== 'string' || !(value in table)) throw new UnrenderableSite(`theme ${name} is not one it knows`)
  return table[value] as string
}

/** One mode's tokens as CSS custom properties, without a selector. */
export function modeVars(mode: ThemeMode): Record<string, string> {
  const vars: Record<string, string> = {}
  if (mode.primary !== undefined) vars['--site-primary'] = colour(mode.primary, 'primary')
  if (mode.secondary !== undefined) vars['--site-secondary'] = colour(mode.secondary, 'secondary')
  if (mode.accent !== undefined) vars['--site-accent'] = colour(mode.accent, 'accent')
  if (mode.surface !== undefined) vars['--site-surface'] = colour(mode.surface, 'surface')
  if (mode.text !== undefined) vars['--site-text'] = colour(mode.text, 'text')
  if (mode.muted !== undefined) vars['--site-muted'] = colour(mode.muted, 'muted')
  if (mode.radius_sm !== undefined) vars['--site-radius-sm'] = pixels(mode.radius_sm, 'radius_sm')
  if (mode.radius_md !== undefined) vars['--site-radius-md'] = pixels(mode.radius_md, 'radius_md')
  if (mode.radius_lg !== undefined) vars['--site-radius-lg'] = pixels(mode.radius_lg, 'radius_lg')
  if (mode.shadow !== undefined) vars['--site-shadow'] = preset(mode.shadow, SHADOWS, 'shadow')
  if (mode.font_body !== undefined) vars['--site-font-body'] = preset(mode.font_body, FONT_STACKS, 'font_body')
  if (mode.font_heading !== undefined) vars['--site-font-heading'] = preset(mode.font_heading, FONT_STACKS, 'font_heading')
  if (mode.base_size !== undefined) vars['--site-base-size'] = pixels(mode.base_size, 'base_size')
  return vars
}

/** The declarations of a vars map as `name:value;…` — the inner text of one ruleset. */
export function declarations(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([name, value]) => `${name}:${value};`)
    .join('')
}

// ---------- css.ts ----------

export const SITE_CSS = `*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:var(--site-font-body);font-size:var(--site-base-size);line-height:1.6;color:var(--site-text);background:var(--site-surface)}
h1,h2,h3{font-family:var(--site-font-heading);line-height:1.15;margin:0 0 .75rem}
h1{font-size:2.5rem}h2{font-size:1.75rem}h3{font-size:1.125rem;margin-bottom:.375rem}
p{margin:0 0 .75rem}a{color:var(--site-primary)}
.site-nav{padding:1rem 1.5rem;border-bottom:1px solid color-mix(in srgb,var(--site-muted) 25%,transparent)}
.site-nav-list{display:flex;gap:1.25rem;list-style:none;margin:0;padding:0}
.site-nav-list a{color:var(--site-text);text-decoration:none}
.site-nav-list a:hover{color:var(--site-primary)}
.site-section{padding:3rem 1.5rem}
.site-section[data-spacing=compact]{padding:1.5rem}
.site-section[data-spacing=spacious]{padding:5rem 1.5rem}
.site-section[data-align=center]{text-align:center}
.site-section[data-align=center] :is(.site-hero-inner,.site-prose,.site-faq-list,blockquote,.site-cta-inner){margin-inline:auto}
.site-section[data-align=end]{text-align:end}
.site-section[data-scheme=primary]{background:var(--site-primary);color:#fff}
.site-section[data-scheme=secondary]{background:var(--site-secondary);color:#fff}
.site-section[data-scheme=invert]{background:var(--site-text);color:var(--site-surface)}
.site-section[data-scheme=surface]{background:var(--site-surface)}
.site-section[data-scheme] .site-tagline{color:inherit;opacity:.85}
.site-hero-inner,.site-cta-inner{max-width:44rem;margin:0 auto}
.site-tagline{font-size:1.125rem;color:var(--site-muted);margin-bottom:1.5rem}
.site-btn{display:inline-block;background:var(--site-primary);color:#fff;padding:.625rem 1.25rem;border-radius:var(--site-radius-md);box-shadow:var(--site-shadow);text-decoration:none;font-weight:600}
.site-btn:hover{filter:brightness(1.08)}
.site-section[data-scheme=primary] .site-btn,.site-section[data-scheme=secondary] .site-btn{background:var(--site-surface);color:var(--site-text)}
.site-prose{max-width:44rem;margin:0 auto}
.site-feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1.25rem;list-style:none;margin:1.5rem 0 0;padding:0}
.site-card{background:color-mix(in srgb,var(--site-surface) 90%,var(--site-text));border-radius:var(--site-radius-lg);padding:1.25rem;box-shadow:var(--site-shadow)}
.site-section[data-scheme] .site-card{background:var(--site-surface);color:var(--site-text)}
.site-testimonial blockquote{max-width:42rem;margin:0 auto;font-size:1.25rem}
.site-testimonial footer{color:var(--site-muted);margin-top:1rem;font-size:1rem}
.site-section[data-scheme] .site-testimonial footer{color:inherit;opacity:.8}
.site-faq-list{max-width:44rem;margin:1.5rem auto 0}
.site-faq-item{padding:1.25rem 0;border-bottom:1px solid color-mix(in srgb,var(--site-muted) 30%,transparent)}
.site-faq-item dt{font-weight:600}
.site-faq-item dd{margin:.5rem 0 0}
.site-faq-item dd p{margin-bottom:.5rem}
`

// ---------- sections.ts ----------

type Block = Record<string, unknown>

const text = (block: Block, key: string): string | undefined => {
  const value = block[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new UnrenderableSite(`${key} is not text`)
  return value
}

const requiredText = (block: Block, key: string): string => {
  const value = text(block, key)
  if (value === undefined) throw new UnrenderableSite(`${key} is missing`)
  return value
}

const items = (block: Block, key: string): Block[] => {
  const value = block[key]
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new UnrenderableSite(`${key} is not a list`)
  return value as Block[]
}

function link(block: Block, labelKey: string, urlKey: string): string {
  const label = text(block, labelKey)
  const url = text(block, urlKey)
  if (label === undefined || label === '' || url === undefined || url === '') return ''
  if (!isAllowedHref(url)) throw new UnrenderableSite(`a section link's address is not allowed`)
  return `<a class="site-btn" href="${escapeAttribute(url)}">${escapeText(label)}</a>`
}

function styleAttributes(block: Block): string {
  const style = block['style']
  if (style === undefined || style === null) return ''
  if (typeof style !== 'object' || Array.isArray(style)) throw new UnrenderableSite('style is not the shared component')
  const attrs: string[] = []
  for (const key of ['scheme', 'spacing', 'align'] as const) {
    const value = (style as Block)[key]
    if (value === undefined || value === null || value === '') continue
    if (typeof value !== 'string') throw new UnrenderableSite(`style ${key} is not a choice`)
    attrs.push(`data-${key}="${escapeAttribute(value)}"`)
  }
  return attrs.length === 0 ? '' : ` ${attrs.join(' ')}`
}

const open = (block: Block, name: string, index: number): string => `<section class="site-section site-${name}" data-i="${index}"${styleAttributes(block)}>`

function hero(block: Block, index: number): string {
  const heading = requiredText(block, 'heading')
  const tagline = text(block, 'tagline')
  return `${open(block, 'hero', index)}<div class="site-hero-inner">
<h1>${escapeText(heading)}</h1>
${tagline === undefined || tagline === '' ? '' : `<p class="site-tagline">${escapeText(tagline)}</p>\n`}${link(block, 'label', 'url')}
</div></section>`
}

function features(block: Block, index: number): string {
  const heading = text(block, 'heading')
  const cards = items(block, 'items').map((item) => {
    const title = requiredText(item, 'title')
    const body = text(item, 'text')
    return `<li class="site-card"><h3>${escapeText(title)}</h3>${body === undefined || body === '' ? '' : `\n<p>${escapeText(body)}</p>`}</li>`
  })
  return `${open(block, 'features', index)}${heading === undefined || heading === '' ? '' : `<h2>${escapeText(heading)}</h2>\n`}
<ul class="site-feature-grid">
${cards.join('\n')}
</ul></section>`
}

function testimonial(block: Block, index: number): string {
  const quote = requiredText(block, 'quote')
  const author = text(block, 'author')
  const role = text(block, 'role')
  const byline = [author, role]
    .filter((part) => part !== undefined && part !== '')
    .map((part) => escapeText(part as string))
    .join(', ')
  return `${open(block, 'testimonial', index)}<blockquote>
<p>${escapeText(quote)}</p>
${byline === '' ? '' : `<footer>${byline}</footer>\n`}</blockquote></section>`
}

function cta(block: Block, index: number): string {
  const heading = requiredText(block, 'heading')
  const body = text(block, 'text')
  return `${open(block, 'cta', index)}<div class="site-cta-inner">
<h2>${escapeText(heading)}</h2>
${body === undefined || body === '' ? '' : `<p>${escapeText(body)}</p>\n`}${link(block, 'label', 'url')}
</div></section>`
}

const KINDS: Record<string, (block: Block, index: number) => string> = { hero, features, testimonial, cta }

/** A page's `sections` field to HTML, top to bottom (annotated with each section's index). */
export function renderSections(blocks: Block[]): string {
  return blocks
    .map((block, index) => {
      const kind = block['_block']
      if (typeof kind !== 'string' || !(kind in KINDS)) throw new UnrenderableSite(`a section kind ${JSON.stringify(kind)} is not one the site knows`)
      return (KINDS[kind] as (block: Block, index: number) => string)(block, index)
    })
    .join('\n')
}

// ---------- document.ts ----------

export interface NavItem {
  label: string
  href: string
}

/** The site header's menu, from items already resolved to hrefs. */
export function renderNav(navItems: NavItem[]): string {
  if (navItems.length === 0) return ''
  const links = navItems.map((item) => `<li><a href="${escapeAttribute(item.href)}">${escapeText(item.label)}</a></li>`).join('\n')
  return `<nav class="site-nav"><ul class="site-nav-list">\n${links}\n</ul></nav>`
}

// ---------- site-template: the starter's seed entries ----------

/** The palette the starter theme holds (DEFAULT_MODE). */
export const STARTER_THEME: ThemeContent = {
  light: {
    primary: '#6d28d9',
    secondary: '#0f766e',
    accent: '#d97706',
    surface: '#ffffff',
    text: '#18181b',
    muted: '#71717a',
    radius_sm: 4,
    radius_md: 8,
    radius_lg: 16,
    shadow: 'subtle',
    font_body: 'system',
    font_heading: 'system',
    base_size: 16,
  },
}

// ---------- the landing page's illustration ----------

/**
 * A page rendered for the canvas: the theme's variables, the shared stylesheet, the menu and the
 * sections, inside a declarative shadow root so neither page's styles reach the other. The
 * Studio uses an iframe; this keeps the landing page free of frames and scripts. `:root` and
 * `body` become the shadow host and a wrapper, and every href is dropped: it is a picture.
 */
export function canvas(theme: ThemeContent, nav: NavItem[], sections: Block[]): string {
  if (theme.light === undefined) throw new UnrenderableSite('the theme has no light mode')
  // Headings become paragraphs marked with their level (and the stylesheet follows, with the bold
  // a browser gives headings), so the illustration's headings never join the landing page's outline.
  const css = `:host{display:block;${declarations(modeVars(theme.light))}}\n${SITE_CSS.replace('body{', '.site-body{')
    .replace('h1,h2,h3{', '[data-h]{font-weight:700;')
    .replace(/\bh([1-3])\{/g, '[data-h="$1"]{')}`
  const body = `${renderNav(nav)}\n<div>\n${renderSections(sections)}\n</div>`
    .replace(/ href="[^"]*"/g, '')
    .replace(/<h([1-3])>/g, '<p data-h="$1">')
    .replace(/<\/h[1-3]>/g, '</p>')
  return `<template shadowrootmode="open"><style>${css}</style><div class="site-body">${body}</div></template>`
}

/** WCAG contrast of two #rrggbb colours, as the Studio's ThemeLook design sheet computes it. */
export function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const channel = (index: number) => {
      const value = parseInt(hex.slice(index, index + 2), 16) / 255
      return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  }
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}
