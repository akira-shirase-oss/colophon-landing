// The performance budget for pages built from src/content/pages, shared by scripts/check-budget.mjs (bytes,
// scripts, images, links) and scripts/lighthouse-budget.mjs (lab metrics). Raise a number only with a
// measurement and the maintainer's approval: "always top notch performance".
export const HTML_BUDGET_GZ = 60 * 1024
export const CSS_BUDGET_GZ = 6796 // a blog post's two stylesheets plus its inline style, gzipped, on 19 November 2026
export const IMAGE_BUDGET = 100 * 1024
export const MIN_LINKS = 3
/** The sections pages from src/content/pages are served under (src/lib/pages.ts, SECTION). */
export const SECTIONS = ['compare', 'use-cases']
/** Lighthouse, mobile, median of three runs. */
export const LIGHTHOUSE = { lcpMs: 2000, cls: 0, tbtMs: 0, performance: 95, seo: 100, accessibility: 100 }
