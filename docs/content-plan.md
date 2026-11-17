# Content plan

What the blog covers, why, and what it must not claim yet. Competitor facts are dated
**2026-11-16** and come from each vendor's own docs, blog, pricing and licence pages unless a
row says otherwise. They change often: recheck a fact before reusing it in a new piece, and
recheck the whole matrix each quarter.

## How this was put together

1. Read each competitor's blog index, docs index, feature and comparison pages, noting the
   topic clusters they cover, the searches their pages are built for, and what is thin or
   absent. "Not found" means a targeted search of their own site found nothing, not proof
   that nothing exists.
2. Mapped every cluster against what Colophon's `main` branch does today, using its README,
   module docs, decisions, tests, committed OpenAPI document and stored load results.
3. Wrote only pieces whose claims could be checked in the code or in a stored result. A piece
   with any unverified claim stays `draft: true` with a comment saying what is unverified.

## Competitor matrix

`yes` documented and available; `paid` on paid or enterprise plans only; `partial` exists with
a notable limit; `enterprise` enterprise plans only; `diy` you build it yourself (hooks, flows, custom code); `no` not found in a
targeted search of their site; `soon` on a public roadmap; `?` not checked.

| | Strapi | Payload | Directus | Sanity | Contentful | Ghost | Storyblok | Hygraph | Keystone | Tina | Decap | Keystatic |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| "X vs Y" pages | yes (13) | yes (5) | yes (6) | yes (32) | yes | yes, vs blogging tools | yes, vs enterprise | yes | no | yes (3) | yes | no |
| "Best CMS" listicles | yes | ? | partial | yes | yes | no | yes | yes, many | no | no | no | no |
| Astro guide | yes | ? | yes | yes | yes | no | yes | yes | no | yes | no | yes |
| Self-hosting | yes | yes | yes | Studio only | no | yes | no | no | yes | yes | yes | yes |
| Grouped releases | paid | ? | no | enterprise | paid | no | paid | paid | no | ? | ? | no |
| Whole-site history at a past moment | no | no | no | no | no | no | no | no | no | via Git | via Git | via Git |
| Release-level rollback | no | ? | no | paid add-on | no | no | no | no | no | via Git | via Git | via Git |
| Scheduled publishing | paid | yes | diy | paid | paid | yes | paid | paid | no | no | no | no |
| Review / approvals | paid | paid | diy | ? | paid | partial | yes | paid | diy | paid | yes | no |
| Signed webhooks | diy | no webhooks | diy | yes | yes | partial | paid | yes | ? | ? | ? | ? |
| Reports deploy status (not the live site) | no | no | partial | no | partial | no | partial | partial | no | no | partial | no |
| Checks what the live site serves | no | no | no | no | no | no | no | no | no | no | no | no |
| Performance numbers with a method | partial | no | no | no | no | no | no | no | no | no | partial | no |
| Official MCP server | yes | plugin | yes | yes | yes | beta, CLI | yes | yes | no | soon | soon | no |
| Licence | MIT + EE | MIT | MSCL | Studio MIT, SaaS | proprietary | MIT | proprietary | proprietary | MIT | Apache-2.0 | MIT | MIT |

Notes on the cells that matter most for Colophon's angle:

- **Strapi.** [Releases](https://docs.strapi.io/cms/features/releases) are Growth/Enterprise,
  publish "the latest saved version of the draft", and once published "cannot be edited or
  published again". [Content History](https://docs.strapi.io/cms/features/content-history) is
  Growth/Enterprise and versions only admin-panel edits. [Review
  Workflows](https://docs.strapi.io/cms/features/review-workflows) and
  [audit logs](https://docs.strapi.io/cms/features/audit-logs) are Enterprise. [Webhooks](https://docs.strapi.io/cms/backend-customization/webhooks)
  recommend you add HMAC signing yourself. The scheduled-release rule is documented: published
  if the server returns within 5 minutes, otherwise `Failed`. [MCP server](https://docs.strapi.io/cms/features/strapi-mcp-server)
  built in and free. Comparison hub: [strapi.io/headless-cms/comparison](https://strapi.io/headless-cms/comparison).
  Listicle: [Top 10 open source CMS](https://strapi.io/blog/open-source-cms-platforms).
- **Payload.** [Versions](https://payloadcms.com/docs/versions/overview) are per document in the
  MIT core; [scheduled publish](https://payloadcms.com/docs/versions/drafts) needs a job runner;
  no built-in outbound webhooks ([hooks](https://payloadcms.com/docs/hooks/overview) instead);
  Local API skips [access control](https://payloadcms.com/docs/access-control/overview) by
  default; Publishing Workflows listed on the [enterprise page](https://payloadcms.com/enterprise).
  Comparisons at [payloadcms.com/compare](https://payloadcms.com/compare). Speed claims against
  competitors are made without a published method. Payload says it ["has joined
  Figma"](https://payloadcms.com/payload-has-joined-figma) and new Cloud deployments are paused.
- **Directus.** Database-first over an existing SQL database
  ([collections](https://directus.com/docs/guides/data-model/collections)); approvals and
  scheduling are built from a status field and a cron Flow; per-item
  [versioning](https://directus.com/docs/guides/content/content-versioning); built-in
  [MCP](https://directus.com/docs/guides/ai/mcp); licence is the
  [MSCL](https://github.com/directus/directus/blob/main/license), free under the
  [Open Innovation Grant](https://directus.com/docs/licensing/overview) for organisations under
  $5M revenue and 50 employees.
- **Sanity.** The most comparison pages ([hub](https://www.sanity.io/compare-sanity));
  [Content Releases](https://www.sanity.io/docs/user-guides/content-releases); signed
  [webhooks](https://www.sanity.io/docs/content-lake/webhook-best-practices); its Next.js
  [webhook helper](https://www.sanity.io/docs/nextjs/validating-sanity-webhooks-nextjs) waits 3
  seconds by default "so the Content Lake has time to reach eventual consistency"; hosted
  [MCP](https://www.sanity.io/mcp); content lives only in Sanity's hosted Content Lake.
- **Contentful.** SaaS only; signed webhooks
  ([request verification](https://www.contentful.com/developers/docs/webhooks/request-verification/));
  releases fail whole if one entry is invalid; remote [MCP](https://www.contentful.com/developers/docs/tools/mcp-server/);
  large agentic-AI guide hub.
- **Ghost.** A publishing platform rather than a headless CMS; its [vs pages](https://ghost.org/vs/wordpress/)
  target blogging and newsletter tools. Its official [`ghst` CLI](https://github.com/TryGhost/ghst)
  is in beta and has a built-in MCP server mode.
- **Storyblok.** Enterprise buyer's guide and enterprise vs pages; strong Astro tutorials
  ([guide](https://www.storyblok.com/docs/guides/astro)); hosted [MCP](https://www.storyblok.com/docs/tooling/mcp-server).
- **Hygraph.** Owns "best X CMS 2026" listicles and alternative pages
  ([best headless CMS](https://hygraph.com/blog/best-headless-cms),
  [Strapi alternative](https://hygraph.com/blog/strapi-alternative)); [MCP](https://hygraph.com/docs/hygraph-ai/mcp-server)
  can publish entries; SaaS only.
- **Deploy status.** Decap Turbo's [deploy status](https://decapcms.org/docs/turbo-deploy-status/),
  Directus's [Deployment module](https://directus.com/docs/guides/deployments), Contentful's
  [Netlify app](https://www.contentful.com/help/apps/netlify-app/), and Storyblok's and Hygraph's
  Netlify or Vercel integrations report whether a deploy succeeded. None of them checks what the
  live site or CDN serves.
- **Keystone, Tina, Decap, Keystatic.** Developer-focused, little marketing content. Decap Turbo
  also publishes measured timings. Tina lists MCP and auditing as coming soon on its [roadmap](https://tina.io/roadmap).
- **Others.** Wagtail ([headless](https://wagtail.org/headless/), experimental MCP) and
  Contentstack compete for "open-source CMS" and "headless CMS" respectively; not covered yet.

## What the matrix says

- **Crowded, do not lead with these:** "headless vs traditional CMS", "what is a headless CMS",
  generic content modeling explainers, "best headless CMS 2026" listicles. Every funded
  competitor covers them, and a pre-release project ranking itself in a listicle would be
  dishonest.
- **Table stakes now:** an MCP server. Nearly every competitor ships one or has one in beta, so "has MCP" is not a
  differentiator. The difference worth writing about is what an agent's token is prevented from
  doing, and where that rule is enforced.
- **Open, and Colophon can prove it:** whether a publish reached readers (receipts, site checks),
  what the whole site looked like at a past release, rollback as a reviewed release,
  crash and downtime behaviour, and performance numbers with the machine, commit and failures
  attached. Several report deploy status, but nobody in the matrix checks the live site.
- **Comparison searches exist in both directions.** Strapi, Payload, Directus, Sanity and Hygraph
  all run "X vs Y" pages. Colophon's comparisons have to be the fair ones: dated, sourced,
  and saying where the other product is ahead.

## Colophon's angles

**A real, verifiable angle (lead with these):**

| Topic | Evidence in the Colophon repository |
|---|---|
| Publish proof, receipts, site checks | delivery receipts, probe observations, the `colophon-generation` marker |
| Exactly-once publishing, numbered releases | one-transaction releases on a base generation, the leased outbox, crash test F03 |
| Whole-site history, pinned reads | publication intervals, `?generation=`, the SDK's pinned client |
| Rollback as a reviewed release | rollback changesets and their tests |
| Crash-safe saves | insert-only revisions, `If-Match`, idempotency keys, crash tests F01/F02, the simulator in CI |
| Measured performance and failure behaviour | `perf/results/` with machine, commit and verdict, including failed runs |
| Agents propose, people approve | `agent_self_review`, the MCP tool list, the stored evaluation run |
| Permissions the database also enforces | row-level security, the delivery role, owner and audit triggers |
| Schema changes checked against stored content | `needs_migration`, migration plans with dry runs |
| Scheduling with time zones and rechecks | D-060's scheduler and its tests |

**Join honestly with a tutorial or explainer:** using Colophon with Astro (done), comparisons
with Strapi, Payload and Directus (done), self-hosting (draft), and later SvelteKit (the reference
site is SvelteKit), Sanity (hosted-only, so the self-hosting contrast is fair) and Contentful.

**Avoid until the feature exists:** see the list at the end.

## Pieces

Highest priority first. Titles stay at or under 49 characters so the page title, which appends
" | Colophon", stays at or under 60. Descriptions are 120 to 155 characters. The schema enforces
both, and `npm run check` fails on any page title over 60 or description over 155.

Addresses say what a post teaches. A renamed post keeps its old address working through a 301
in `public/_redirects` (both spellings, with and without the trailing slash), and `npm run check`
fails if a redirect is chained, lands on nothing, or anything still links to an old address.

| Slug | Target search intent | Status |
|---|---|---|
| `website-not-updating-after-publish` | "website not updating after publish", "cdn showing old content after update" | published (rewritten 17 November; was `published-means-readers-can-see-it`) |
| `headless-cms-glossary` | "headless cms glossary", "what is a cache tag / idempotency key" | published 17 November |
| `website-history-past-date` | "what was on my website on a specific date", "content audit trail cms" | published (rewritten 17 November; was `what-was-live-last-tuesday`) |
| `headless-cms-publishing-checklist` | "headless cms evaluation checklist", hub page for the publishing posts | published (was `headless-cms-should-prove`) |
| `colophon-vs-strapi` | "strapi alternative", "strapi vs …", "open source headless cms comparison" | published (shared comparison template, 17 November) |
| `colophon-vs-payload` | "payload cms alternative", "payload vs …" | published (shared comparison template, 17 November) |
| `colophon-vs-directus` | "directus alternative", "directus license", "directus vs …" | published (shared comparison template, 17 November) |
| `ai-agents-cms-permissions` | "cms mcp server permissions", "ai agent cms approval" | published (was `ai-agents-without-the-publish-button`) |
| `cms-lost-edits` | "cms lost my changes", "two editors overwrite each other cms" | published (was `crash-safe-drafts`) |
| `roll-back-a-bad-publish` | "rollback published content cms", "undo publish" | published (was `rollback-is-a-change-too`) |
| `scheduled-publishing-pitfalls` | "scheduled post not published", "scheduled publishing daylight saving time" | published (was `scheduled-publishing-that-survives-downtime`) |
| `load-testing-a-cms` | "headless cms performance benchmark", "load testing cms k6" | published (was `colophon-load-test-numbers`) |
| `astro-headless-cms` | "astro headless cms", "astro cms tutorial" | published (was `colophon-with-astro`) |
| `field-level-permissions` | "field level permissions cms", "headless cms rbac", "row level security cms" | published |
| `content-modeling-in-colophon` | "headless cms content modeling", "change content type without losing data" | published; to be split, with a redirect, when the schema-change half is rewritten |
| `self-hosting-colophon` | "self-hosted headless cms", "self host rust cms" | draft: README path not re-rehearsed on current `main` |

Next, in order: a SvelteKit guide; Colophon vs Sanity; a short explainer of the release
number and the `colophon-generation` marker for people building sites; then the pieces the
"don't claim yet" list unlocks as features land (signed webhooks, draft preview, locale
delivery, a real CDN adapter, the 24-hour soak result).

## Internal links

- `headless-cms-publishing-checklist` is the hub for publishing, and `website-history-past-date`
  for history and rollback. Every topical post links up to its hub or to a sibling, and each hub
  links to its posts in its body.
- The first use of a jargon term links to its entry in `headless-cms-glossary` (each term has
  its own anchor), and each glossary entry links to the post that goes deeper.
- Each comparison links to the topical posts that back its claims (history, receipts,
  permissions, agents, scheduling) and to the other comparisons.
- Topical posts link to the comparison that contrasts them where a competitor's documented
  behaviour is quoted.
- Every published post links to at least three related posts in its body, where the topic comes
  up, and is linked from at least three others.
- Landing sections linked from posts: `/#pricing` (the Status cards). The home page links into
  the blog from running text: Features (delivery checks), Status (load tests) and For developers
  (permissions).
- No post links to a draft. `npm run check` fails on any same-origin link, image or fragment that
  doesn't resolve in the build, and on missing titles, descriptions, canonicals, share cards, alt
  text, or a sitemap or feed that doesn't match the published posts.

## Writing rules

Plain words, concrete, first person from the builder. No hype words, no italics for emphasis,
no capitals for emphasis, no emoji, no invented users or testimonials; Colophon has no users and
says so. Every competitor quote is short, accurate and linked, with the date it was checked.
Every Colophon number comes from a stored result, and laptop numbers are labelled as such.
Knowledge, not repository artifacts: no file paths, commit hashes, decision numbers, internal
crate, package or binary names, test names or milestone codes in what readers see. Say the
thing itself, and link the repository or a document once where a reader would want the source.
API paths, error codes, headers and the release marker are fine: they are what a developer types
or reads back. Error codes appear in code and response samples, not as prose. A post doesn't end
with its own status paragraph: the shared status line under every title comes from
`src/data/status.ts`, and a post may add one sentence on what is missing for its topic
(frontmatter `status`). Limits stay in the section they apply to. Each problem post teaches the
problem in terms that work with any CMS first, gives the reader something to check or run, and
shows Colophon in one section near the end, with its limits.

## Don't claim yet

Checked against Colophon's `main` on 2026-11-17 (`f3d22c0`, after the 2026-11-16 security
merge and the MIT licence). Describe these only as missing, or as planned
where the roadmap says so, clearly labelled.

- Draft preview for editors.
- Images inside rich text (they are placeholders; upload fields work).
- Locale-aware delivery: `/content/v1` has no `?locale=`.
- A real CDN adapter: purges are a generic POST, tested against a fake CDN.
- Signed webhooks: payloads are not signed on `main`.
- Browsing a rendered page of the site as it was at release N: the release slider shows counts
  and receipts; past releases are read through the API.
- Password reset and emailed staff invitations.
- A docs site.
- A Markdown or front-matter importer, and WordPress or Payload importers.
- Sitemaps or redirects generated by Colophon.
- Packages on npm, crates.io or Homebrew, published release binaries, a container image.
- A production deployment guide, metrics export (Prometheus, OpenTelemetry).
- The 24-hour soak passing (the first attempt failed on a test-account session expiry), the
  independent install, the usability sessions, the recorded crash-loop demo.
- Per-locale permissions, recurring schedules, live co-editing, the optional AI writing assistant.
- "Verified" without a location count, or any laptop number presented as production capacity.
- Any claim that the API document "can't drift": the committed OpenAPI document's destination
  schema lists only `webhook` while the server also accepts `cdn` and `probe`.
