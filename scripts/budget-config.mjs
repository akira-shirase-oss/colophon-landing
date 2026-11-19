// The performance budget for pages built from src/content/pages, shared by scripts/check-budget.mjs (bytes,
// scripts, images, links) and scripts/lighthouse-budget.mjs (lab metrics). Raise a number only with a
// measurement and the maintainer's approval: "always top notch performance".
export const HTML_BUDGET_GZ = 60 * 1024
export const CSS_BUDGET_GZ = 6796 // a blog post's two stylesheets plus its inline style, gzipped, on 19 November 2026
export const IMAGE_BUDGET = 100 * 1024
export const MIN_LINKS = 3
/** The sections pages from src/content/pages are served under (src/lib/pages.ts, SECTION). */
export const SECTIONS = ['compare', 'use-cases', 'guides']
/** Lighthouse, mobile, median of five runs (five, not three: one noisy run on a shared CI runner can't move it).
 *
 *  ownScriptMs is the strict part: the main-thread work the page itself causes (Script Evaluation plus Script
 *  Parsing & Compilation), which runner noise can't fake. tbtMs was 0 until 19 November 2026; the coordinator
 *  raised it to 150 on this evidence from GitHub's runner (train-2, run 44578368851, benchmarkIndex about 2,880):
 *  /compare/ TBT 59 ms and a use case 46 ms, all Performance 100, while the approved live control post scored
 *  52 ms on the same runner. The slowest runs' long tasks were "Other / Unattributable" about 500 ms, against
 *  Script Evaluation 16–21 ms. On a fast laptop the same pages score TBT 0. */
export const LIGHTHOUSE = { lcpMs: 2000, cls: 0, tbtMs: 150, ownScriptMs: 50, performance: 95, seo: 100, accessibility: 100 }
/** One page type's whole Lighthouse measurement (all its runs) may take this long before it fails and the next
 *  type starts, so one slow page can't eat the job's time. */
export const PAGE_DEADLINE_MS = 5 * 60 * 1000
