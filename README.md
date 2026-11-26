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

- `src/pages/index.astro` — the home page: the published words, handed to `src/layouts/Home.astro` (`<head>`
  metadata, section order)
- `src/layouts/` — `Document.astro` is every page's `<head>` and `<body>`; `Home.astro`, `Post.astro` and
  `Page.astro` are the home page, a blog post and a page of a section. None of them reads content: the page that
  renders one hands it the words, so a built page and a draft preview share a layout (see *Draft preview*).
  `Base.astro` and `SeoPage.astro` are the wrappers that read the published words for a built page.
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
  `dist/_headers`: mobile, the median of five runs, LCP at most 2.0 s, CLS 0, TBT at most 150 ms with the page's own script work at most 50 ms, Performance at least 95,
  SEO 100 and Accessibility 100. CI runner numbers are lab observations; a regression past a threshold fails.

## Content comes from Colophon

The site's words are entries in a Colophon project, edited and published in the Studio; the build reads them
from the public delivery API (no credential) and prints plain HTML, as before.

| In the Studio | Collection | What it is on the site |
|---|---|---|
| **Blog posts** | `posts` | `/blog/<URL name>/`, the blog index and the feed |
| **Pages** | `pages` | comparisons, features, use cases, guides and each section's index, by **Kind** |
| **Home page** | `home` (one entry) | the title and description, the hero, the benefit cards, the questions, the closing statement |
| **Site settings** | `site` (one entry) | the status line under every post's title |

- `cms/content-types.json` holds the four content types; `scripts/cms-seed.mjs` creates them and one draft per
  entry in an empty project (it only creates, and never publishes).
- `src/lib/colophon.ts` reads the delivery API: every read of one build names the same release, a failed read
  fails the build, and nothing is cached between builds. `src/content.config.ts` turns the entries into the
  `blog`, `pages`, `home` and `site` collections and checks each against the same schema as before, so an
  entry the page can't hold (a title that is too long, a missing description) fails the build and the live
  site stays on the last good release. The schemas live in `src/lib/schemas.ts`, where a draft preview uses
  them too.
- Every page's `<head>` carries `<meta name="colophon-generation" content="N">`: the release it was built
  from. A Colophon **site check** pointed at the home page reads it, so a release's receipt says **Verified**
  only once the rebuilt site is live.
- The project is named in `src/lib/colophon.ts`; `COLOPHON_PROJECT`, `COLOPHON_API` and `COLOPHON_ENVIRONMENT`
  point a build at another project, server or environment. The Markdown in `src/content` and the words in
  `src/data/home.ts` are the copy the project was seeded from on 26 November 2026: nothing reads them unless a
  build sets `COLOPHON_PROJECT=` (empty), which builds from them and prints no marker. Edit the site in the
  Studio, not there.
- A deploy is a build, the checks and an upload, with the app's address so the header links to it:
  `PUBLIC_APP_URL=https://colophonapp.404human.dev npm run build`, `npm run check` with the same variable,
  then `wrangler pages deploy dist`. Publishing in the Studio doesn't rebuild the site by itself yet.

## Draft preview

An editor presses **Preview** in the Studio and sees the unpublished draft drawn by this site, in the pane
beside the editor or in a tab of its own; it reloads after each save. Nothing about the public site changes:
every page is still a static file. Three addresses are rendered on demand, and only these:

| Address | What it does |
|---|---|
| `GET /api/preview?code=…&path=/preview/<collection>/<id>` | The address the Studio opens. It trades the one-time code with Colophon for a short-lived token, server to server, keeps the token in this site's own cookie (`HttpOnly; Secure; SameSite=None; Partitioned`, living exactly as long as the token) and goes to `path`. |
| `GET /preview/posts/<id>`, `/preview/pages/<id>`, `/preview/home/<id>`, `/preview/site/<id>` | The draft of that entry, read from Colophon's `/preview/v1` with the token, in the layout the public page uses: a post as `/blog/<slug>/`, a page as its section's pages, the home page as `/`. The site settings have one visible word, the status line, so their preview is a sample post with that line under its title and the other fields listed in its body; the page says it is a sample. |
| `GET /api/preview/exit?path=…` | Clears the cookie and goes to the entry's public page if the site has one, else the home page. Inside the Studio's frame it stays and says the preview was left, because a public page refuses to load in a frame. |

**The preview target** to set in the Studio, for the project's `production` environment:

```
https://colophon.404human.dev/api/preview?code={code}&path=/preview/{collection}/{id}
```

**What a preview never does.** Without a valid preview cookie a preview address answers "This preview has
ended": never a draft, and never the published page under a preview address. Nothing is read from Colophon
unless the address names one of the four collections and a UUID. The handler redirects only to
`/preview/<collection>/<id>`: a `path` that names anything else, or tries to leave the site, is refused before
the code is spent. The token is in the cookie and nowhere else: not in the HTML, a URL or a log. Every read has
a 10-second deadline and a 2 MiB cap and never follows a redirect. A used or expired link, an ended, revoked
or expired preview, a publish request that changed or went live, a busy Colophon: each gets a page that says
which, with Colophon's own reason beside it.

**How it is built.** Astro renders on demand only through an adapter, and its own Cloudflare adapter deploys
to Workers: it no longer supports Pages. `adapter/pages.mjs` is the small adapter this site needs instead. The
build still writes every page into `dist/` where it always did, and adds `dist/_worker.js/` (the three routes,
as a Pages Function) and `dist/_routes.json` (the only paths that reach it; Pages serves everything else from
the static files without running code). The deploy doesn't change: `wrangler pages deploy dist` bundles the
worker with the files. It needs nothing set in the Cloudflare dashboard: no Node compatibility flag, no
binding and no secret, since the one-time code is the credential. A route outside `/api/preview` and
`/preview` that opts out of prerendering fails the build.

The preview reads the project the build reads: `COLOPHON_API`, `COLOPHON_PROJECT` and `COLOPHON_ENVIRONMENT`
are written into the worker as the build saw them (`src/lib/colophon.ts`), and the Studio's origin is that
server's. Variables of the same names on the Pages project point a deployed preview somewhere else. A build
with `COLOPHON_PROJECT=` has nothing to preview, and its routes say so.

**Where a preview differs from the published page.** All of it on purpose, none of it hidden:

- **Code blocks have no syntax colours.** The build colours code with Shiki; in a Function that costs about a
  second of CPU the first time a TypeScript block is drawn (measured on a laptop, 26 November 2026), and
  Cloudflare's free plan allows 10 ms a request. A preview draws the same block (surface, font, scroll) with
  plain text.
- **The Markdown is rendered by another parser.** The build uses Astro's (a native binary, which a Function
  can't run); a preview uses `marked` with the same extras: GitHub-flavoured Markdown, raw HTML as written,
  typographic quotes and dashes, and the same `id` on every heading. `npm test` renders every post and page in
  `src/content` both ways and they match, code colours aside. Known gaps: footnotes aren't rendered as
  footnotes, and task lists lack the build's class names.
- **It isn't a page for search.** `noindex`, no canonical URL, no `og:url`, no release marker
  (`colophon-generation`), and the share image's alt text is just "Colophon".
- **The status line is read at that moment**, from the `site` entry as the preview sees it, not the one a
  build froze into the page. A reader whose role can't read the site settings gets the page without it.
- **A bar sits above the header** ("Draft preview: not published", "Exit preview"), and one small script
  talks to the Studio (below). An entry outside the preview's scope is drawn from its published words, and the
  bar says that instead.
- **A draft the build would refuse isn't drawn.** The preview checks a draft with the build's own schemas
  (`src/lib/schemas.ts`) and lists what is wrong in the Studio's field names, such as "Description is too
  short: at least 120 characters", so a publish that would break the build is caught before it is requested.
- **Links lead to the public site.** A link in a draft goes where it will go once published; previews of
  other drafts aren't linked together, and a publish request with several entries opens on its first.

**Caches and crawlers.** Every answer of the three routes is `Cache-Control: no-store` (`private, no-store`
for a page), `X-Robots-Tag: noindex` and `Referrer-Policy: no-referrer`, with no `ETag`. `robots.txt`
disallows `/api/preview` and `/preview/` for every crawler, named or not, so none spends a code. The sitemap,
the feed and `llms.txt` are built from the published entries and never name a preview address
(`npm run check` fails if one does). Cloudflare doesn't cache a Function's answer unless a rule tells it to:
if a "cache everything" rule is ever added to the zone, exclude `/api/preview*` and `/preview/*`.

**Headers and the Studio's frame.** Cloudflare Pages applies `public/_headers` to the files it serves, never to
a Function's answer, so the preview routes send their own. They aren't written twice: the worker reads
`public/_headers` and sends the `/*` rule's headers, with `frame-ancestors` naming the Studio's origin
(`https://colophonapp.404human.dev`) and nothing else, `X-Frame-Options` left out (it can't name an origin),
and one more hash in `script-src`. That hash is the Studio handshake's (`src/lib/preview/listen.ts`): framed, the
page tells the Studio it is ready and whether it holds a preview session (`colophon:preview-ready`), and reloads
when the Studio says a draft was saved (`colophon:draft-saved`), both with the Studio's exact origin and never
`*`. When the script changes, `npm test` fails with the new hash: read the script, then set
`LISTEN_SCRIPT_HASH`. The public pages keep `frame-ancestors 'none'` and `X-Frame-Options: DENY`.

Inside the Studio's frame this site is a third party, which is why the cookie is `SameSite=None` and
`Partitioned`. A browser that still drops it shows "This preview has ended" in the pane and tells the Studio
so; the Studio then offers the preview in a new tab, where the cookie is first-party.

**Code it came from.** Colophon's SDK isn't on npm yet, so the part a site needs is vendored in
`src/lib/preview/sdk.ts` and `listen.ts` (MIT, from `packages/sdk/src/preview.ts` of colophon-cms; each file
says what it kept and what it changed). Replace them with `@colophon-cms/sdk` once it is published.

**Checks.**

- `npm test`: the SDK's own tests, ported; the routes against a stub; the handshake script run in a stub
  window; the Markdown comparison with the build; the draft mapping on every seeded entry.
- `npm run check`: `scripts/check-preview.mjs` imports the built worker and drives it against a local stand-in
  for Colophon (code to cookie to draft, each refusal, every header, the token's absence from HTML and logs);
  `check-dist` holds `_routes.json` to the eight preview paths and the worker to the web platform alone.
- `npm run check:browser`: Chromium frames the preview from another site, as the Studio does: the cookie is
  kept, the handshake is heard, a save reloads the frame, and any other origin's frame is refused.
- **The public pages are unchanged**, and that is checked by building both sides from the Markdown in
  `src/content` and comparing every file: `COLOPHON_PROJECT= npx astro build --outDir <a>` on `main`, the same on
  the branch, then `diff -r <a> <b>`. Besides the new `_worker.js/`, `_routes.json` and the preview pages' own
  stylesheet under `_astro/`, the only file that may differ is `robots.txt` (the two `Disallow` lines); no
  `.html` file may. A page's stylesheets are ordered by where their imports sit, so a refactor of a layout
  shows up here first.

**Size and time**, measured on 26 November 2026 (a laptop; development observations, not Cloudflare's numbers):
the worker is 18 modules, 811 KB as built and 211 KB gzipped (wrangler 4.168.0 compiles it to 503 KiB), against
Cloudflare's limit of 3 MB compressed on the free plan. A preview of the longest post (23 KB of Markdown) takes
about 4 ms of CPU once warm and about 60 ms the first time in a fresh process; a short post under 1 ms. The
first request to a cold Function may therefore pass the free plan's 10 ms; if previews ever fail with
Cloudflare's error 1102, that is the cause.

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
                         # only the preview routes reach the worker, and it answers as "Draft preview" says;
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
                         # Pixel web font and text in the Inter web font, never a local fallback; and a
                         # draft preview framed from another site, as the Studio frames it
```

When a component's `<script>` changes, its hash changes and `npm run check` fails with the new value: read
the script, then swap the hash in `public/_headers`. Structured data goes through `jsonLd()` in
`src/lib/json-ld.ts`, which escapes `<`, `>` and `&`, so a title holding `</script>` or `<!--` stays data.
The leak scan also looks for the build user's name and home directory, and for any names in
`LEAK_SCAN_NAMES` (comma-separated; keep that list out of the repo). `check:browser` needs Playwright, which
is not a dependency here; see the top of `scripts/check-csp-browser.mjs`.

`.github/workflows/ci.yml` runs on every push, every pull request and daily: workflow hygiene
(`scripts/check-workflows.mjs`), `npm ci`, `npm audit --omit=dev --audit-level=moderate`, lint, `npm test`, the
build and `npm run check` (which drives the built preview worker against a stand-in for Colophon); then, in a
second job with a pinned Playwright, `check-csp-browser.mjs --mutate` (which must fail) and
`npm run check:browser`. Dependabot proposes one grouped npm PR and one grouped Actions PR a week.

## After a deploy: IndexNow

Once a new build is live, `node scripts/indexnow.mjs` tells search engines which pages changed through
[IndexNow](https://www.indexnow.org) (Bing, Yandex and others share submissions). It works out the changes since
the merge's first parent, the previous deploy:

- **A changed or deleted post or page** sends its own address and the list that shows it.
- **A change to layouts, components, styles, data, config or `public/`** sends every address in the sitemap.

It sends one request with at most 10,000 URLs and a 10-second deadline, and it never fails a deploy: every outcome
is printed and the exit code is 0. `--dry-run` prints the URLs without sending them; `--from` and `--to` take any two
commits. The key in `public/<key>.txt` is public by design, because IndexNow verifies a submission by fetching it
from the site. The maintainer approved IndexNow on 19 November 2026.

## License

MIT — see [LICENSE](LICENSE).
