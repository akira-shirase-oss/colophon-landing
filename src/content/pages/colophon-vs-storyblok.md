---
kind: compare
title: "Colophon vs Storyblok: self-hosted or visual SaaS"
description: "Colophon and Storyblok compared: a self-hosted MIT CMS or a hosted visual editor, whole-site releases, receipts, scheduling, roles and AI agents, dated."
targetQuery: "storyblok alternative open source self-hosted"
pubDate: 2026-11-19
factsChecked: 2026-11-19
status: "Storyblok facts were checked on 19 November 2026 against Storyblok's own pages; corrections are welcome."
related:
  - href: /compare/
    text: "Open-source alternatives to popular CMSs"
  - href: /compare/colophon-vs-contentful/
    text: "Colophon vs Contentful: self-hosted or SaaS CMS"
  - href: /compare/colophon-vs-sanity/
    text: "Colophon vs Sanity: self-hosted or content lake"
  - href: /use-cases/audited-publishing/
    text: "A CMS with an audit trail for every publish"
  - href: https://docs.colophon.404human.dev/quick-start/
    text: "The Colophon quick start, with Docker"
faq:
  - q: "Does Colophon have a visual editor like Storyblok's?"
    a: "Not in the same way. Colophon's Studio edits structured fields, and its preview shows a saved draft on your own website, side by side or in a new tab. It doesn't let editors click on the page itself to edit a block in place, which is what Storyblok's Visual Editor is known for."
  - q: "Can Storyblok be self-hosted?"
    a: "Storyblok's plans are subscriptions to hosted spaces, with uptime SLAs on paid plans. I found no self-hosted edition on its site when these facts were checked on 19 November 2026."
  - q: "Can I move from Storyblok to Colophon?"
    a: "There is no Storyblok importer. You would recreate the content types, export stories through Storyblok's Management API and convert them to JSON lines or a JSON array, then run Colophon's import with a dry run first. Storyblok's nested blocks map to Colophon's page-builder blocks, but the conversion is yours to write."
---

I build Colophon, so read this with that in mind. Every Storyblok fact below links to Storyblok's own page, and
each was checked on 19 November 2026. If one has changed, [open an issue](https://github.com/akira-shirase-oss/colophon-cms/issues)
and I'll correct it with a dated note.

## The short answer

Colophon is for a team that wants to run its CMS itself, under the MIT licence, and wants every publish to
leave a record it can check: a numbered release of the whole site, a receipt that says whether readers can
see it, and a rollback that is reviewed like any other change, with scheduling and field-level roles in the
same open-source code rather than in a higher plan.

Storyblok is a hosted CMS built around its Visual Editor, where editors build pages from nested blocks and
see them on the page as they work. It runs the infrastructure for you and is an established commercial
product. Colophon is pre-release and run by one person, as the status line above says.

## At a glance

Checked on 19 November 2026.

| | Colophon | Storyblok |
|---|---|---|
| Where it runs | On your own servers, with PostgreSQL | Hosted spaces, with uptime SLAs on paid plans ([pricing](https://www.storyblok.com/pricing)) |
| Licence | MIT | A commercial service |
| Price | Free; you pay for your own servers | Starter free (1 seat); Growth $99 a month; Growth Plus $349 a month; Premium and Elite priced on request ([pricing](https://www.storyblok.com/pricing)) |
| Editing | Structured fields and page-builder blocks; preview on your own site | The Visual Editor, on every plan ([pricing](https://www.storyblok.com/pricing)) |
| Releases | Every publish is a numbered release of the whole site; any past one can be read | Releases on Premium and Elite ([pricing](https://www.storyblok.com/pricing)) |
| Schedules | A local time in a named time zone, an explicit choice when the clocks change, a recheck when due | 2 scheduled stories on Growth; 100 on Premium and Elite ([pricing](https://www.storyblok.com/pricing)) |
| Roles | Roles down to a single field or an editor's own entries | Custom roles on Premium and Elite ([pricing](https://www.storyblok.com/pricing)) |
| Activity record | Access changes in an append-only log; every release kept | An activity log on every plan ([pricing](https://www.storyblok.com/pricing)) |
| AI agents | An MCP server: agents draft and ask for review; a token can't approve a token's work | A hosted MCP server over the Management API ([docs](https://www.storyblok.com/docs/libraries/mcp-server)) |
| Maturity | Pre-release, one maintainer, no users yet | An established hosted product |

## What Colophon does, and why it matters

### The workflow features are in the open-source code

Scheduling, review stages, roles down to a field and whole-site releases are part of Colophon's MIT-licensed
server, with no plan above them. On Storyblok, releases and custom roles start at the Premium plan, and
scheduling is limited to two stories below it. If those features are why you need a CMS, that difference
matters more than the price list.

### Every publish is a release of the whole site

A Colophon publish is a numbered release of everything that is live, committed in one transaction and kept,
so "what did the site say last Tuesday?" is one lookup. Background, for any CMS:
[how to see what your website said on a past date](/blog/website-history-past-date/).

### A receipt says whether readers can see it

Each release gets a receipt that is **verified at N locations** only once a check of the live site has seen
it. Storyblok delivers content quickly through its own API; whether your site rebuilt is up to your build and
hosting. See [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

### Agents draft; the server decides who approves

Storyblok's hosted MCP server exposes its Management API, and its docs advise limiting the connection to the
spaces and permissions the client needs. Colophon enforces the rule in the server: an agent's token can draft
and submit for review, but no token can approve what a token submitted, and budgets are reserved per token. See
[give AI agents CMS access, not the publish button](/blog/ai-agents-cms-permissions/).

## What to know before choosing Colophon

- **It's pre-release.** The first version, 0.1.0-alpha.1, is tagged, and its npm packages aren't published
  yet. Nobody runs it in production.
- **There's no in-page visual editing.** Editors work in fields and preview on your site; they can't click a
  block on the page to edit it.
- **There's no hosted option.** You run PostgreSQL, backups and upgrades yourself.
- **The public delivery API has no language parameter yet,** webhooks aren't signed yet, and there's no
  adapter for a real CDN.
