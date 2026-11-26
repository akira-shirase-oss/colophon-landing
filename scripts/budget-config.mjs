// The performance budget for pages built from src/content/pages, shared by scripts/check-budget.mjs (bytes,
// scripts, images, links) and scripts/lighthouse-budget.mjs (lab metrics). Raise a number only with a
// measurement and the maintainer's approval: "always top notch performance".
export const HTML_BUDGET_GZ = 60 * 1024
export const CSS_BUDGET_GZ = 6796 // a blog post's two stylesheets plus its inline style, gzipped, on 19 November 2026
export const IMAGE_BUDGET = 100 * 1024
export const MIN_LINKS = 3
/** The sections pages from src/content/pages are served under (src/lib/pages.ts, SECTION). */
export const SECTIONS = ['compare', 'use-cases', 'features', 'guides']
/** Lighthouse, mobile, median of five runs (five, not three: one noisy run on a shared CI runner can't move it).
 *
 *  ownScriptMs is the strict part: the main-thread work the page itself causes (Script Evaluation plus Script
 *  Parsing & Compilation), which runner noise can't fake. tbtMs was 0 until 19 November 2026; the coordinator
 *  raised it to 150 on this evidence from GitHub's runner (train-2, run 44578368851, benchmarkIndex about 2,880):
 *  /compare/ TBT 59 ms and a use case 46 ms, all Performance 100, while the approved live control post scored
 *  52 ms on the same runner. The slowest runs' long tasks were "Other / Unattributable" about 500 ms, against
 *  Script Evaluation 16–21 ms. On a fast laptop the same pages score TBT 0.
 *
 *  tbtMs is for a runner as fast as that one (tbtAtBenchmark). GitHub's runners vary: on 26 November 2026 they
 *  scored a benchmarkIndex of about 2,070 to 2,230, and the same unchanged pages measured TBT 152–194 ms with
 *  their own script work at 21–31 ms (runs 45829481404, two attempts), while a run that morning at about 2,550
 *  measured 61–95 ms. So the limit a page is held to is tbtMs scaled by how much slower the runner was than
 *  the reference (tbtLimit below), and never more than tbtSlackMost times it: a page that really blocks is
 *  still caught, by this and by ownScriptMs, which no runner's speed moves. */
export const LIGHTHOUSE = { lcpMs: 2000, cls: 0, tbtMs: 150, tbtAtBenchmark: 2880, tbtSlackMost: 1.5, ownScriptMs: 50, performance: 95, seo: 100, accessibility: 100 }

/** The TBT a page is held to on a runner that scored `benchmarkIndex`: the budget, scaled up for a slower runner
 *  than the reference (never down for a faster one, never past tbtSlackMost). A runner that reported no
 *  benchmark gets the budget as it is. */
export function tbtLimit(benchmarkIndex, budget = LIGHTHOUSE) {
  if (!Number.isFinite(benchmarkIndex) || benchmarkIndex <= 0) return budget.tbtMs
  const slower = Math.min(Math.max(budget.tbtAtBenchmark / benchmarkIndex, 1), budget.tbtSlackMost)
  return Math.round(budget.tbtMs * slower)
}
/** One page type's whole Lighthouse measurement (all its runs) may take this long before it fails and the next
 *  type starts, so one slow page can't eat the job's time. */
export const PAGE_DEADLINE_MS = 5 * 60 * 1000
