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
  4.8:1, checked by `npm run check`).
- **The hero is a brand block** (`.brand-block` in `global.css`): a CSS gradient from white at
  the top to #0061ff at the bottom, the same in both themes, with navy type and a navy button (AA or better on
  the worst pixel under every word), a hairline edge so the card reads on a white page, and no image at all. The
  hero adds eight quiet navy line icons around the edges; they stand still, and hovering one tilts it (CSS only). The headline and description live in `src/data/hero.ts`, which also
  feeds the page title and the share image's alt text.
- **The closing statement** (`CTA.astro`) is one sentence in display-size Inter on the page itself, with five
  original pixel-art illustrations between the words (`ui/PixelArt.astro`: grids of colour letters turned into
  `<rect>` runs at build time, colours from tokens with dark twins). The words live in `src/data/statement.ts`;
  each illustration stays on the line with the word before it.
- **The share image** (`public/og.jpg`) is rendered from the built hero: `npm run build && node scripts/make-og.mjs`
  (needs Playwright, as below). Re-run it after changing the hero, and commit the JPEG.
- **The footer wordmark** is "Colophon" in Geist Pixel's own cells, like a receipt printer's dots, generated
  into `src/components/ui/wordmark-cells.ts` by `scripts/wordmark-from-geist-pixel.py` from the shipped font.
  The first time the footer comes into view it prints row by row (once, about 600 ms; still under reduced
  motion or without JavaScript).
- `docs/screens/theme/` holds the four main pages at 1440 × 900 and 390 × 844 in both themes, as a record of
  the look.

## Account buttons (when the app launches)

The header shows **See the source** until the app is live. A build with `PUBLIC_APP_URL` set (for example
`https://app.colophon.404human.dev`) shows **Sign in** and **Sign up** instead (`/studio/signin`,
`/studio/signup`), or **Dashboard** (`/studio/`) for someone signed in. The landing reads only the app's
non-secret hint cookie `colophon_signed_in` (exactly `1`; D-200) in the head script, before the first paint,
and never calls the app.

At the app's launch: the landing is built here and uploaded (`wrangler pages deploy dist`; Cloudflare Pages
does not build it), so a variable in the Pages dashboard would not reach the build. Set it where the build runs:
`PUBLIC_APP_URL=https://app.colophon.404human.dev npm run build`, run the checks with the same variable, then
deploy that `dist/` as usual. `npm run check` then expects the Sign in link on every page; without the variable it fails if
any page links to the app. `npm run check:app` builds and checks an app-enabled copy (into `dist-app/`) so both
states stay tested before launch.

## Kept light

The page stays still unless someone acts. Effects run once (the hero title and footer wordmark print, the
theme toggle's view transition on click) or on hover in CSS; nothing loops, follows the pointer, listens to
scroll or blurs what's behind it, and no large element is masked. `npm run check` fails on `backdrop-filter`,
an endless animation or a move/scroll listener; `npm run check:browser` fails on a mask over anything larger
than 48px and on an icon that moves with the pointer.

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

## Pages for search (comparisons first)

Pages written for one search intent live as Markdown in `src/content/pages/` (schema in `src/content.config.ts`).
Each page has a `kind` that decides its address (`compare` → `/compare/<id>/`), a title of at most 49 characters,
a description of 120 to 155 characters, the query it answers, its dates, at least three related links, and its FAQ.
One layout, `src/layouts/SeoPage.astro`, renders them all from the blog's own components and styles. It adds no
visual element, no stylesheet and no script. The visible FAQ and the FAQPage data come from the same frontmatter.

They are held to a performance budget (maintainer: "always top notch performance"; numbers in
`scripts/budget-config.mjs`):

- **`npm run check` runs `scripts/check-budget.mjs`.** Each page's HTML is at most 60 KB gzipped. Its CSS is only
  the stylesheets a blog post already loads, within their size. It runs no script a blog post doesn't. Its images
  are AVIF, WebP or SVG with a width and height, lazy below the first, and within the per-image budget. At least
  three other pages link to it from their content, and it links to at least three.
- **CI's browser job runs `scripts/lighthouse-budget.mjs`.** On one page of each type, served with
  `dist/_headers`: mobile, the median of five runs, LCP at most 2.0 s, CLS 0, TBT 0, Performance at least 95,
  SEO 100 and Accessibility 100. CI runner numbers are lab observations; a regression past a threshold fails.

## Security headers and checks

`public/_headers` holds the headers Cloudflare Pages sends with every response: a Content-Security-Policy,
HSTS, nosniff, `X-Frame-Options`, Referrer-Policy, Permissions-Policy and COOP. The policy allows only the
site's own files plus a SHA-256 hash for each inline script, and one third party: Cloudflare Web Analytics.
Cloudflare adds its beacon to every page. It sets no cookies and gives page views and real-user Core Web
Vitals, which search needs and lab tests can't give. The policy allows exactly its script origin
(`https://static.cloudflareinsights.com`) and where it reports (`'self'`, since on this proxied site it posts to
`/cdn-cgi/rum`, and `https://cloudflareinsights.com`). `npm run check` fails on any other origin
(`scripts/csp-rules.mjs`). No other analytics, tag managers or pixels. JSON-LD blocks need no hash: they are
data the browser never runs. The exemption covers only an exact `type="application/ld+json"`, and any other
unknown script type fails the check.

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
npm run check:app        # an app-enabled build (dist-app/): account buttons by the hint cookie, no shift
npm run check:browser    # every page in headless Chromium with those headers, in light and in dark: no
                         # CSP violations, every code token drawn in its theme colour, the theme switch
                         # works by mouse and keyboard, a stored choice applies before first paint, and
                         # blocked storage still leaves a working page; titles are drawn in the Geist
                         # Pixel web font and text in the Inter web font, never a local fallback
```

When a component's `<script>` changes, its hash changes and `npm run check` fails with the new value: read
the script, then swap the hash in `public/_headers`. Structured data goes through `jsonLd()` in
`src/lib/json-ld.ts`, which escapes `<`, `>` and `&`, so a title holding `</script>` or `<!--` stays data.
The leak scan also looks for the build user's name and home directory, and for any names in
`LEAK_SCAN_NAMES` (comma-separated; keep that list out of the repo). `check:browser` needs Playwright, which
is not a dependency here; see the top of `scripts/check-csp-browser.mjs`.

`.github/workflows/ci.yml` runs on every push, every pull request and daily: workflow hygiene
(`scripts/check-workflows.mjs`), `npm ci`, `npm audit --omit=dev --audit-level=moderate`, lint, `npm test`, the
build and `npm run check`; then, in a second job with a pinned Playwright, `check-csp-browser.mjs --mutate`
(which must fail) and `npm run check:browser`. Dependabot proposes one grouped npm PR and one grouped Actions PR a week.

## License

MIT — see [LICENSE](LICENSE).
