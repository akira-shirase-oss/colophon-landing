---
title: "Colophon vs Directus: an honest comparison"
description: "Colophon and Directus compared on publish receipts, release history, review, scheduling, permissions, licensing and AI agents, with dated sources."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["comparison", "directus", "headless cms", "self-hosted"]
status: "Not built yet for this comparison: a Directus importer, and an adapter for a real CDN."
draft: false
---

I build Colophon, so read this with that in mind. The Directus facts below come from Directus's own docs, licence and site, checked on 16 November 2026 and listed under Sources at the end. The Colophon facts come from its repository, and each one is built and tested there. If anything about Directus here is wrong or out of date, tell me and I'll correct it.

## The short answer

Directus and Colophon solve different problems. Directus is a data platform: point it at a SQL database and you get APIs, a no-code data studio, permissions and automation over your own tables. Colophon is a CMS for publishing a website, organised around numbered releases and evidence of what reached the live site.

If your job is publishing a website and your question is "what exactly did we publish, and did it reach readers?", Colophon is the better fit, for these reasons:

- **Every publish leaves a receipt.** Each publish is a numbered [release](/blog/headless-cms-glossary/#release), and its receipt says whether it's only in the CMS, on its way to your site, verified at a stated number of locations by a check of the live page, or in need of attention.
- **Review, scheduling and rollback are built in and connected**, not assembled from a status field and automation flows. An approval covers the exact content approved; a schedule rechecks it when due; a rollback is a new, reviewed release.
- **Whole-site history.** You can read the whole site as it was at any past release.
- **Drafts that survive crashes and collisions**, and **field-level permissions** with PostgreSQL enforcing project isolation, all without a licence key.
- **AI agents that can draft but never approve their own work**, under budgets and rate limits.
- **No user code running in the server**, so a smaller attack surface.
- **MIT-licensed**, where Directus uses its own source-available licence.
- **Measured behaviour**: stored load results, failures included, labelled as laptop numbers.

The honest cost: Colophon is pre-release, and [what to know before choosing Colophon](#what-to-know-before-choosing-colophon) spells out what that means.

If you're weighing a hosted service instead, [Colophon vs Contentful](/compare/colophon-vs-contentful/) compares self-hosting with SaaS.

## At a glance

Directus facts checked on 16 November 2026.

| | Colophon | Directus 12 |
|---|---|---|
| Status | Pre-release, 0.1.0-alpha.1, no users | Stable; v12.6.1 released 4 November 2026 |
| Licence | MIT | Monospace Sustainable Core License (MSCL) |
| Stack | Rust server; Svelte Studio | Node.js API; Vue data studio |
| Databases | PostgreSQL only | PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, Oracle, CockroachDB |
| Existing database | Owns its own schema | Introspects existing tables |
| Hosting | Self-hosted only, built from source | Self-hosted, or Directus Cloud |
| History | Every save, plus whole-site history by release | Per-item revisions and content versions |
| Scheduling | Built in, with time zones and rechecks | Built with a Flow on a cron trigger |
| Approvals | Built in; approval bound to exact content | Built from a status field and permissions |
| Publish confirmation | Delivery receipts with site checks | Build status for Vercel and Netlify deploys; no live-site check |
| Draft preview | Website-starter pages only; for headless sites on the roadmap | Visual editor and live preview |
| Translations | Locales stored and published; the public API can't select one yet | Built in |
| MCP | Built in; agents can't approve or publish | Built in, turned on in settings |

## Every publish leaves a receipt

After a Colophon release commits, its worker announces it to your site's rebuild webhook, retries under a lease with backoff, and sends a stable [idempotency key](/blog/headless-cms-glossary/#idempotency-key) so your site can drop repeats. It can ask your CDN to drop the copies that changed, and a site check can read your live page for the release it was built from. Only that check marks a release verified, at a stated number of locations. This matters because a finished build isn't the same as readers seeing the change: a CDN can keep serving the old copy. [Why your site shows old content after publishing](/blog/website-not-updating-after-publish/) goes through each layer and how to check it.

Directus can call your site from a Flow's "Webhook / Request URL" step, where you set the method, headers and body, or trigger and watch Vercel and Netlify builds from its Deployment module, which reports each deploy's status as the provider sends it. That tells you the build finished; it doesn't check what the live site serves. Signing and retries for Flow requests aren't documented as built in.

## Release history, rollback and drafts

Colophon keeps every save as an insert-only revision, accepted only if it started from the current draft, so two editors can't overwrite each other silently and a retried save can't land twice ([how that works](/blog/cms-lost-edits/)). Every publish is a numbered release of exact revisions, committed in one transaction, and each entry keeps a history of which revision was live from which release to which. That lets you read the whole site as it was at any past release, which is the question audits and complaints usually ask: [how to see what your website said on a past date](/blog/website-history-past-date/). A rollback builds a reviewed request that lands as a new release, and content taken down since stays down ([how to roll back a bad publish](/blog/roll-back-a-bad-publish/)).

Directus's content versioning works per item: a draft version you edit while the published item stays live, then a field-by-field comparison to promote it. Revisions record each change and can be restored.

## Review and scheduling

In Colophon, a publish request pins exact revisions. An approval counts only for a hash of them and expires after seven days, so an edit made after approval needs approving again; named review stages are built in. A schedule stores a local time and time zone, asks for an explicit choice at daylight-saving edges, rechecks the approval and content when it falls due, and labels a late run as delayed. These pieces share one rule, so nothing has to be wired together. Details: [four ways scheduled publishing goes wrong](/blog/scheduled-publishing-pitfalls/).

In Directus, approvals are something you build. Directus's own tutorial uses a status field and per-role permissions, and custom permission rules need a licence key in Directus 12. Scheduled publishing is a Flow with a "Schedule (CRON)" trigger. That's flexible, and it's also logic you maintain.

## Licensing

Colophon is MIT-licensed. The licence covers the server, the CLI, the SDK and every app in the repository, and no feature in this post sits behind a licence key or a paid tier.

Directus 12 uses its own licence, the Monospace Sustainable Core License. It permits any use except a "Competing Use", meaning offering the software in competition with Directus's own paid offerings, and forbids bypassing its licence-key checks; each version becomes available under GPL-3.0 "on the fourth anniversary" of its release. Since Directus 12, "self-hosted instances run on the Core tier by default", and features such as SSO and custom rules on access policies need a licence key. Directus's licensing overview describes free use through its Open Innovation Grant for organisations with "less than $5M in annual revenue and fewer than 50 employees". Read the terms for your own situation; I'm not giving legal advice.

## Permissions

Colophon's roles are data, narrowed per field and to entries a person created, with one policy check that every path goes through. A few rules are enforced by PostgreSQL itself: projects isolated by [row-level security](/blog/headless-cms-glossary/#row-level-security), a public delivery role that can't read drafts, an owner role that database triggers won't let anyone change, and an append-only audit log of changes to roles, members, invitations and tokens. Details: [field-level permissions](/blog/field-level-permissions/).

Directus is strong here too. Its access control attaches policies to roles or users, with permissions per collection and action, per field, and per item through filter rules, plus options such as IP allowlists per policy. Item-level filters are more general than anything Colophon has; in Directus 12, those custom permission rules need a licence key.

## Your data model

Colophon owns its schema. Content types are versioned definitions in PostgreSQL, changed at runtime, and every change is checked against the entries already stored: a change that would break stored content is refused with the entries in the way, or turned into a migration plan with a dry run. Details: [content modelling that checks your stored entries](/blog/content-modeling-in-colophon/).

Directus works the other way round. "When Directus is connected to an existing database, it will introspect existing tables and relationships", and its collections "are database tables with additional metadata". Colophon can't sit on top of an existing database.

## AI agents

Colophon's MCP server lets an agent read, draft, propose a publish request and ask for review. No tool approves or publishes, and the API refuses any API token's approval of something an API token submitted. Tokens carry ceilings, such as documents per day and requests per minute, and a stored evaluation run against the real API recorded zero unauthorized actions. Details: [give AI agents CMS access, not the publish button](/blog/ai-agents-cms-permissions/).

Directus has a built-in MCP server, turned on in Settings, that "operates through your existing Directus permissions", from v11.12.

## What runs inside the server

Colophon deliberately runs no user code in the server: no plugins, hooks or validator functions. Rules are declared as data, and integrations go through the API, webhooks and the MCP server. Less code running with the server's rights means a smaller attack surface; the cost is that you can't extend Colophon from inside.

Directus has an extension system with a marketplace, and Flows for automation, along with realtime APIs over WebSockets. If you build on those, it's a real difference.

## Running it yourself

Colophon is one Rust binary that runs as the API, the background worker or both, beside PostgreSQL, a Valkey cache that can be lost without losing data, and S3-compatible storage for uploads. Operators get honest health checks, structured logs, encrypted backups with WAL archiving and a restore procedure rehearsed on clean infrastructure. Today you build it from source.

Directus runs self-hosted on any of seven SQL databases, or on Directus Cloud.

## Performance you can check

Every Colophon load run stores its machine, commit, counts and verdict, failures included. For example, 540,063 anonymous reads over 30 minutes at 300 a second finished with 0 failures and a p95 of 6.4 ms, and a server killed behind a load balancer mid-run lost none of its 6,001 acknowledged writes. All of it ran on one laptop, so it shows how the code behaves, not what a production install can carry. [Load-testing a CMS](/blog/load-testing-a-cms/) has the method and the caveats. I haven't run the same tests against Directus, so this isn't a comparison of speed.

## Moving from Directus

There's no Directus importer. Colophon imports JSONL and JSON arrays, plus Strapi and Sanity exports, with a dry run that reports an outcome for every item before anything is written. Moving means exporting your items to JSON and recreating the content types first.

## What to know before choosing Colophon

- **It's pre-release.** Version 0.1.0-alpha.1, built in public by one person, with no users yet. The [public roadmap](https://github.com/akira-shirase-oss/colophon-cms/blob/main/docs/ROADMAP.md) says what's done and what's planned.
- **PostgreSQL only, self-hosted only.** There's no hosted version, and today you build it from source: no container image, published binaries or npm packages yet.
- **Two delivery pieces are partial.** Webhook payloads aren't signed yet, and cache clears are tested against a stand-in CDN; the adapter for a real CDN is on the roadmap.
- **[On the roadmap](https://github.com/akira-shirase-oss/colophon-cms/blob/main/docs/ROADMAP.md):** draft preview for headless sites (the Studio already previews pages of its own website starter), choosing a locale in the public content API, and images inside rich text (the editor inserts a placeholder for now).
- **The 24-hour soak hasn't passed yet.**

To try it, the docs' [quick start](https://docs.colophon.404human.dev/quick-start/) runs Colophon with Docker, and [installation](https://docs.colophon.404human.dev/installation/) covers serving it on a domain or under systemd.

## Who it isn't for

If you need an admin and API over an existing SQL database, or a back office as much as a CMS, Directus is built for that and Colophon isn't. Colophon fits a team publishing a website that wants a record of every publish and a check of what reached the live site.

The [Strapi](/blog/colophon-vs-strapi/) and [Payload](/blog/colophon-vs-payload/) comparisons use the same template, and [six publishing tests to run on any headless CMS](/blog/headless-cms-publishing-checklist/) lists the questions behind all three.

## Sources

Checked on 16 November 2026:

- Directus: [data model and collections](https://directus.com/docs/guides/data-model/collections), [content versioning](https://directus.com/docs/guides/content/content-versioning), [content approval tutorial](https://directus.com/docs/tutorials/workflows/build-content-approval-workflows-with-custom-permissions), [Flow triggers](https://directus.com/docs/guides/flows/triggers), [Flow operations](https://directus.com/docs/guides/flows/operations), [Deployment module](https://directus.com/docs/guides/deployments), [access control](https://directus.com/docs/guides/auth/access-control), [MCP](https://directus.com/docs/guides/ai/mcp), [visual editor](https://directus.com/docs/guides/content/visual-editor), [live preview](https://directus.com/docs/guides/content/live-preview), [translations](https://directus.com/docs/guides/content/translations), [extensions](https://directus.com/docs/guides/extensions/overview), the [licence](https://github.com/directus/directus/blob/main/license), the [licensing overview](https://directus.com/docs/licensing/overview), [Directus 12 breaking changes](https://directus.com/docs/releases/breaking-changes/version-12), [pricing](https://directus.com/pricing) and the [GitHub repository](https://github.com/directus/directus).
- Colophon: the [repository](https://github.com/akira-shirase-oss/colophon-cms), its [changelog's known limitations](https://github.com/akira-shirase-oss/colophon-cms/blob/main/CHANGELOG.md#known-limitations) and its [licence](https://github.com/akira-shirase-oss/colophon-cms/blob/main/LICENSE).

If anything about Directus here is wrong or out of date, tell me and I'll correct it.
