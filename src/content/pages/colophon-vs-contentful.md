---
kind: compare
title: "Colophon vs Contentful: self-hosted or SaaS CMS"
description: "Colophon and Contentful compared: self-hosted MIT or hosted SaaS, whole-site releases, publish receipts, rollback, roles and AI agents, with dated sources."
targetQuery: "contentful alternative open source self-hosted"
pubDate: 2026-11-19
factsChecked: 2026-11-19
status: "Contentful facts were checked on 19 November 2026 against Contentful's own pages; corrections are welcome."
related:
  - href: /compare/colophon-vs-storyblok/
    text: "Colophon vs Storyblok: self-hosted or visual SaaS"
  - href: /compare/
    text: "Open-source alternatives to popular CMSs"
  - href: /compare/colophon-vs-sanity/
    text: "Colophon vs Sanity: self-hosted or content lake"
  - href: /blog/colophon-vs-strapi/
    text: "Colophon vs Strapi: an honest comparison"
  - href: /blog/colophon-vs-payload/
    text: "Colophon vs Payload CMS: an honest comparison"
  - href: /blog/colophon-vs-directus/
    text: "Colophon vs Directus: an honest comparison"
  - href: /blog/headless-cms-publishing-checklist/
    text: "Six publishing questions a headless CMS should answer"
  - href: https://docs.colophon.404human.dev/quick-start/
    text: "The Colophon quick start, with Docker"
faq:
  - q: "Is Colophon a drop-in replacement for Contentful?"
    a: "No. Colophon has its own content model, APIs and SDK, and no Contentful importer. Moving means recreating your content types and converting Contentful's JSON export into entries that Colophon's import checks with a dry run first."
  - q: "Can Contentful be self-hosted?"
    a: "Contentful's plans are spaces on its own hosted platform, and I found no self-hosted edition on its site when these facts were checked on 19 November 2026. Its MCP server can run locally, but it talks to Contentful's hosted API."
  - q: "Does Colophon come with a CDN?"
    a: "No. Colophon sends cache headers and cache tags so a CDN can sit in front of it, and keeps a purge record for each release. A built-in adapter for a real CDN doesn't exist yet; purging is tested against a stand-in."
  - q: "What does Colophon cost?"
    a: "Nothing to licence: it is MIT-licensed. You pay for the servers and the PostgreSQL database you run it on, and for your own time operating them."
---

I build Colophon, so read this with that in mind. Every Contentful fact below links to Contentful's own page,
and each was checked on 19 November 2026. If one has changed, [open an issue](https://github.com/akira-shirase-oss/colophon-cms/issues)
and I'll correct it with a dated note.

## The short answer

Colophon is for a team that wants an open-source CMS, under the MIT licence, hosted or run itself, and wants every publish to
leave a record it can check: a numbered release of the whole site, a receipt that says whether readers can
see it, and a rollback that is reviewed like any other change. AI apps connect by signing in and ask before they publish, and the server refuses to let one token approve
what another token submitted.

Contentful is a hosted content platform. It runs the servers, the content delivery network and the scaling,
so there is nothing to install or operate, and it is an established commercial product. Colophon is in alpha and run by one person, as the status line above says.

## At a glance

Checked on 19 November 2026.

| | Colophon | Contentful |
|---|---|---|
| Where it runs | Colophon's hosted service (alpha), or your own servers: Docker, or a binary under systemd, with PostgreSQL | Hosted by Contentful; plans are hosted spaces ([pricing](https://www.contentful.com/pricing/)) |
| Licence | MIT | A commercial service; its [MCP server](https://www.contentful.com/developers/docs/tools/mcp-server/) is open source |
| Price | Free; you pay for your own servers | Free plan with 10 users, 2 roles, 2 locales and 100K API calls a month; Lite at $300 a month; Enterprise priced on request ([pricing](https://www.contentful.com/pricing/)) |
| Releases | Every publish is a numbered release of the whole site, and any past release can be read by its number | [Releases](https://www.contentful.com/help/content-releases-eap/) group entries and assets so one action publishes or unpublishes them together, and can be scheduled |
| Going back | A rollback is a publish request, reviewed like any other, that lands as a new release | [Environment aliases](https://www.contentful.com/developers/docs/tutorials/general/deploying-changes-with-environment-aliases/) let you point production back at a previous environment, mainly for content-model changes |
| Schedules | A local time in a named time zone, an explicit choice when the clocks change, and a full recheck when it runs | On Lite and above ([pricing](https://www.contentful.com/pricing/)); up to 200 pending scheduled entries per environment ([help](https://www.contentful.com/help/scheduled-publishing/)) |
| Roles | Roles down to a single field or an editor's own entries; access changes go to an append-only audit log | Free: 2 roles; Lite: 3; Enterprise: custom ([pricing](https://www.contentful.com/pricing/)) |
| AI agents | An MCP server you connect by signing in: it acts with your role and asks before it publishes, removes or changes access; API tokens for scripts, with budgets and quotas | An official MCP server, hosted or local; tools include publishing entries ([docs](https://www.contentful.com/developers/docs/tools/mcp-server/)) |
| Maturity | Alpha (0.1.0-alpha.7), live with open sign-up, one maintainer | An established hosted product |

## What Colophon does, and why it matters

### Every publish is a release of the whole site

In Colophon, a publish isn't a change to one entry. It's a numbered release of everything that is live in
that environment, committed in one transaction. Because each release is kept, "what did the site say last
Tuesday?" is one lookup: find the last release before that moment and read the content pinned to it, with
every reference resolved at that same release. That matters for complaints, audits and "when did this
change?", which per-entry version history can't answer. The general problem, and the options on any stack,
are in [how to see what your website said on a past date](/blog/website-history-past-date/).

Contentful's Releases solve a different problem well: getting a set of entries and assets out together, on a
schedule if you like. In Colophon that grouping is simply what every publish is.

### A receipt says whether readers can see it

"Published" in a CMS usually means the CMS's own API has the new content. Your readers see your website,
which sits behind builds and caches. Each Colophon release gets a receipt: **published** when nothing checks
your site, **pending** while a rebuild or purge is in flight, and **verified at N locations** only once a site
check has seen that release on the live page. Contentful runs its own delivery network for its API, so
content reaches the API quickly. Whether your site has rebuilt is up to your build and hosting, as it is with
most headless CMSs. Why the two differ, and how to check each layer on any CMS, is in
[why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

### A rollback is a reviewed change, not a rewind

Rolling back in Colophon opens an ordinary publish request for the earlier content. Someone reviews it, it
lands as a new release, and the history only moves forward. Something taken down since stays down. Contentful
offers a different kind of going back: an environment alias can be pointed back at the previous environment,
which suits a content-model change that went wrong. What to do in the first minutes after a bad publish, on
any CMS, is in [how to roll back a bad CMS publish](/blog/roll-back-a-bad-publish/).

### Agents act with your role, and ask first

Both products let AI agents work through MCP. Contentful's hosted server acts as the signed-in user, and an
administrator can allow each group of tools per environment, read-only or read and write. Its local server
runs with the permissions of a personal access token, and its docs say to treat that token as the security
boundary ([docs](https://www.contentful.com/developers/docs/tools/mcp-server/)). Colophon's server
is connected by signing in too: an app acts as you, with your role in each project, and anything that
publishes, deletes or changes access waits until you say yes. A script's API token is its own identity, and
the server refuses any token's approval of what a token submitted, whatever tools are offered. Budgets and
request quotas are reserved per token in the database. An adversarial test of the token route, with no model
in the loop, recorded zero unauthorised actions (a stored run, 4 November 2026). The questions to ask any CMS's MCP server are in
[give AI agents CMS access, not the publish button](/blog/ai-agents-cms-permissions/).

### You run it, and you keep it

Colophon runs on infrastructure you control: one Rust server that serves the API and the Studio, backed by
PostgreSQL, with encrypted backups and a staged restore that has been rehearsed on clean infrastructure.
That is the reason to run it yourself, and also its cost: you operate it. Contentful takes all of that off
your hands, which is the main reason teams choose a hosted CMS. Colophon's own hosted service does too, but
it is new and in alpha.

## Moving from Contentful

There is no Contentful importer. Contentful's CLI exports a space to one JSON file
(`contentful space export`, [docs](https://www.contentful.com/developers/docs/tutorials/cli/import-and-export/))
with content types, entries, assets and locales. To move, recreate your content types in Colophon first,
convert the entries into Colophon's import format (JSON lines or a JSON array), and run the import with a dry
run. It reports, item by item, what it would create and what it would refuse, before anything is written, up
to 512 items per request. Imported entries land as drafts and go live through a reviewed release.

## What to know before choosing Colophon

- **It's in alpha.** Version 0.1.0-alpha.7 is live, with open sign-up on the hosted service, and its npm
  packages aren't published yet. v0.1's stability promises aren't made yet.
- **The hosted service is new, and in alpha.** It runs at [colophonapp.404human.dev](https://colophonapp.404human.dev) with open
  sign-up and up to 3 projects per account. Self-hosted, you run PostgreSQL, backups and upgrades yourself.
- **The public delivery API has no language parameter yet.** Languages are stored and published.
- **Webhooks aren't signed yet,** and there's no adapter for a real CDN; purging is tested against a
  stand-in.
- **The 24-hour soak test hasn't passed yet.** The load results that exist are laptop numbers, labelled as such.
