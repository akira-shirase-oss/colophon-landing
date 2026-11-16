---
title: "Colophon vs Strapi: an honest comparison"
description: "Strapi is mature, popular and easy to install. Colophon is pre-release. Here is where each stands on history, releases, review, permissions and publish proof."
pubDate: 2026-11-16
tags: ["comparison", "strapi", "headless cms", "open source"]
draft: false
---

I'm building Colophon, so I'm not a neutral judge of it. I'll try to be useful anyway: Strapi facts come from Strapi's own docs and pricing pages, checked on 16 November 2026 and linked below, and Colophon facts come from its repository. Where Strapi is ahead, which is often, I say so.

## The short answer

If you need a headless CMS for a real site today, choose Strapi over Colophon. Strapi 5 is mature, has a large community and plugin marketplace, installs in about 75 seconds with only Node, and has a managed cloud. Colophon is pre-release (0.1.0-alpha.1), has no users yet, and isn't published to npm or any package registry.

Colophon is worth watching if your questions are about proof: what exactly went live, whether readers can see it yet, whether a rollback was reviewed, and what an AI agent is allowed to do. It's built around those questions, and that's where it differs most from Strapi.

## At a glance

| | Strapi 5 | Colophon |
|---|---|---|
| Status | Stable; v5.62.0 released 12 November 2026 | Pre-release, 0.1.0-alpha, no users |
| Licence | MIT, with enterprise code under a separate licence | MIT; the licence file isn't in the repository yet |
| Stack | Node.js, TypeScript; React admin | Rust server; Svelte Studio |
| Databases | PostgreSQL, MySQL, MariaDB, SQLite | PostgreSQL only |
| Hosting | Self-hosted, or Strapi Cloud | Self-hosted only, built from source |
| Version history | Growth and Enterprise plans; edits made in the admin only | Every save from every path, kept |
| Grouped releases | Growth and Enterprise; latest drafts, not pinned versions | Every publish; pinned exact revisions |
| Review workflows | Enterprise | Built in; approval bound to exact content |
| Publish confirmation | Not built in | Delivery receipts with site checks |
| Audit logs | Enterprise | Roles, members and tokens, append-only |
| MCP server | Built in, free | Built in; agents can't approve or publish |

## Where Strapi is ahead

Being plain about this matters more than the table.

- **Maturity and ecosystem.** Strapi has years of production use, around 73,500 [GitHub stars](https://github.com/strapi/strapi), a plugin marketplace, and answers for most problems a search away. Colophon has none of that yet.
- **Installation.** `npx create-strapi@latest` and you're running. In a hands-on test I did on 28 October 2026 (Strapi 5.60.0 Community, SQLite, development mode), install took about 75 seconds with only Node; the write-up is in Colophon's repository under `docs/research/`. Colophon needs Docker for PostgreSQL, Valkey and an S3-compatible store, plus a Rust toolchain and Node to build the server and the Studio.
- **Hosting choices.** Strapi runs on several databases and has [Strapi Cloud](https://strapi.io/pricing-cloud). Colophon is PostgreSQL only, and there's no hosted version.
- **Editor features Colophon doesn't have yet.** Strapi has [preview](https://docs.strapi.io/cms/features/preview), with Live Preview on paid plans; Colophon has no draft preview for editors yet. Strapi's [internationalization](https://docs.strapi.io/cms/features/internationalization) is built in and free, through to the API; Colophon stores locales and localized entries, but its public delivery API can't select a locale yet. Strapi's [media library](https://docs.strapi.io/cms/features/media-library) is mature; Colophon's media fields work, but images inside rich text are still placeholders.
- **A licence you can rely on today.** Strapi's licence is in its repository. Colophon will be MIT-licensed, but the licence file isn't committed yet, so until it lands the code carries no licence grant.

## Content modeling

Both cover the usual shapes. Strapi has components, dynamic zones and single types; Colophon has objects, lists, page-builder blocks, shared components and single types, plus references the database won't let dangle.

The difference is where the schema lives. Strapi's [Content-Type Builder](https://docs.strapi.io/cms/features/content-type-builder) is "available in Development environment only": schema changes are files in your project that reach production as a code deploy. In my hands-on test, saving a content type restarted the development server, about 5 seconds each time.

Colophon keeps content types as versioned data in PostgreSQL, changed at runtime through the same API as everything else, and checks every change against the entries already stored. A change that would break stored content is refused with the entries it would break, or planned as a migration with a dry run over every stored entry. More in [content modeling that checks your stored entries](/blog/content-modeling-in-colophon/).

## History, releases and rollback

This is the biggest gap between the two.

Strapi's [Content History](https://docs.strapi.io/cms/features/content-history) is on the Growth and Enterprise plans, kept 14 days on Growth and up to 90 on Enterprise. In Strapi's words, "A version is only created when a document is modified through the Content Manager in the admin panel." Changes made through the REST API, GraphQL or the Document Service aren't versioned. Restoring a version replaces the current draft.

Strapi's [Releases](https://docs.strapi.io/cms/features/releases), also Growth and Enterprise, group entries to publish together, optionally on a schedule. A release publishes "the latest saved version of the draft", and the docs say "A release cannot be pinned to a specific version of an entry." Once published, it "cannot be edited or published again."

In Colophon every publish is a release. A publish request pins exact revisions, an approval counts only for a hash of them, and publishing commits one numbered release in one transaction. Every save from the Studio, the CLI or the API is an insert-only revision, and retention never deletes revisions. Each entry's publication history means you can read the site as it was at any past release with `?generation=N` (content taken down since stays down). Rollback builds a reviewed publish request that becomes a new release. More in [what was live on your site last Tuesday?](/blog/what-was-live-last-tuesday/) and [rollback is a change too](/blog/rollback-is-a-change-too/).

## Review and approvals

Strapi's [Review Workflows](https://docs.strapi.io/cms/features/review-workflows) are Enterprise only, with stages, per-stage permissions and assignees. Without an Enterprise plan, review is a convention, not a rule.

Colophon's review is part of the free core. Editors ask for review; publishers and owners approve. Review stages exist too. An approval is tied to the exact content approved and expires after seven days. Self-review is allowed by default and shown with a visible badge, for teams of one.

## Proving the publish reached readers

Strapi tells you the entry is published in Strapi. Whether your CDN or static site picked it up is yours to work out, Strapi's [webhooks](https://docs.strapi.io/cms/backend-customization/webhooks) can carry auth headers you configure, but they don't sign payloads themselves; the docs recommend you add HMAC signing yourself.

Colophon gives each release a receipt: published in Colophon, website update pending, verified at N locations, or needs attention with the reason. Verification comes only from a site check that read the release's marker on the live site. Colophon's webhooks aren't signed yet either, and its CDN purge is tested against a fake CDN; a real CDN adapter isn't built. Details: ["Published" should mean readers can see it](/blog/published-means-readers-can-see-it/).

## Permissions and audit

Both are strong here. Strapi's [RBAC](https://docs.strapi.io/cms/features/rbac) is a free feature with custom roles, per-field and per-locale permissions, and conditions such as "the administrator must be the creator". Its [audit logs](https://docs.strapi.io/cms/features/audit-logs) require Enterprise.

Colophon's roles are data with the same kind of reach: per-field permissions and "own entries" conditions. Its audit log is in the free core but narrower: it records changes to roles, members, invitations and tokens, not every content edit. Content edits are attributed through revision history instead. More in [field-level permissions](/blog/field-level-permissions/).

## AI agents

Strapi has a [built-in MCP server](https://docs.strapi.io/cms/features/strapi-mcp-server), free, scoped by an admin token's permissions. Strapi AI features are paid add-ons; the schema assistant is on Strapi AI Growth.

Colophon's MCP server is built in too, and scoped by an API token. The difference is a rule the server enforces: no MCP tool approves or publishes, and the API refuses any API token's approval of something an API token submitted. Details: [give AI agents CMS access, not the publish button](/blog/ai-agents-without-the-publish-button/).

## Moving between them

Colophon's import reads Strapi v4 and v5 exports, with a dry run that reports an outcome for every item before anything is written. I haven't tested a real production Strapi site's export, so treat it as a starting point.

## Where it stands

Colophon is pre-release and built by one person in public. If you try it, read the [status section](/#pricing) first for what's done; the sections above say what isn't. Progress, including what broke, is in the build log at [404human.dev/colophon](https://404human.dev/colophon/). If anything about Strapi here is wrong or out of date, tell me and I'll correct it.
