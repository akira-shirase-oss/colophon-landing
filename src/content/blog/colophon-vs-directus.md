---
title: "Colophon vs Directus: an honest comparison"
description: "Directus turns any SQL database into an API and a data studio. Colophon is a pre-release CMS built around numbered releases and publish proof. How they compare."
pubDate: 2026-11-16
tags: ["comparison", "directus", "headless cms", "self-hosted"]
draft: false
---

I'm building Colophon, so I'm not neutral. Directus facts here come from Directus's own docs, licence and site, checked on 16 November 2026 and linked below; Colophon facts come from its repository. Where Directus is ahead, I say so.

## The short answer

Directus and Colophon solve different problems. Directus is a data platform: point it at a SQL database, new or existing, and you get REST and GraphQL APIs, a no-code data studio, permissions and automation over your own tables. Colophon is a CMS for publishing a website, organised around numbered releases and evidence of what readers saw.

If you need an admin and API over an existing database, or a back office as much as a CMS, Directus does things Colophon never will. If your main question is "what exactly did we publish, and did it reach the site?", Colophon is built for that, but it's pre-release (0.1.0-alpha.1), has no users, and isn't published to any package registry yet.

## At a glance

| | Directus 12 | Colophon |
|---|---|---|
| Status | Stable; v12.6.1 released 4 November 2026 | Pre-release, 0.1.0-alpha, no users |
| Licence | Monospace Sustainable Core License (MSCL) | MIT; the licence file isn't in the repository yet |
| Stack | Node.js API; Vue data studio | Rust server; Svelte Studio |
| Databases | PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, Oracle, CockroachDB | PostgreSQL only |
| Existing database | Introspects existing tables | Owns its own schema |
| Hosting | Self-hosted, or Directus Cloud | Self-hosted only, built from source |
| History | Per-item revisions and content versions | Every save, plus whole-site history by release |
| Scheduling | Built with a Flow on a cron trigger | Built in, with time zones and rechecks |
| Approvals | Built from a status field and permissions | Built in; approval bound to exact content |
| Publish confirmation | Build status for Vercel and Netlify deploys; no live-site check | Delivery receipts with site checks |
| MCP | Built in, turned on in settings | Built in; agents can't approve or publish |

## Where Directus is ahead

- **Your database, your tables.** "When Directus is connected to an existing database, it will introspect existing tables and relationships", and its collections "are database tables with additional metadata" ([data model docs](https://directus.com/docs/guides/data-model/collections)). Colophon stores content in its own schema; it can't sit on top of an existing database.
- **Breadth.** Directus has realtime APIs over WebSockets, a [visual editor](https://directus.com/docs/guides/content/visual-editor) and [live preview](https://directus.com/docs/guides/content/live-preview), [translations](https://directus.com/docs/guides/content/translations), an [extension system](https://directus.com/docs/guides/extensions/overview) with a marketplace, and [Flows](https://directus.com/docs/guides/flows/operations) for automation. Colophon has no draft preview yet, its public API can't select a locale yet, and it deliberately runs no user code in the server.
- **Database choice.** Seven SQL databases against Colophon's one.
- **Maturity and hosting.** Directus has years of production use, around 38,700 [GitHub stars](https://github.com/directus/directus) and [Directus Cloud](https://directus.com/pricing). Colophon has no users and no hosted version.

## Licensing, read carefully

Directus 12 uses its own licence, the [Monospace Sustainable Core License](https://github.com/directus/directus/blob/main/license). It permits any use except a "Competing Use", meaning offering the software in competition with Directus's own paid offerings, and forbids bypassing its licence-key checks; each version becomes available under GPL-3.0 "on the fourth anniversary" of its release. Since Directus 12, "self-hosted instances run on the Core tier by default", and features such as SSO and custom rules on access policies need a licence key ([Directus 12 breaking changes](https://directus.com/docs/releases/breaking-changes/version-12)). Directus's [licensing overview](https://directus.com/docs/licensing/overview) describes free use through its Open Innovation Grant for organisations with "less than $5M in annual revenue and fewer than 50 employees". Read the terms for your own situation; I'm not giving legal advice.

Colophon will be MIT-licensed, a decision made on 16 November 2026. The licence file isn't committed yet and will be before any release; until it lands, the code carries no licence grant.

## Permissions

Both are strong. Directus's [access control](https://directus.com/docs/guides/auth/access-control) attaches policies to roles or users, with permissions per collection and action, per field, and per item through filter rules, plus options such as IP allowlists per policy. Item-level filters are more general than anything Colophon has; in Directus 12 those custom permission rules need a licence key.

Colophon's roles are data too, narrowed per field and to entries a person created, with one policy check that every path goes through. A few rules are enforced by PostgreSQL itself: projects isolated by row-level security, a public delivery role that can't read drafts, an owner role triggers won't let anyone change, and an append-only audit log. Details: [field-level permissions](/blog/field-level-permissions/).

## Versions, review and scheduling

Directus's [content versioning](https://directus.com/docs/guides/content/content-versioning) works per item: a draft version you edit while the published item stays live, then a field-by-field comparison to promote it. Revisions record each change and can be restored. Approvals are something you build: Directus's own [tutorial](https://directus.com/docs/tutorials/workflows/build-content-approval-workflows-with-custom-permissions) uses a status field and per-role permissions (custom permission rules need a licence key in Directus 12). Scheduled publishing is a Flow with a "Schedule (CRON)" [trigger](https://directus.com/docs/guides/flows/triggers). That's flexible, and it's also logic you maintain.

In Colophon these are built in and connected. A publish request pins exact revisions; an approval counts only for a hash of them and expires after seven days. Publishing commits one numbered release in one transaction, so you can read the whole site as it was at any past release (content taken down since stays down). Scheduling stores a local time and time zone, asks for an explicit choice at daylight-saving edges, rechecks the approval and content when it falls due, and labels a late run as delayed. Rollback is a reviewed request that lands as a new release. Details: [what was live on your site last Tuesday?](/blog/what-was-live-last-tuesday/) and [scheduled publishing that survives downtime](/blog/scheduled-publishing-that-survives-downtime/).

## Telling your site, and knowing it worked

Directus can call your site from a Flow's "Webhook / Request URL" step, where you set the method, headers and body, or trigger and watch Vercel and Netlify builds from its [Deployment module](https://directus.com/docs/guides/deployments), which reports each deploy's status as the provider sends it. That tells you the build finished; it doesn't check what the live site serves. Signing and retries for Flow requests aren't documented as built in.

Colophon's worker announces every release after the commit, retries under a lease with backoff, and sends a stable idempotency key so your site can drop repeats. Each release then carries a receipt, and only a site check that saw the release's marker on the live site marks it verified, at a stated number of locations. Colophon's payloads aren't signed yet, and there's no real CDN adapter yet. Details: ["Published" should mean readers can see it](/blog/published-means-readers-can-see-it/).

## AI agents

Directus has a built-in [MCP server](https://directus.com/docs/guides/ai/mcp), turned on in Settings, that "operates through your existing Directus permissions", from v11.12. Colophon's is built in too, with a server-side rule on top of permissions: no MCP tool approves or publishes, and the API refuses an API token's approval of anything an API token submitted. Details: [give AI agents CMS access, not the publish button](/blog/ai-agents-without-the-publish-button/).

## Where it stands

Colophon is pre-release and built by one person in public. The [status section](/#pricing) on the home page lists what's done, and the [Strapi](/blog/colophon-vs-strapi/) and [Payload](/blog/colophon-vs-payload/) comparisons cover the other two common open-source choices. If anything about Directus here is wrong or out of date, tell me and I'll correct it. The build log is at [404human.dev/colophon](https://404human.dev/colophon/).
