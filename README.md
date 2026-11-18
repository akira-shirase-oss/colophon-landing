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
- `src/styles/global.css` — fonts (DM Sans, Geist, Inter), type presets, breakpoints
- `src/styles/tokens.css` — every colour on the site, light first, each with a dark twin (see *Light and dark*)
  (desktop ≥1200, tablet 810–1199, phone <810)
- `src/components/ui/` — `ArrowButton` (sliding-arrow button), `SectionHeading`, `MaskIcon`, `BrandLogo` (mark +
  name), `BrandWordmark`
- `src/components/*.astro` — one component per section, each with a co-located CSS module. Interactive parts (menu,
  benefit cards, FAQ, hero scroll zoom) are small vanilla
  `<script>`s in the component; everything else is plain HTML with no JavaScript.
- The FAQ also emits `FAQPage` structured data (JSON-LD).

## Light and dark

The site follows the device's setting, and the switch in the header (System, Light, Dark) can pin either theme.
The choice is kept in `localStorage` (inside `try`/`catch`, so a browser that blocks storage still gets the
device's theme) and applied before first paint by a one-line inline script in `src/layouts/Base.astro`, so a
pinned theme never flashes the other one. It is hash-allowed in `public/_headers` like the other inline scripts.

- **Colours live only in `src/styles/tokens.css`.** Light values sit on `:root`; the dark set is written twice,
  under `@media (prefers-color-scheme: dark)` for `:root:not([data-theme="light"])` and under
  `:root[data-theme="dark"]`. Components use `var(--c-…)`. `npm test` fails on a colour literal anywhere else
  in `src/` or in an SVG under `public/` (the token file and the six SVG assets are exempt by explicit path),
  and on a token missing from either dark block.
- **Dark is designed, not inverted:** a warm near-black page, surfaces that step up in lightness, an off-white
  ink, chips re-tinted for the dark surface, code drawn with `github-dark-default` (every token at least
  4.8:1, checked by `npm run check`), and the CTA painting shaded toward dusk.
- **The hero is a sky, drawn in CSS:** gradients sampled from the painting it replaced (sunset in light, dusk
  in dark), two SVG hills and a fine `feTurbulence` grain, with no image download. Light sets the headline in a
  deep plum ink; dark in white.
- **The share image** (`public/og.jpg`) is rendered from the built hero: `npm run build && node scripts/make-og.mjs`
  (needs Playwright, as below). Re-run it after changing the hero, and commit the JPEG.
- **The footer wordmark** has three treatments chosen at build time with `WORDMARK`: `plain` (the default),
  `receipt` (letters filled with tiny release receipts, plus a printer's imprint line) and `type` (letterpress
  sorts that settle once when the footer comes into view; its inline script then needs its hash in `_headers`,
  which `npm run check` prints).
- `docs/screens/theme/` holds the four main pages at 1440 × 900 and 390 × 844 in both themes, as a record of
  the look.

## Security headers and checks

`public/_headers` holds the headers Cloudflare Pages sends with every response: a Content-Security-Policy,
HSTS, nosniff, `X-Frame-Options`, Referrer-Policy, Permissions-Policy and COOP. The policy allows only the
site's own files plus a SHA-256 hash for each inline script.

```bash
npm test                 # unit tests: JSON-LD output can't leave its <script> element; no colour
                         # outside src/styles/tokens.css, and every token has its dark twin
npm run build
npm run check            # dist/: headers and CSP fit every page; no leaks, drafts or unsafe new-tab links;
                         # every same-origin link resolves; each page has its title, description, one h1,
                         # canonical (or noindex), share card and alt text; the sitemap and feed list exactly
                         # the published pages; every JSON-LD block is valid JSON with no "<"; every
                         # redirect in public/_redirects is a 301 to a built page, and nothing links to
                         # an old address; every highlighted code token is coloured through the theme
                         # variables and reaches AA (4.5:1) on the code surface
npm run check:browser    # every page in headless Chromium with those headers, in light and in dark: no
                         # CSP violations, every code token drawn in its theme colour, the theme switch
                         # works by mouse and keyboard, a stored choice applies before first paint, and
                         # blocked storage still leaves a working page
```

When a component's `<script>` changes, its hash changes and `npm run check` fails with the new value: read
the script, then swap the hash in `public/_headers`. Structured data goes through `jsonLd()` in
`src/lib/json-ld.ts`, which escapes `<`, `>` and `&`, so a title holding `</script>` or `<!--` stays data.
The leak scan also looks for the build user's name and home directory, and for any names in
`LEAK_SCAN_NAMES` (comma-separated; keep that list out of the repo). `check:browser` needs Playwright, which
is not a dependency here; see the top of `scripts/check-csp-browser.mjs`.

`.github/workflows/ci.yml` runs on every push, every pull request and daily: workflow hygiene
(`scripts/check-workflows.mjs`), `npm ci`, `npm audit --omit=dev --audit-level=moderate`, lint, `npm test`, the
build and `npm run check`. Dependabot proposes one grouped npm PR and one grouped Actions PR a week.

## License

MIT — see [LICENSE](LICENSE).
