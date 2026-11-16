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
a notable limit; `diy` you build it yourself (hooks, flows, custom code); `no` not found in a
targeted search of their site; `soon` on a public roadmap; `?` not checked.

| | Strapi | Payload | Directus | Sanity | Contentful | Ghost | Storyblok | Hygraph | Keystone | Tina | Decap | Keystatic |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| "X vs Y" pages | yes (13) | yes (5) | yes (6) | yes (32) | yes | yes, vs blogging tools | yes, vs enterprise | yes | no | yes (3) | yes | no |
| "Best CMS" listicles | yes | ? | partial | yes | yes | no | yes | yes, many | no | no | no | no |
| Astro guide | yes | ? | yes | yes | yes | no | yes | yes | no | yes | no | yes |
| Self-hosting | yes | yes | yes | Studio only | no | yes | no | no | yes | yes | yes | yes |
| Grouped releases | paid | ? | no | paid | yes | no | yes | paid | no | ? | ? | no |
| Whole-site history at a past moment | no | no | no | no | no | no | no | no | no | via Git | via Git | via Git |
| Release-level rollback | no | ? | no | paid add-on | ? | no | no | no | no | via Git | via Git | via Git |
| Scheduled publishing | paid | yes | diy | yes | yes | yes | yes | yes | no | no | no | no |
| Review / approvals | paid | paid | diy | ? | yes | partial | yes | yes | diy | paid | yes | no |
| Signed webhooks | diy | no webhooks | diy | yes | yes | partial | ? | ? | ? | ? | ? | ? |
| Confirms readers see a publish | no | no | no | no | no | no | no | no | no | no | partial | no |
| Performance numbers with a method | partial | no | no | no | no | no | no | no | no | no | partial | no |
| Official MCP server | yes | plugin | yes | yes | yes | no | yes | yes | no | soon | soon | no |
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
  [webhooks](https://www.sanity.io/docs/content-lake/webhook-best-practices) whose docs advise a
  "propagation delay" because webhooks can fire before the CDN updates; hosted
  [MCP](https://www.sanity.io/mcp); content lives only in Sanity's hosted Content Lake.
- **Contentful.** SaaS only; signed webhooks
  ([request verification](https://www.contentful.com/developers/docs/webhooks/request-verification/));
  releases fail whole if one entry is invalid; remote [MCP](https://www.contentful.com/developers/docs/tools/mcp-server/);
  large agentic-AI guide hub.
- **Ghost.** A publishing platform rather than a headless CMS; its [vs pages](https://ghost.org/vs/wordpress/)
  target blogging and newsletter tools. No official MCP server.
- **Storyblok.** Enterprise buyer's guide and enterprise vs pages; strong Astro tutorials
  ([guide](https://www.storyblok.com/docs/guides/astro)); hosted [MCP](https://www.storyblok.com/docs/tooling/mcp-server).
- **Hygraph.** Owns "best X CMS 2026" listicles and alternative pages
  ([best headless CMS](https://hygraph.com/blog/best-headless-cms),
  [Strapi alternative](https://hygraph.com/blog/strapi-alternative)); [MCP](https://hygraph.com/docs/hygraph-ai/mcp-server)
  can publish entries; SaaS only.
- **Keystone, Tina, Decap, Keystatic.** Developer-focused, little marketing content. Decap Turbo's
  [deploy status](https://decapcms.org/docs/turbo-deploy-status/) tells editors when a deploy
  containing their change succeeded: the closest any competitor comes to publish confirmation,
  and it confirms the deploy, not what the CDN serves. Decap Turbo also publishes measured
  timings. Tina lists MCP and auditing as coming soon on its [roadmap](https://tina.io/roadmap).
- **Others.** Wagtail ([headless](https://wagtail.org/headless/), experimental MCP) and
  Contentstack compete for "open-source CMS" and "headless CMS" respectively; not covered yet.

## What the matrix says

- **Crowded, do not lead with these:** "headless vs traditional CMS", "what is a headless CMS",
  generic content modeling explainers, "best headless CMS 2026" listicles. Every funded
  competitor covers them, and a pre-release project ranking itself in a listicle would be
  dishonest.
- **Table stakes now:** an MCP server. Nearly every competitor ships one, so "has MCP" is not a
  differentiator. The difference worth writing about is what an agent's token is prevented from
  doing, and where that rule is enforced.
- **Open, and Colophon can prove it:** whether a publish reached readers (receipts, site checks),
  what the whole site looked like at a past release, rollback as a reviewed release,
  crash and downtime behaviour, and performance numbers with the machine, commit and failures
  attached. Nobody in the matrix covers these with evidence.
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
" | Colophon", stays at or under 60. Descriptions stay at or under 170 characters (the schema
enforces it).

| Slug | Target search intent | Status |
|---|---|---|
| `colophon-vs-strapi` | "strapi alternative", "strapi vs …", "open source headless cms comparison" | published |
| `headless-cms-should-prove` | "headless cms publishing", "cms publish verification", hub page for the cluster | published |
| `ai-agents-without-the-publish-button` | "cms mcp server", "ai agents cms permissions", "mcp approval workflow" | published |
| `published-means-readers-can-see-it` | "cms published but site not updated", "cdn cache not updating after publish" | published (refreshed) |
| `crash-safe-drafts` | "cms lost my changes", "autosave conflict cms", "cms crash data loss" | published |
| `colophon-load-test-numbers` | "headless cms performance benchmark", "rust cms performance" | published |
| `colophon-vs-payload` | "payload cms alternative", "payload vs …", "payload cms figma" | published |
| `colophon-vs-directus` | "directus alternative", "directus license", "directus vs …" | published |
| `content-modeling-in-colophon` | "headless cms content modeling", "change content type without losing data" | published |
| `field-level-permissions` | "field level permissions cms", "headless cms rbac", "row level security cms" | published |
| `scheduled-publishing-that-survives-downtime` | "cms scheduled publishing timezone", "scheduled publish failed" | published |
| `colophon-with-astro` | "headless cms for astro", "astro cms tutorial" | published |
| `what-was-live-last-tuesday` | "cms content history", "what was on my website on a date", "content audit trail" | published (refreshed) |
| `rollback-is-a-change-too` | "rollback published content", "cms revert release" | published (refreshed) |
| `self-hosting-colophon` | "self-hosted headless cms", "self host rust cms" | draft: README path not re-rehearsed on current `main` |

Next, in order: a SvelteKit guide; Colophon vs Sanity; a short explainer of the release
number and the `colophon-generation` marker for people building sites; then the pieces the
"don't claim yet" list unlocks as features land (signed webhooks, draft preview, locale
delivery, a real CDN adapter, the 24-hour soak result).

## Internal links

- `headless-cms-should-prove` is the hub. Every topical post links back to it or to a sibling,
  and the hub links to every topical post.
- Each comparison links to the topical posts that back its claims (history, receipts,
  permissions, agents, scheduling) and to the other comparisons.
- Topical posts link to the comparison that contrasts them where a competitor's documented
  behaviour is quoted.
- Landing sections linked from posts: `/#pricing` (the Status cards). Worth adding later: links
  from the home page's FAQ and Features to the matching posts, so the blog is reachable from
  more than the nav.
- No post links to a draft. `npm run build` plus the link check in the report found no broken
  internal links on 2026-11-16.

## Writing rules

Plain words, concrete, first person from the builder. No hype words, no italics for emphasis,
no capitals for emphasis, no emoji, no invented users or testimonials; Colophon has no users and
says so. Every competitor quote is short, accurate and linked, with the date it was checked.
Every Colophon number names its result file, and laptop numbers are labelled as such. Each post
ends with "Where it stands" and the build log link.

## Don't claim yet

Checked against Colophon's `main` on 2026-11-16. Describe these only as missing, or as planned
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
- A licence file: MIT is decided; the file is not committed yet. Until it is, write "will be MIT-licensed", never "MIT-licensed".
- A production deployment guide, metrics export (Prometheus, OpenTelemetry).
- The 24-hour soak passing (the first attempt failed on a test-account session expiry), the
  independent install, the usability sessions, the recorded crash-loop demo.
- Per-locale permissions, recurring schedules, live co-editing, the optional AI writing assistant.
- "Verified" without a location count, or any laptop number presented as production capacity.
- Any claim that the API document "can't drift": the committed OpenAPI document's destination
  schema lists only `webhook` while the server also accepts `cdn` and `probe`.
