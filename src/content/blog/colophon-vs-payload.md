---
title: "Colophon vs Payload CMS: an honest comparison"
description: "Payload is a mature, MIT-licensed, code-first CMS that lives in your Next.js app. Colophon is a pre-release Rust CMS built around publish proof. How they differ."
pubDate: 2026-11-16
tags: ["comparison", "payload", "headless cms", "open source"]
draft: false
---

I'm building Colophon, so read this knowing that. Payload facts come from Payload's own docs and site, checked on 16 November 2026 and linked below; Colophon facts come from its repository. Where Payload is ahead, I say so.

## The short answer

Payload and Colophon start from different places. Payload is a code-first TypeScript CMS: you describe collections, fields and access rules in code, and it installs into a Next.js app. Colophon is a separate server with a Rust core: content types are data you change at runtime, and the design is organised around proving what was published.

If you're building on Next.js and want your CMS in the same codebase and the same types, Payload is the obvious pick, and it's production-ready. Colophon is pre-release (0.1.0-alpha.1), has no users, and isn't published to any package registry yet.

## At a glance

| | Payload 3 | Colophon |
|---|---|---|
| Status | Stable; v3.93.0 released 4 November 2026; v4 in beta | Pre-release, 0.1.0-alpha, no users |
| Licence | MIT | MIT; the licence file isn't in the repository yet |
| Stack | TypeScript; React admin on the Next.js App Router | Rust server; Svelte Studio |
| Databases | MongoDB, PostgreSQL, SQLite | PostgreSQL only |
| Schema | Code, in your Payload config | Versioned data in PostgreSQL, changed at runtime |
| Access control | Functions you write, per collection, global and field | Roles as data, per field and own entries |
| Version history | Per document, in the open-source core | Every save, plus whole-site history by release |
| Scheduling | Built in; needs a job runner | Built in; runs in the worker |
| Outbound webhooks | Write your own in hooks | Built in; payloads not signed yet |
| Publish confirmation | Not built in | Delivery receipts with site checks |
| MCP | Official plugin | Built in; agents can't approve or publish |

## Where Payload is ahead

- **Maturity and community.** Payload is widely used in production, with around 45,900 [GitHub stars](https://github.com/payloadcms/payload), active releases and a large community. Colophon has none of that yet.
- **Type safety end to end.** Because the schema is TypeScript in the same codebase, Payload [generates matching types](https://payloadcms.com/docs/typescript/generating-types) (`payload-types.ts`, automatically by default) that your front end and CMS share, and the [Local API](https://payloadcms.com/docs/local-api/overview) lets server code query content in-process without HTTP. Colophon's TypeScript SDK generates types from its OpenAPI document, which is a step further away, and the SDK isn't on npm yet.
- **Customisation.** Payload's admin can be extended with your own React components, and its [access control](https://payloadcms.com/docs/access-control/overview) is arbitrary code. Colophon deliberately runs no user code in the server, so extension is narrower.
- **Editor features Colophon lacks.** Payload has [live preview](https://payloadcms.com/docs/live-preview/overview) and per-field [localization](https://payloadcms.com/docs/configuration/localization) with fallbacks. Colophon has no draft preview yet, and its public API can't select a locale yet.
- **Database choice.** Payload supports MongoDB, PostgreSQL and SQLite. Colophon is PostgreSQL only.

One thing to know about hosting: Payload's site says Payload "has joined Figma", that the open-source core continues, and that on Payload Cloud "deployment of new projects is currently paused" ([source](https://payloadcms.com/payload-has-joined-figma)). Existing Cloud projects keep running, and self-hosting Payload is unaffected. Colophon has no hosted offering at all.

## Schema as code versus schema as data

This is the real design difference, and neither side is simply better.

In Payload, collections and fields live in your config, reviewed in pull requests and deployed with your app. That's excellent for developer teams: the schema has the same history, review and types as the rest of the code.

In Colophon, content types are versioned definitions in PostgreSQL. Owners and developers change them at runtime through the API or the Studio's type builder. Every change is checked against the entries already stored: a change that would break stored content is refused with the entries it would break, or turned into a migration plan with a dry run over every entry, a per-entry outcome, an approval and a resumable run. That suits teams where the people shaping content aren't the people deploying code. Details: [content modeling that checks your stored entries](/blog/content-modeling-in-colophon/).

## Access control

Payload's access control is functions: "There are three main types of Access Control in Payload", for collections, globals and fields, and a function can return a query to filter rows. It's as flexible as code. Two things to know: roles are whatever your functions check, with no built-in roles screen, and in Payload 3's Local API "all Access Control is skipped by default" unless you pass `overrideAccess: false`; the [v4 beta](https://github.com/payloadcms/payload/blob/main/docs/migration-guide/v4.mdx) reverses this default.

Colophon's permissions are data: default roles, custom roles edited as a grid in the Studio, field lists and own-entry conditions. Every path, including the Studio, the CLI, scripts and agents, goes through the same policy check; there's no in-process path that skips it. Some rules are enforced by PostgreSQL itself, such as project isolation by row-level security and a delivery role that can't read drafts. It's less flexible than arbitrary code, and that's the trade. Details: [field-level permissions](/blog/field-level-permissions/).

## Versions, publishing and rollback

Payload's [versions](https://payloadcms.com/docs/versions/overview) are in the open-source core and opt-in per collection in Payload 3: once enabled, each save keeps "a _full_ copy of the document", up to 100 per document by default, and the admin can restore an older one. Drafts and autosave are built in. [Scheduled publishing](https://payloadcms.com/docs/versions/drafts) creates a background job; without a job runner, the docs warn, "your scheduled publish / unpublish jobs will never be executed." Payload lists Publishing Workflows, its approval feature, under Enterprise features on its [enterprise page](https://payloadcms.com/enterprise).

Colophon keeps every save as an insert-only revision too, and retention never deletes them. The difference is above the document. Every publish in Colophon is a numbered release of exact revisions, approved against a hash of them, committed in one transaction. Each entry's publication history means you can read the whole site as it was at any past release (content taken down since stays down). Rollback builds a reviewed request that lands as a new release. Review is in the core. Scheduling runs in Colophon's worker, rechecks the approval and content when it falls due, and labels a late run as delayed. Details: [scheduled publishing that survives downtime](/blog/scheduled-publishing-that-survives-downtime/) and [rollback is a change too](/blog/rollback-is-a-change-too/).

## Telling your site, and knowing it worked

Payload has no built-in outbound webhooks: you call your site from [hooks](https://payloadcms.com/docs/hooks/overview) such as `afterChange`, or from the jobs queue, and retries and signing are yours to write. That's flexible, and it's also code you own.

Colophon's worker announces every release to your site rebuild webhook after the commit, retries with backoff under a lease, and sends a stable idempotency key so repeats can be dropped. Its receipts then say whether a site check saw the release on the live site. Colophon's webhook payloads aren't signed yet, and its CDN purge has no real CDN adapter yet. Details: ["Published" should mean readers can see it](/blog/published-means-readers-can-see-it/).

## AI agents

Payload has an official [MCP plugin](https://payloadcms.com/docs/plugins/mcp) with per-API-key permissions, and its v4 beta reworks MCP further. Colophon's MCP server is built in, and its server-side rule is that no MCP tool approves or publishes and the API refuses an API token's approval of anything an API token submitted. Details: [give AI agents CMS access, not the publish button](/blog/ai-agents-without-the-publish-button/).

## Performance

Payload's comparison pages make speed claims against other CMSs. I haven't run the same tests against Payload, so I won't make any. Colophon's own load results, from one laptop and labelled that way, are in [Colophon's load tests, with the caveats](/blog/colophon-load-test-numbers/).

## Where it stands

Colophon is pre-release and built by one person in public. There's no Payload importer yet; imports read Colophon's own JSONL, Strapi and Sanity exports. The [status section](/#pricing) on the home page says what's done. If anything about Payload here is wrong or out of date, tell me and I'll correct it. The build log is at [404human.dev/colophon](https://404human.dev/colophon/).
