# Colophon 2

Landing page for Colophon, a CMS where every publish becomes a numbered release. The layout is a pixel-matched
rebuild of the Parley Framer template, ported from React 19 to Astro so the page ships as static HTML
(better for search engines), with Colophon copy.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static production build into dist/
```

## Structure

- `src/pages/index.astro` — the page: `<head>` metadata, section order, Lenis smooth scroll (1.5 s)
- `src/styles/global.css` — fonts (DM Sans, Geist, Inter), colour tokens, type presets, breakpoints
  (desktop ≥1200, tablet 810–1199, phone <810)
- `src/components/ui/` — `ArrowButton` (sliding-arrow button), `SectionHeading`, `MaskIcon`, `BrandLogo` (mark +
  name), `BrandWordmark`
- `src/components/*.astro` — one component per section, each with a co-located CSS module. Interactive parts (menu,
  benefit cards, feature tabs, Phase/Proof switch, How-it-works tabs, FAQ, hero scroll zoom) are small vanilla
  `<script>`s in the component; everything else is plain HTML with no JavaScript.
- The FAQ also emits `FAQPage` structured data (JSON-LD).

## Security headers and checks

`public/_headers` holds the headers Cloudflare Pages sends with every response: a Content-Security-Policy,
HSTS, nosniff, `X-Frame-Options`, Referrer-Policy, Permissions-Policy and COOP. The policy allows only the
site's own files plus a SHA-256 hash for each inline script.

```bash
npm test                 # unit tests: JSON-LD output can't leave its <script> element
npm run build
npm run check            # dist/: headers and CSP fit every page; no leaks, drafts or unsafe new-tab links;
                         # every JSON-LD block is valid JSON with no "<"
npm run check:browser    # every page in headless Chromium with those headers: no CSP violations
```

When a component's `<script>` changes, its hash changes and `npm run check` fails with the new value: read
the script, then swap the hash in `public/_headers`. Structured data goes through `jsonLd()` in
`src/lib/json-ld.ts`, which escapes `<`, `>` and `&`, so a title holding `</script>` or `<!--` stays data.
The leak scan also looks for the build user's name and home directory, and for any names in
`LEAK_SCAN_NAMES` (comma-separated; keep that list out of the repo). `check:browser` needs Playwright, which
is not a dependency here; see the top of `scripts/check-csp-browser.mjs`.

## License

MIT — see [LICENSE](LICENSE).
