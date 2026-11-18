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
- `src/styles/global.css` — fonts (Geist Pixel and Inter, see *Typography*), type presets, breakpoints
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
- **The hero is a blue block, drawn in CSS:** a cobalt-to-brand-blue gradient with white type (5:1 or more
  under every word), a cream button, and eight quiet line icons around the edges that drift and lean away
  from the pointer (static under reduced motion or without JavaScript). The headline and description live in
  `src/data/hero.ts`, which also feeds the page title and the share image's alt text.
- **The share image** (`public/og.jpg`) is rendered from the built hero: `npm run build && node scripts/make-og.mjs`
  (needs Playwright, as below). Re-run it after changing the hero, and commit the JPEG.
- **The footer wordmark** is "Colophon" in Geist Pixel's own cells, like a receipt printer's dots, generated
  into `src/components/ui/wordmark-cells.ts` by `scripts/wordmark-from-geist-pixel.py` from the shipped font.
  The first time the footer comes into view it prints row by row (once, about 600 ms; still under reduced
  motion or without JavaScript).
- `docs/screens/theme/` holds the four main pages at 1440 × 900 and 390 × 844 in both themes, as a record of
  the look.

## Typography

Two families, both self-hosted from `public/fonts/` (no font CDN; the CSP allows `font-src 'self'` only):

| Font | Used for | File |
| --- | --- | --- |
| Geist Pixel | titles: the hero headline, each page's `<h1>`, the home page's section titles, post titles in the blog list | `geist-pixel-latin.woff2`, 11 KB |
| Inter | everything inside them: text, nav, buttons, chips, the FAQ, the footer, article prose and its subheadings | `inter-latin-var.woff2`, 26 KB |

Code uses the system's monospace (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`). Roles, not tags,
choose the font: `--font-title` and `--font-text` in `src/styles/global.css`, so a Markdown `##` inside a post
stays Inter. Geist Pixel draws one 38-unit cell per pixel, so its sizes are whole cells where possible
(26.32px is one pixel a cell). Each family has a local fallback with `size-adjust` and ascent/descent overrides
measured against Arial, so the swap doesn't move the page. `npm run check` fails on any other `@font-face`,
font file or font preload.

The fonts were supplied by the maintainer, originally from Google Fonts, and processed with fontTools:

- Geist Pixel: the `ELSH` (pixel shape) axis pinned to 0, the square-pixel Regular (identical outlines to
  Square at 1; from 20 the corners round), subset to Basic Latin plus `· – — ‘ ’ “ ” … ← →`, WOFF2.
- Inter: `opsz` pinned to 14 (text size) and `wght` limited to 400–600, subset to Latin-1 plus common
  punctuation and arrows, the `kern liga calt tnum cv03 cv04 cv09 cv11` features kept, WOFF2. No italic file:
  the one emphasised phrase on the site is slanted by the browser.

Both are under the SIL Open Font License 1.1: `public/fonts/OFL-GeistPixel.txt` (© 2026 The Geist Project
Authors) and `public/fonts/OFL-Inter.txt` (© 2020 The Inter Project Authors).

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
                         # variables and reaches AA (4.5:1) on the code surface; no font but Geist Pixel
                         # and Inter is declared, shipped or preloaded
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
