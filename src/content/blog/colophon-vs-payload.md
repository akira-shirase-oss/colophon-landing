---
title: "Colophon vs Payload CMS: an honest comparison"
description: "Colophon and Payload compared: schema as data or code, publish receipts, whole-site history, review, permissions and AI agents, with dated sources."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["comparison", "payload", "headless cms", "open source"]
status: "Not built yet for this comparison: a Payload importer and a published TypeScript SDK."
draft: false
---

I build Colophon, so read this with that in mind. The Payload facts below come from Payload's own docs and site, checked on 16 November 2026 and listed under Sources at the end. The Colophon facts come from its repository, and each one is built and tested there. If anything about Payload here is wrong or out of date, tell me and I'll correct it.

## The short answer

Payload and Colophon start from different places. Payload is a code-first TypeScript CMS that installs into a Next.js app. Colophon is a separate server with a Rust core, where content types are data you change at runtime and every publish is designed to be proven.

Colophon is for teams who want their CMS to be a service of its own, shaped by the people who run the content, and who need evidence of what went live. For them, it's the better fit:

- **Every publish leaves a receipt.** Each publish is a numbered [release](/blog/headless-cms-glossary/#release), announced to your site after it commits, with a receipt that says whether it's only in the CMS, on its way, verified at a stated number of locations by a check of the live page, or in need of attention.
- **Whole-site history, and rollback as a reviewed release.** You can read the whole site as it was at any past release, not only one document's versions.
- **Review in the core.** An approval counts only for the exact revisions it was given on, and expires after seven days.
- **Scheduling that runs in the worker you already run**, rechecks everything when due and says when it ran late.
- **Drafts that survive crashes and collisions**, and **permissions that every path goes through**, with no in-process route that skips them.
- **AI agents that can draft but never approve their own work**, under budgets and rate limits.
- **No user code running in the server**, so a smaller attack surface.
- **Measured behaviour**: stored load results, failures included, labelled as laptop numbers.

Both are MIT-licensed. The honest cost: Colophon is pre-release, and [what to know before choosing Colophon](#what-to-know-before-choosing-colophon) spells out what that means.

## At a glance

Payload facts checked on 16 November 2026.

| | Colophon | Payload 3 |
|---|---|---|
| Status | Pre-release, 0.1.0-alpha.1, no users | Stable; v3.93.0 released 4 November 2026; v4 in beta |
| Licence | MIT | MIT |
| Stack | Rust server; Svelte Studio | TypeScript; React admin on the Next.js App Router |
| Databases | PostgreSQL only | MongoDB, PostgreSQL, SQLite |
| Schema | Versioned data in PostgreSQL, changed at runtime | Code, in your Payload config |
| Access control | Roles as data, per field and own entries | Functions you write, per collection, global and field |
| Version history | Every save, plus whole-site history by release | Per document, in the open-source core |
| Scheduling | Built in; runs in the worker | Built in; needs a job runner |
| Outbound webhooks | Built in; payloads not signed yet | Write your own in hooks |
| Publish confirmation | Delivery receipts with site checks | Not built in |
| Draft preview | Website-starter pages only; for headless sites on the roadmap | Live preview |
| Localization | Locales stored and published; the public API can't select one yet | Per field, with fallbacks |
| MCP | Built in; agents can't approve or publish | Official plugin |

## Every publish leaves a receipt

After a Colophon release commits, its worker announces it to your site's rebuild webhook, retries with backoff under a lease, and sends a stable [idempotency key](/blog/headless-cms-glossary/#idempotency-key) so your site can drop repeats. It can also ask your CDN to drop the copies that changed, and run a site check that reads your live page for the release it was built from. The receipt then carries one label: Published in Colophon, Website update pending, Verified at N locations, or Needs attention with the reason. That matters because a CMS saying "published" only proves its own database changed; [why your site shows old content after publishing](/blog/website-not-updating-after-publish/) walks through every layer that can still serve the old copy.

Payload has no built-in outbound webhooks: you call your site from hooks such as `afterChange`, or from the jobs queue, and retries and signing are yours to write. That's flexible, and it's also code you own and test.

## Release history, rollback and drafts

Colophon keeps every save, from the Studio, the CLI or the API, as an insert-only revision that retention never deletes. A save must start from the current draft, so a colleague's newer work can't be overwritten silently, and a retried save can't land twice ([how that works](/blog/cms-lost-edits/)). Above the documents, every publish is a numbered release of exact revisions, approved against a hash of them and committed in one transaction. Each entry's publication history means you can read the whole site as it was at any past release ([seeing what your website said on a past date](/blog/website-history-past-date/)), and a rollback builds a reviewed request that lands as a new release ([how to roll back a bad publish](/blog/roll-back-a-bad-publish/)). Content taken down since stays down.

Payload's versions are in the open-source core and opt-in per collection in Payload 3. Once enabled, each save keeps "a _full_ copy of the document", up to 100 per document by default, and the admin can restore an older one. Drafts and autosave are built in. History in Payload is per document; there's no release that names what the whole site showed at once.

## Review and approvals

Colophon's review is part of the free core. Editors ask for review; publishers and owners approve. An approval is bound to the exact content, so a late edit needs a new approval, and it expires after seven days. Named review stages exist, and self-review is allowed by default with a visible badge, for teams of one. The same rule covers schedules, rollbacks and agents.

Payload lists Publishing Workflows, its approval feature, under Enterprise features on its enterprise page.

## Scheduled publishing

A Colophon schedule stores a local time and an IANA time zone, and asks for an explicit choice when a daylight-saving change makes that time happen twice or not at all. It's a row in PostgreSQL that the worker picks up, so downtime at the scheduled moment delays it rather than losing it, and the release is labelled as published late. When it falls due, the approval, the content and the author's role are all checked again. Details: [four ways scheduled publishing goes wrong](/blog/scheduled-publishing-pitfalls/).

Payload's scheduled publishing creates a background job. Without a job runner, the docs warn, "your scheduled publish / unpublish jobs will never be executed."

## Schema as data or schema as code

This is the real design difference, and the right choice depends on who changes your content model. In Colophon, content types are versioned definitions in PostgreSQL. Owners and developers change them at runtime through the API or the Studio's type builder, and every change is checked against the entries already stored: a change that would break stored content is refused with the entries it would break, or turned into a migration plan with a dry run over every entry, an approval and a run that resumes after a crash. That suits teams where the people shaping content aren't the people deploying code. Details: [content modelling that checks your stored entries](/blog/content-modeling-in-colophon/).

In Payload, collections and fields live in your config, reviewed in pull requests and deployed with your app, which gives the schema the same history and review as the rest of the code. Payload generates matching types (`payload-types.ts`, automatically by default) that your front end and CMS share, and its Local API lets server code query content in-process without HTTP. Colophon's TypeScript SDK generates its types from Colophon's OpenAPI document, one step further away, and the SDK isn't on npm yet.

## Access control

Colophon's permissions are data: default roles, custom roles edited as a grid in the Studio, field lists and own-entry conditions. Every path, including the Studio, the CLI, scripts and agents, goes through the same policy check, and there's no in-process path that skips it. Some rules are enforced by PostgreSQL itself, such as project isolation by [row-level security](/blog/headless-cms-glossary/#row-level-security) and a public delivery role that can't read drafts. It's less flexible than arbitrary code, and that's the trade. Details: [field-level permissions](/blog/field-level-permissions/).

Payload's access control is functions: "There are three main types of Access Control in Payload", for collections, globals and fields, and a function can return a query to filter rows. It's as flexible as code. Roles are whatever your functions check, with no built-in roles screen, and in Payload 3's Local API "all Access Control is skipped by default" unless you pass `overrideAccess: false`; the v4 beta reverses this default.

## AI agents

Colophon's MCP server lets an agent read, draft, propose a publish request and ask for review. No tool approves or publishes, and the API refuses any API token's approval of something an API token submitted. Tokens carry ceilings, such as documents per day and requests per minute, and a stored evaluation run against the real API recorded zero unauthorized actions. Details: [give AI agents CMS access, not the publish button](/blog/ai-agents-cms-permissions/).

Payload has an official MCP plugin with per-API-key permissions, and its v4 beta reworks MCP further.

## What runs inside the server

Colophon deliberately runs no user code in the server: no plugins, hooks or validator functions. Rules are declared as data, and integrations go through the API, webhooks and the MCP server. Less code running with the server's rights means a smaller attack surface; the cost is that you can't reshape Colophon's behaviour from inside.

Payload's admin can be extended with your own React components, and its access control is arbitrary code. If you want that reach, it's a real difference.

## Running it yourself

Colophon is one Rust binary that runs as the API, the background worker or both, beside PostgreSQL, a Valkey cache that can be lost without losing data, and S3-compatible storage for uploads. Operators get honest health checks, structured logs, encrypted backups with WAL archiving and a restore procedure rehearsed on clean infrastructure. Today you build it from source.

Payload installs into your Next.js app and runs wherever that app runs. On hosting, Payload's site says Payload "has joined Figma", that the open-source core continues, and that on Payload Cloud "deployment of new projects is currently paused". Existing Cloud projects keep running, and self-hosting Payload is unaffected.

## Performance you can check

Every Colophon load run stores its machine, commit, counts and verdict, failures included. For example, 540,063 anonymous reads over 30 minutes at 300 a second finished with 0 failures and a p95 of 6.4 ms, and a server killed behind a load balancer mid-run lost none of its 6,001 acknowledged writes. All of it ran on one laptop, so it shows how the code behaves, not what a production install can carry. [Load-testing a CMS](/blog/load-testing-a-cms/) has the method and the caveats.

Payload's comparison pages make speed claims against other CMSs. I haven't run the same tests against Payload, so I make none here.

## Moving from Payload

There's no Payload importer. Colophon imports its own JSONL and JSON arrays, plus Strapi and Sanity exports, with a dry run that reports an outcome for every item before anything is written. Moving from Payload means exporting your documents to JSON yourself and recreating the content types first.

## What to know before choosing Colophon

- **It's pre-release.** Version 0.1.0-alpha.1, built in public by one person, with no users yet. The [status section](/#pricing) on the home page says what's done.
- **PostgreSQL only, self-hosted only.** There's no hosted version, and today you build it from source: no container image, published binaries or npm packages yet.
- **Two delivery pieces are partial.** Webhook payloads aren't signed yet, and cache clears are tested against a stand-in CDN; the adapter for a real CDN is on the roadmap.
- **On the roadmap:** draft preview for headless sites (the Studio already previews pages of its own website starter), choosing a locale in the public content API, and images inside rich text (the editor inserts a placeholder for now).
- **The 24-hour soak hasn't passed yet.**

## Who it isn't for

If you want the CMS inside your Next.js codebase, with the schema as TypeScript and types shared with your front end, Payload is designed for exactly that, and Colophon isn't. Colophon fits a team that wants the CMS as its own service, with history and proof of every publish.

The [Strapi](/blog/colophon-vs-strapi/) and [Directus](/blog/colophon-vs-directus/) comparisons use the same template, and [six publishing tests to run on any headless CMS](/blog/headless-cms-publishing-checklist/) lists the questions behind all three.

## Sources

Checked on 16 November 2026:

- Payload: [versions](https://payloadcms.com/docs/versions/overview), [drafts and scheduled publishing](https://payloadcms.com/docs/versions/drafts), [access control](https://payloadcms.com/docs/access-control/overview), [hooks](https://payloadcms.com/docs/hooks/overview), [generating types](https://payloadcms.com/docs/typescript/generating-types), [configuration](https://payloadcms.com/docs/configuration/overview), [Local API](https://payloadcms.com/docs/local-api/overview), [live preview](https://payloadcms.com/docs/live-preview/overview), [localization](https://payloadcms.com/docs/configuration/localization), [MCP plugin](https://payloadcms.com/docs/plugins/mcp), [the v4 migration guide](https://github.com/payloadcms/payload/blob/main/docs/migration-guide/v4.mdx), the [enterprise page](https://payloadcms.com/enterprise), ["Payload has joined Figma"](https://payloadcms.com/payload-has-joined-figma) and the [GitHub repository](https://github.com/payloadcms/payload).
- Colophon: the [repository](https://github.com/akira-shirase-oss/colophon-cms), its [changelog's known limitations](https://github.com/akira-shirase-oss/colophon-cms/blob/main/CHANGELOG.md#known-limitations) and its [licence](https://github.com/akira-shirase-oss/colophon-cms/blob/main/LICENSE).

If anything about Payload here is wrong or out of date, tell me and I'll correct it.
