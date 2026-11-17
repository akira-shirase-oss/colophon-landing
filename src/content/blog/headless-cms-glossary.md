---
title: "Headless CMS glossary: terms in plain words"
description: "Plain definitions of headless CMS terms, from cache tags and webhooks to releases, receipts and rollbacks, each linked to the post that goes deeper."
pubDate: 2026-11-17
tags: ["glossary", "headless cms", "publishing", "caching"]
glossary: true
draft: false
---

Headless CMS writing is full of words that mean slightly different things to different vendors. This page defines the ones the posts on this blog use. Each entry says what the term means in general first, then, where it matters, what it means in Colophon, then where to read more. The posts link here the first time they use a term, so none of them has to stop and explain it again.

Jump to: [A](#a) · [C](#c) · [D](#d) · [E](#e) · [F](#f) · [G](#g) · [H](#h) · [I](#i) · [L](#l) · [M](#m) · [O](#o) · [P](#p) · [R](#r) · [S](#s) · [T](#t) · [U](#u) · [W](#w)

## A

<h3 id="api-token">API token</h3>

A secret that lets a script or service call a CMS's API as itself rather than as a person. A good token carries only the permissions its job needs, expires, and can be revoked at once. Treat it like a password.

**In Colophon:** a token is a project identity with its own permissions. Its secret is shown once and stored only as a hash, it expires after 1 to 366 days, and it can never manage members, roles or tokens. Read more: [giving AI agents CMS access without the publish button](/blog/ai-agents-cms-permissions/).

<h3 id="approval">Approval</h3>

A reviewer's yes to a proposed change before it goes live. An approval is only as good as what it covers: if the content can change after someone approved it, the approval no longer means much.

**In Colophon:** an approval counts only for the exact revisions it was given on, identified by a hash, and expires after seven days. Self-review is allowed by default and shown with a badge; an API token can't approve what an API token submitted. Read more: [rolling back a release as a reviewed change](/blog/roll-back-a-bad-publish/).

<h3 id="audit-log">Audit log</h3>

A record of who did what and when, kept so it can't be quietly edited later. Useful audit logs are append-only and written in the same transaction as the change they record.

**In Colophon:** the audit log records changes to roles, members, invitations and API tokens, plus a few operational events. Database triggers refuse edits and deletes; rows older than 90 days are removed by the retention sweep. Content edits and publishes are recorded in revision history and releases instead. Read more: [field-level permissions](/blog/field-level-permissions/).

## C

<h3 id="cache-stampede">Cache stampede</h3>

What happens when a popular cached answer expires and every waiting request goes to the database at once. The usual fix is to let one request refill the cache while the others wait for its result, often called request coalescing or single-flight.

**In Colophon:** misses for the same cache key share one fill. In a laptop run with 1,000 callers at each hot-key expiry, 22,106 requests caused 50 database fills in all. Read more: [Colophon's load tests, with the caveats](/blog/load-testing-a-cms/).

<h3 id="cache-tag">Cache tag (surrogate key)</h3>

A label a server attaches to a response, such as the id of every entry on a page, so a CDN can later drop every cached copy carrying that label in one request. Fastly calls them surrogate keys; Cloudflare calls them cache tags. Purging by tag beats purging by URL when one entry appears on many pages.

**In Colophon:** delivery answers carry a `Cache-Tag` header naming their entries and collection. Read more: [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

<h3 id="cdn">CDN</h3>

A content delivery network: servers in many places that keep copies of your pages close to readers. A CDN makes a site fast and keeps it up under load, and it is the most common reason a published change isn't visible yet, because each edge keeps its copy until it expires or is purged.

Read more: [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

<h3 id="changeset">Changeset</h3>

A named set of changes that is reviewed and published together, like a pull request for content. Some CMSs call a similar idea a release or a bundle.

**In Colophon:** the Studio calls it a publish request. It pins the exact revision of every entry in it, plus any entries to take down, and it is what an approval covers. Even a one-entry publish is a changeset. Read more: [six publishing questions a CMS should answer](/blog/headless-cms-publishing-checklist/).

<h3 id="conditional-field">Conditional field</h3>

A field that applies only when another field has a certain value, such as "event date" only when "type" is event. A good CMS also makes it required only while it applies.

**In Colophon:** a field can depend on a yes-or-no or choice field. Read more: [content modelling that checks your stored entries](/blog/content-modeling-in-colophon/).

<h3 id="content-type">Content type (collection)</h3>

The shape of one kind of content: an article, an author, a recipe, with its fields and rules. The entries of one type are often called a collection, and all your types together are the content model.

**In Colophon:** content types are versioned data, changed at runtime through the API or the Studio, and every change is checked against the entries already stored. Read more: [content modelling that checks your stored entries](/blog/content-modeling-in-colophon/).

## D

<h3 id="delivery-api">Delivery API and management API</h3>

Most headless CMSs have two APIs. The delivery API serves published content to websites and apps, usually without a credential and through a cache. The management API is for signed-in people and scripts: drafts, schemas, users, publishing.

**In Colophon:** the delivery API is public REST at `/content/v1` and reads published content only, as a database role that can't see drafts. Read more: [using Colophon as a headless CMS for Astro](/blog/astro-headless-cms/).

<h3 id="draft">Draft</h3>

The working version of an entry that readers can't see yet. Saving a draft changes nothing on the live site; publishing does.

**In Colophon:** every save writes a new revision, and a save is accepted only if it started from the current draft, so two editors can't silently overwrite each other. Read more: [what happens to your draft when the CMS crashes](/blog/cms-lost-edits/).

<h3 id="dry-run">Dry run</h3>

Running an import or a migration in a mode that reports what it would do, item by item, without writing anything. A dry run turns "I hope this works" into a list you can read.

**In Colophon:** schema migration plans and content imports both have one, with an outcome for every item. Read more: [content modelling that checks your stored entries](/blog/content-modeling-in-colophon/).

## E

<h3 id="environment">Environment</h3>

A separate copy of a project's content, such as production and staging, so changes can be tried without touching the live site.

**In Colophon:** each environment has its own release numbers. Most sites read `production`.

<h3 id="etag">ETag and If-Match</h3>

An `ETag` is a short fingerprint a server sends with a response. A client can send it back in `If-None-Match` to ask "has this changed?" and get a cheap `304 Not Modified` if not, or in `If-Match` to say "only apply my change if the thing is still this version", which is how optimistic locking works over HTTP.

**In Colophon:** delivery answers carry a strong `ETag`, and publishing a changeset sends its hash in `If-Match`. Read more: [what happens to your draft when the CMS crashes](/blog/cms-lost-edits/).

## F

<h3 id="field-level-permission">Field-level permission</h3>

A permission narrowed to particular fields: an editor may change an article's body but not its price. The hard part is not the rule but the leaks around it, such as search results, error messages and saves that wipe fields the editor can't see.

**In Colophon:** reading, creating and updating can each be limited to named fields, and to entries a person created. Read more: [field-level permissions](/blog/field-level-permissions/).

## G

<h3 id="generation">Generation</h3>

**In Colophon:** the API's name for a [release number](#release). The Studio and these posts say release; the API, its `?generation=` parameter and its `Colophon-Generation` header say generation. They are the same number.

<h3 id="graphql">GraphQL</h3>

A query language for APIs where the client asks for exactly the fields it needs in one request. Many CMSs offer it beside REST.

**In Colophon:** GraphQL is a read-only, per-collection endpoint on the signed-in API, and it reads drafts. Public delivery to websites is REST. Read more: [using Colophon as a headless CMS for Astro](/blog/astro-headless-cms/).

## H

<h3 id="headless-cms">Headless CMS</h3>

A content management system that stores and serves content through an API, and leaves rendering to your own site or app. The "head", the website, is yours to build in any framework.

Read more: [six publishing questions a CMS should answer](/blog/headless-cms-publishing-checklist/).

## I

<h3 id="idempotency-key">Idempotency key</h3>

A unique key a client sends with a request so that sending it again has no extra effect. If the answer to a save is lost and the client retries with the same key, the server replays the first result instead of saving twice. Webhook senders use the same idea so receivers can drop repeats.

**In Colophon:** every save, create and publish carries one, and website announcements are resent with the same key. Read more: [what happens to your draft when the CMS crashes](/blog/cms-lost-edits/).

<h3 id="isr">ISR</h3>

Incremental static regeneration, originally a Next.js feature: pages are built statically, then rebuilt in the background after a time window or on demand. It narrows the gap between publishing and readers seeing a change, and adds a cache of its own to debug.

Read more: [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

## L

<h3 id="live-preview">Live preview</h3>

Showing an editor how a draft will look on the real site before it is published, often updating as they type.

**In Colophon:** the Studio previews pages of its own website starter over the live draft. Headless sites have no draft preview yet. Read more: [using Colophon as a headless CMS for Astro](/blog/astro-headless-cms/).

<h3 id="locale">Locale</h3>

A language and region a piece of content is written for, such as `en-GB` or `fr`. CMSs differ on whether locales are fields of one entry or separate entries with their own history.

**In Colophon:** locale variants have their own slug, draft and publication history, grouped as one logical entry. The public delivery API can't select a locale yet. Read more: [content modelling that checks your stored entries](/blog/content-modeling-in-colophon/).

## M

<h3 id="mcp">MCP</h3>

The Model Context Protocol, a standard way for AI agents to discover and call tools in other systems. A CMS's MCP server decides what an agent can do in it, so the question is what its tools allow, and what the API behind them refuses.

**In Colophon:** the MCP server offers 18 tools to read, draft and propose; none approves or publishes. Read more: [giving AI agents CMS access without the publish button](/blog/ai-agents-cms-permissions/).

<h3 id="migration-plan">Migration plan</h3>

A planned change to stored content that a schema change needs, such as filling a newly required field on every existing entry, checked before it runs.

**In Colophon:** a plan checks every entry against the new definition, can fill or move values, takes corrected content for entries no rule can fix, is approved against its own hash, and resumes if the worker is killed. Read more: [content modelling that checks your stored entries](/blog/content-modeling-in-colophon/).

## O

<h3 id="optimistic-locking">Optimistic locking</h3>

A way to stop two people overwriting each other without locking the document while someone edits. Each save says which version it started from, and the server refuses it if that version is no longer current. The person then chooses what to keep.

**In Colophon:** a stale save is refused as a conflict that names the current revision. Read more: [what happens to your draft when the CMS crashes](/blog/cms-lost-edits/).

<h3 id="outbox">Outbox pattern</h3>

Writing "this message must be sent" into the database in the same transaction as the change, then sending it from a background worker. The message can't be lost if the process dies, and the change never waits on a slow network.

**In Colophon:** committing a release writes one job per website connection; a worker sends them under a lease. Read more: [six publishing questions a CMS should answer](/blog/headless-cms-publishing-checklist/).

## P

<h3 id="page-builder">Page builder (blocks)</h3>

A field that holds a list of blocks of different kinds, such as a hero, a quote and a gallery, which editors arrange in any order to build a page.

**In Colophon:** it is called Page sections, with up to 20 named kinds of block. Read more: [content modelling that checks your stored entries](/blog/content-modeling-in-colophon/).

<h3 id="publication-interval">Publication interval</h3>

The span during which one version of an entry was live, recorded as "from this point until that point". Keeping every interval, not only the latest, is what lets a system answer "what was live at a given moment" with a lookup instead of a reconstruction.

**In Colophon:** each entry keeps intervals over release numbers, from the release that published a revision up to the one that replaced it. Read more: [how to see what your website said on a past date](/blog/website-history-past-date/).

<h3 id="publish">Publish</h3>

Making a version of content available to readers. In most CMSs it changes the CMS's own state at once; what readers see depends on caches, builds and CDNs that update later.

Read more: [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

<h3 id="purge">Purge</h3>

Asking a cache, usually a CDN, to drop its copies so the next request fetches fresh ones. A purge can be by URL, by tag or of everything. A purge request that was accepted is not the same as copies being gone at every edge.

**In Colophon:** a cache clear purges by tag and covers every release since the last purge that worked. It is tested against a fake CDN; an adapter for a real CDN isn't built yet. Read more: [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

## R

<h3 id="rate-limit">Rate limit and budget</h3>

A rate limit caps how many requests a client may make in a time window; a budget caps how much work it may start in a day. Both keep one noisy client, a script or an agent, from crowding out everyone else.

**In Colophon:** a token's per-minute limit answers `429` with `Retry-After`, and its daily budgets are reserved in the database before work starts. Read more: [Colophon's load tests, with the caveats](/blog/load-testing-a-cms/).

<h3 id="receipt">Receipt</h3>

**In Colophon:** the record each release keeps of what reached your website. It has one label: Published in Colophon (nothing checks your site), Website update pending, Verified at N locations, or Needs attention, with what failed and what to do. Only a site check can verify a release, and it always says from how many places it looked. Read more: [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

<h3 id="reference">Reference</h3>

A field that points at another entry, such as an article's author. The risk is a dangling reference: a link to an entry that was deleted or never published.

**In Colophon:** references are checked by the database, and publishing refuses a release that would leave a published entry pointing at an unpublished one. Read more: [content modelling that checks your stored entries](/blog/content-modeling-in-colophon/).

<h3 id="release">Release</h3>

A set of content changes that goes live together. In many CMSs a release is an optional, often paid, feature for grouping entries.

**In Colophon:** every publish is a release, committed in one transaction and numbered: the number goes up by exactly one per release in an environment and never goes back. The API calls the number a [generation](#generation). Read more: [how to see what your website said on a past date](/blog/website-history-past-date/).

<h3 id="revision">Revision</h3>

One saved version of one entry. Version history is the list of an entry's revisions.

**In Colophon:** revisions are insert-only: an old one is never changed, and restoring it creates a new revision on top. Read more: [what happens to your draft when the CMS crashes](/blog/cms-lost-edits/).

<h3 id="rich-text">Rich text</h3>

Formatted text: headings, lists, links, emphasis. CMSs store it either as HTML or as structured JSON that your site renders. JSON is safer to render anywhere, since nothing executable can be stored.

**In Colophon:** rich text is stored as validated JSON (Tiptap's ProseMirror tree, restricted to an allowlist), never as HTML. Read more: [using Colophon as a headless CMS for Astro](/blog/astro-headless-cms/).

<h3 id="role">Role</h3>

A named set of permissions given to people, such as editor or publisher.

**In Colophon:** projects start with owner, developer, editor and publisher, and owners can define more. Nobody can create or grant a role with powers they don't hold themselves. Read more: [field-level permissions](/blog/field-level-permissions/).

<h3 id="rollback">Rollback</h3>

Undoing a bad publish by putting earlier content back. A rollback either rewrites history, as if the bad change never happened, or rolls forward with a new change that restores the old content.

**In Colophon:** rolling back builds an ordinary publish request from an older release; it is reviewed and lands as a new release. Content taken down since stays down. Read more: [rolling back a release as a reviewed change](/blog/roll-back-a-bad-publish/).

<h3 id="row-level-security">Row-level security</h3>

A database feature, in PostgreSQL among others, that filters which rows a query can see or change according to a policy, so the rule holds even if application code forgets it.

**In Colophon:** row-level security isolates projects, and decides which members-only content a site visitor may read. Read more: [field-level permissions](/blog/field-level-permissions/).

## S

<h3 id="scheduled-publishing">Scheduled publishing</h3>

Choosing a future time for a publish to happen on its own. The hard parts are clock changes, content edited after approval, and a server that is down at the scheduled moment.

**In Colophon:** a schedule stores a local time and an IANA time zone, asks for an explicit choice when a time happens twice or never, rechecks everything when it falls due, and labels a late run as delayed. Read more: [scheduled publishing that survives downtime](/blog/scheduled-publishing-pitfalls/).

<h3 id="single-type">Single type</h3>

A content type with exactly one entry, for things like site settings or a home page.

Read more: [content modelling that checks your stored entries](/blog/content-modeling-in-colophon/).

<h3 id="site-check">Site check</h3>

An automated look at the live website after a publish, to confirm what readers are actually served.

**In Colophon:** a site check reads a URL after each release and looks for the release number in a `Colophon-Generation` header or a `colophon-generation` meta tag. It is the only thing that can mark a release verified. Read more: [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

<h3 id="slug">Slug</h3>

The readable part of a URL that names an entry, such as `hello-world` in `/blog/hello-world/`.

**In Colophon:** a URL name field holds lowercase letters, digits and hyphens, and is unique within its collection. Read more: [content modelling that checks your stored entries](/blog/content-modeling-in-colophon/).

<h3 id="ssg-and-ssr">SSG and SSR</h3>

Static site generation builds every page ahead of time, so new content needs a rebuild. Server-side rendering builds a page on each request, so it is always current but each visit costs work. Many sites mix both.

Read more: [using Colophon as a headless CMS for Astro](/blog/astro-headless-cms/).

<h3 id="stale-while-revalidate">Stale-while-revalidate</h3>

A cache setting ([RFC 5861](https://www.rfc-editor.org/rfc/rfc5861)) that lets a cache serve an expired copy once more while it fetches a fresh one in the background. Pages stay fast; the first reader after a change can still get the old version.

Read more: [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

## T

<h3 id="tombstone">Tombstone</h3>

A record that something was deleted or taken down, kept instead of erasing every trace. A tombstone lets a system answer "gone" rather than "never existed", and stops old copies from coming back.

**In Colophon:** unpublishing leaves a tombstone, and the delivery API then answers `410 Gone` for that entry at every release number, old ones included. Read more: [how to see what your website said on a past date](/blog/website-history-past-date/).

<h3 id="ttl">TTL</h3>

Time to live: how long a cache may keep a copy before it must fetch a fresh one. On the web it usually comes from `Cache-Control`: `max-age` sets freshness for every cache, and `s-maxage` overrides it for shared caches such as CDNs.

Read more: [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

## U

<h3 id="unpublish">Unpublish</h3>

Taking published content down so readers can no longer get it. Copies already in CDNs, browsers, feeds and archives are a separate problem.

**In Colophon:** an unpublish is a reviewed change and a release of its own, and a rollback never brings it back. Read more: [rolling back a release as a reviewed change](/blog/roll-back-a-bad-publish/).

## W

<h3 id="webhook">Webhook</h3>

An HTTP request a system sends to a URL you choose when something happens, such as "content was published", most often used to start a site rebuild. Webhooks can arrive late, twice or not at all, so receivers should drop repeats and tolerate gaps.

**In Colophon:** a site rebuild sends `release.committed` after each release, with an `Idempotency-Key` that stays the same on every resend, and retries failures with backoff, at most five attempts within an hour. Payloads aren't signed yet. Read more: [using Colophon as a headless CMS for Astro](/blog/astro-headless-cms/).
