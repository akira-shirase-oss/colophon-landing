---
title: "Colophon vs Strapi: an honest comparison"
description: "Colophon and Strapi compared on publish receipts, release history, review, scheduling, permissions and AI agents, with dated, linked sources."
pubDate: 2026-11-16
updatedDate: 2026-11-19
tags: ["comparison", "strapi", "headless cms", "open source"]
status: "Still owed for this comparison: an import tested on a real production Strapi export, and a passing 24-hour soak."
draft: false
---

I build Colophon, so read this with that in mind. The Strapi facts below come from Strapi's own docs and pricing pages, checked on 16 November 2026 and listed under Sources at the end. The Colophon facts come from its repository, and each one is built and tested there. If anything about Strapi here is wrong or out of date, tell me and I'll correct it.

*Updated 19 November 2026: draft preview on your own site and images inside rich text have shipped in Colophon since this comparison was first published, and a Docker quick start replaced building from source. The rows and the list at the end say so; the other product's facts are unchanged from 16 November.*

## The short answer

Colophon is for teams who need to know, with evidence, what their website published: what went live, when, who approved it, and whether it reached the live site. If that is the question you keep asking, Colophon is built for you, and these are the reasons:

- **Every publish leaves a receipt.** Each publish is a numbered [release](/blog/headless-cms-glossary/#release), and its receipt says whether it is only in the CMS, on its way to your site, verified at a stated number of locations by a check of the live page, or in need of attention.
- **Whole-site history and a reviewed rollback, free.** You can read the whole site as it was at any past release, and a rollback is a new release that goes through review like any other change.
- **Review that covers exactly what was approved.** An approval counts only for the exact revisions it was given on, and expires after seven days.
- **Scheduled publishing that survives downtime**, and **drafts that survive crashes and collisions**.
- **Field-level permissions**, with PostgreSQL enforcing project isolation and an append-only audit log in the free core.
- **AI agents that can draft but never approve their own work**, and run under budgets and rate limits.
- **No user code running in the server**, which keeps the attack surface small.
- **MIT, with no enterprise tier.** Every feature in this post is in the same MIT-licensed code.
- **Measured behaviour.** Load results are stored with their failures, and labelled as laptop numbers.

The honest cost: Colophon is in alpha. What that means in practice is in [what to know before choosing Colophon](#what-to-know-before-choosing-colophon).

If you're weighing a hosted service instead, [Colophon vs Contentful](/compare/colophon-vs-contentful/) and [Colophon vs Sanity](/compare/colophon-vs-sanity/) compare self-hosting with a hosted CMS, and [all the comparisons](/compare/) are side by side on one page.

## At a glance

Strapi facts checked on 16 November 2026.

| | Colophon | Strapi 5 |
|---|---|---|
| Status | Alpha (0.1.0-alpha.7), live with open sign-up | Stable; v5.62.0 released 12 November 2026 |
| Licence | MIT | MIT, with enterprise code under a separate licence |
| Stack | Rust server; Svelte Studio | Node.js, TypeScript; React admin |
| Databases | PostgreSQL only | PostgreSQL, MySQL, MariaDB, SQLite |
| Hosting | The hosted service (alpha, open sign-up), or self-hosted with a Docker quick start that builds the image from a clone | Self-hosted, or Strapi Cloud |
| Version history | Every save from every path, kept | Growth and Enterprise plans; edits made in the admin only |
| Grouped releases | Every publish; pinned exact revisions | Growth and Enterprise; latest drafts, not pinned versions |
| Review workflows | Built in; approval bound to exact content | Enterprise |
| Publish confirmation | Delivery receipts with site checks | Not built in |
| Audit logs | Roles, members and tokens, append-only | Enterprise |
| Draft preview | On your own site: a Preview menu in the Studio and a preview API for your site | Built in; Live Preview on paid plans |
| Locales through the API | Stored and published; the public API can't select one yet | Built in and free, through to the API |
| MCP server | Built in; connect by signing in, it acts with your role and asks before it publishes | Built in, free |

## Every publish leaves a receipt

When a CMS says published, only one thing has certainly happened: its own database changed. Your readers see a CDN copy or a static page, and either can still be old. Colophon tracks the rest. After a release commits, its worker can tell your site to rebuild, ask your CDN to drop the copies that changed, and run a site check that reads your live page for the release it was built from. The release's [receipt](/blog/headless-cms-glossary/#receipt) carries one label: Published in Colophon, Website update pending, Verified at N locations, or Needs attention with what failed and what to do next. Only a check of the live site can verify a release, and it always says from how many places it looked.

Strapi tells you the entry is published in Strapi. Whether your CDN or static site picked it up is yours to work out. Strapi's webhooks can carry auth headers you configure, but they don't sign payloads themselves; the docs recommend you add HMAC signing yourself. How the layers between a CMS and a reader go stale, and how to check each one on any stack, is in [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

## Release history, rollback and drafts

In Colophon, every save from the Studio, the CLI or the API is an insert-only revision, and retention never deletes revisions. A save must start from the current draft, so two editors can't overwrite each other silently, and a retry after a lost answer can't save twice ([how that works](/blog/cms-lost-edits/)). Above the entries, every publish is a release of exact revisions, committed in one transaction. Because each entry keeps a history of which revision was live from which release to which, you can read the whole site as it was at any past release; [seeing what your website said on a past date](/blog/website-history-past-date/) shows how. A rollback builds a publish request from an older release, goes through review and lands as a new release, so the history keeps both the mistake and the fix. Content that was taken down since stays down. More in [how to roll back a bad publish](/blog/roll-back-a-bad-publish/).

Strapi's Content History is on the Growth and Enterprise plans, kept 14 days on Growth and up to 90 on Enterprise. In Strapi's words, "A version is only created when a document is modified through the Content Manager in the admin panel." Changes made through the REST API, GraphQL or the Document Service aren't versioned, and restoring a version replaces the current draft. Strapi's Releases, also Growth and Enterprise, group entries to publish together, optionally on a schedule. A release publishes "the latest saved version of the draft", and the docs say "A release cannot be pinned to a specific version of an entry." Once published, it "cannot be edited or published again."

## Review and approvals

In Colophon, editors ask for review and publishers and owners approve. An approval is tied to a hash of every revision in the publish request, so an edit made after approval needs approving again, and approvals expire after seven days. Named review stages are built in too. Self-review is allowed by default and shown with a visible badge, which suits a team of one, and a project can require a different reviewer instead. All of this is in the free core, and it's the same rule that covers rollbacks, schedules and AI agents.

Strapi's Review Workflows are Enterprise only, with stages, per-stage permissions and assignees. Without Enterprise you can limit who publishes through RBAC, but there are no review stages, assignees or recorded approvals.

## Scheduled publishing

A Colophon schedule stores a local time and an IANA time zone. At a daylight-saving change, where a local time happens twice or not at all, it asks you to choose rather than picking silently. The schedule is a row in PostgreSQL, not a timer in memory, so if no worker is running at the scheduled moment, it runs when one starts and is labelled as published late. When it falls due, it rechecks the approval, the content and the author's role first, and publishes nothing if any of them changed. [Four ways scheduled publishing goes wrong](/blog/scheduled-publishing-pitfalls/) covers each case.

Strapi schedules its Releases, on Growth and Enterprise. Its docs state a clear rule for downtime: "If the server restarts less than 5 minutes after the scheduled time, the release is published automatically," and after that "the release ends as `Failed` and all its entries are skipped". From Strapi 5.62.0, a "Create release from skipped" action recovers the skipped entries.

## Content modelling and schema changes

Colophon keeps content types as versioned data in PostgreSQL, changed at runtime through the same API as everything else, and checks every change against the entries already stored. A change that would break stored content is refused with the entries it would break, or turned into a migration plan with a dry run over every entry and an approval before it applies. That suits teams where the people shaping content aren't the people deploying code. Details: [content modelling that checks your stored entries](/blog/content-modeling-in-colophon/).

Both cover the usual shapes: Strapi has components, dynamic zones and single types; Colophon has groups, lists, page-builder blocks, shared components and single types, plus references the database won't let dangle. The difference is where the schema lives. Strapi's Content-Type Builder is "available in Development environment only", and each content type's schema is a file in your project ([Strapi's models docs](https://docs.strapi.io/cms/backend-customization/models)), so schema changes reach production with your code. In my hands-on test, saving a content type restarted the development server, about 5 seconds each time.

## Permissions and audit

Colophon's roles are data: four defaults, plus roles you define, narrowed to single fields or to entries a person created. The Studio, the CLI, scripts and agents all go through one policy check. Some rules are enforced by PostgreSQL itself: projects are isolated by [row-level security](/blog/headless-cms-glossary/#row-level-security), the public API reads through a role that can't see drafts, and the audit log of changes to roles, members, invitations and tokens is append-only. The audit log is narrower than a full activity log: content edits are attributed through revision history instead. Details: [field-level permissions](/blog/field-level-permissions/).

Strapi is strong here too. Its RBAC is a free feature with custom roles, per-field and per-locale permissions, and conditions such as "the administrator must be the creator". Its audit logs require Enterprise.

## AI agents

Colophon's MCP server is connected by signing in: an AI app acts as you, with your role in each of your projects, and anything that publishes, deletes, revokes or changes access does nothing until you say yes. Scripts and CI can use a project API token instead, and the API itself refuses any API token's approval of something an API token submitted, so minting a second token doesn't get around it. Tokens can carry ceilings, such as documents per day, concurrent jobs and requests per minute, and work allowances are reserved in PostgreSQL before the work starts, so parallel requests can't race past them. A stored evaluation run against the real API recorded zero unauthorized actions. Details: [give AI agents CMS access, not the publish button](/blog/ai-agents-cms-permissions/).

Strapi has a built-in MCP server, free, scoped by an admin token's permissions. Strapi AI needs a paid plan: it is included in Growth and a paid add-on on Enterprise, and the schema assistant needs Growth.

## What runs inside the server

Colophon runs no user code in the server: no plugins, no hooks and no custom validator functions. Validation rules, permissions and schema changes are declared as data, and integrations go through the API, webhooks and the MCP server. Less code running with the server's rights means less that can go wrong with them. The trade is extensibility: you can't reshape Colophon's behaviour from inside.

Strapi is built to be extended, with a plugin marketplace and backend customisation in your own project's code. If you rely on that, it's a real difference.

## Running it yourself

Colophon is one Rust binary that runs as the API, the background worker or both, beside PostgreSQL, a Valkey cache that can be lost without losing data, and S3-compatible storage for uploads. Operators get health checks that report a degraded cache honestly, structured logs, encrypted backups with WAL archiving, and a restore procedure that has been rehearsed on clean infrastructure. To try it, a Docker quick start builds the image from a clone and starts Colophon, PostgreSQL, Valkey and object storage together; published images and binaries wait on the first release.

Strapi installs with `npx create-strapi@latest`. In [my hands-on notes](https://github.com/akira-shirase-oss/colophon-cms/blob/main/docs/research/strapi-vs-colophon-hands-on.md) from 28 October 2026 (Strapi 5.60.0 Community, SQLite, development mode), install took about 75 seconds with only Node. Strapi runs on several databases and has Strapi Cloud.

## Performance you can check

Every Colophon load run stores a result file with the machine, the commit, the request counts and its own verdict, and failed runs stay in the record. Two examples: 540,063 anonymous reads over 30 minutes at 300 a second, with 0 failures, a p95 of 6.4 ms and server memory peaking around 41 MB; and a server killed behind a load balancer mid-run, with all 6,001 acknowledged writes stored. Both ran on one laptop, so they are evidence about how the code behaves, not a capacity claim. [Load-testing a CMS](/blog/load-testing-a-cms/) has the method and the caveats.

I haven't run the same scenarios against Strapi, so none of this is a comparison of speed.

## Moving from Strapi

Colophon's import reads Strapi v4 and v5 export shapes. A dry run reports an outcome for every item before anything is written, including the keys it read but didn't store. Recreate your content types first, because the import moves entries, not schemas, and imported entries arrive as drafts that you publish through a reviewed release. I haven't tested a real production Strapi site's export yet, so treat it as a starting point.

## What to know before choosing Colophon

- **It's alpha.** Version 0.1.0-alpha.7, live with open sign-up, built in public by one person. v0.1's stability promises (a stable public delivery API, breaking-change checks and upgrade guides) aren't made yet. The [public roadmap](https://github.com/akira-shirase-oss/colophon-cms/blob/main/docs/ROADMAP.md) says what's done and what's planned.
- **PostgreSQL only.** Use the [hosted service](https://colophonapp.404human.dev), in alpha with open sign-up and up to 3 projects per account, or self-host with the Docker quick start, which builds the image from a clone. The npm packages aren't published yet.
- **Two delivery pieces are partial.** Webhook payloads aren't signed yet, and cache clears are tested against a stand-in CDN; the adapter for a real CDN is on the roadmap.
- **[On the roadmap](https://github.com/akira-shirase-oss/colophon-cms/blob/main/docs/ROADMAP.md):** choosing a locale in the public content API (locales are stored and published today).
- **The 24-hour soak hasn't passed yet.**

To try it, the docs' [quick start](https://docs.colophon.404human.dev/quick-start/) runs Colophon with Docker, and [installation](https://docs.colophon.404human.dev/installation/) covers serving it on a domain or under systemd.

## Who it isn't for

If you need a plugin marketplace, a choice of databases or a managed cloud today, Strapi fits that need and Colophon doesn't try to. Colophon fits a team that wants proof of what it published and is happy to run PostgreSQL itself.

The [Payload](/blog/colophon-vs-payload/) and [Directus](/blog/colophon-vs-directus/) comparisons use the same template, and [six publishing tests to run on any headless CMS](/blog/headless-cms-publishing-checklist/) lists the questions behind all three.

## Sources

Checked on 16 November 2026:

- Strapi: [Releases](https://docs.strapi.io/cms/features/releases), [Content History](https://docs.strapi.io/cms/features/content-history), [Review Workflows](https://docs.strapi.io/cms/features/review-workflows), [RBAC](https://docs.strapi.io/cms/features/rbac), [audit logs](https://docs.strapi.io/cms/features/audit-logs), [webhooks](https://docs.strapi.io/cms/backend-customization/webhooks), [Content-Type Builder](https://docs.strapi.io/cms/features/content-type-builder), [preview](https://docs.strapi.io/cms/features/preview), [internationalization](https://docs.strapi.io/cms/features/internationalization), [MCP server](https://docs.strapi.io/cms/features/strapi-mcp-server), [Strapi Cloud pricing](https://strapi.io/pricing-cloud) and the [GitHub repository](https://github.com/strapi/strapi).
- Colophon: the [repository](https://github.com/akira-shirase-oss/colophon-cms), its [changelog's known limitations](https://github.com/akira-shirase-oss/colophon-cms/blob/main/CHANGELOG.md#known-limitations) and its [licence](https://github.com/akira-shirase-oss/colophon-cms/blob/main/LICENSE).

If anything about Strapi here is wrong or out of date, tell me and I'll correct it.
