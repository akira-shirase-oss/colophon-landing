---
kind: compare
title: "Colophon vs Sanity: self-hosted or content lake"
description: "Colophon and Sanity compared: a self-hosted MIT server or a hosted content lake, whole-site releases, publish receipts, rollback, roles and AI agents."
targetQuery: "sanity alternative self-hosted"
pubDate: 2026-11-19
factsChecked: 2026-11-19
status: "Sanity facts were checked on 19 November 2026 against Sanity's own pages; corrections are welcome."
related:
  - href: /compare/colophon-vs-storyblok/
    text: "Colophon vs Storyblok: self-hosted or visual SaaS"
  - href: /compare/
    text: "Open-source alternatives to popular CMSs"
  - href: /compare/colophon-vs-contentful/
    text: "Colophon vs Contentful: self-hosted or SaaS CMS"
  - href: /blog/colophon-vs-payload/
    text: "Colophon vs Payload CMS: an honest comparison"
  - href: /blog/website-history-past-date/
    text: "How to see what your website said on a past date"
  - href: https://docs.colophon.404human.dev/quick-start/
    text: "The Colophon quick start, with Docker"
faq:
  - q: "Can Sanity be fully self-hosted?"
    a: "Sanity Studio, the editing app, is open source under the MIT licence and can be hosted wherever you like. The content itself lives in Sanity's Content Lake, which its plans provide as a hosted service; I found no self-hosted Content Lake on Sanity's site when these facts were checked on 19 November 2026."
  - q: "Can Colophon import a Sanity dataset?"
    a: "Yes, with limits. Colophon's import reads Sanity's NDJSON export and runs a dry run first that reports, item by item, what it would create, refuse or not map. You recreate the content types in Colophon first, and imported entries land as drafts."
  - q: "Does Colophon have a query language like GROQ?"
    a: "No. Public reads use a REST API with a bounded query document (filters, sorting and reference depth, each with a limit), and the signed-in API also offers a read-only GraphQL surface. There is nothing like GROQ's free-form projections."
  - q: "Which one costs less?"
    a: "Colophon has no licence fee: it is MIT-licensed, and you pay for your servers and PostgreSQL. Sanity has a free plan and a Growth plan priced per seat. The answer depends on your team size, your traffic and whether you would rather pay in money or in operations time."
---

I build Colophon, so read this with that in mind. Every Sanity fact below links to Sanity's own page, and each
was checked on 19 November 2026. If one has changed, [open an issue](https://github.com/akira-shirase-oss/colophon-cms/issues)
and I'll correct it with a dated note.

## The short answer

Colophon is for a team that wants the whole CMS, content included, on infrastructure it runs, under the MIT
licence, and wants every publish to leave a record it can check: a numbered release of the whole site, a
receipt that says whether readers can see it, and a rollback that is reviewed like any other change.

Sanity splits the CMS in two. Its Studio is an open-source React app you customise in code and can host
anywhere. Your content lives in Sanity's hosted Content Lake, queried with GROQ. It is an established product
with a large ecosystem. Colophon is pre-release and run by one person, as the status line above says.

## At a glance

Checked on 19 November 2026.

| | Colophon | Sanity |
|---|---|---|
| Where content lives | In your PostgreSQL, on servers you run | In Sanity's hosted Content Lake ([pricing](https://www.sanity.io/pricing)) |
| Editing app | The Studio, served by the same Rust server | Sanity Studio, MIT-licensed, a React app you configure in code ([repository](https://github.com/sanity-io/sanity)) |
| Licence | MIT | Studio: MIT; the Content Lake is a hosted service |
| Price | Free; you pay for your own servers | Free plan (20 seats, 2 roles, 10k documents); Growth at $15 per seat a month; Enterprise priced on request ([pricing](https://www.sanity.io/pricing)) |
| Releases | Every publish is a numbered release of the whole site, and any past release can be read by its number | [Content Releases](https://www.sanity.io/docs/user-guides/content-releases), listed as an Enterprise add-on on the [pricing page](https://www.sanity.io/pricing) |
| History | Every saved revision is kept, and whole-site history is the list of releases | Drafts history kept 3 days on Free, 90 on Growth, 365 on Enterprise ([pricing](https://www.sanity.io/pricing)) |
| Schedules | A local time in a named time zone, an explicit choice when the clocks change, and a full recheck when it runs | Scheduled drafts on Growth and Enterprise ([pricing](https://www.sanity.io/pricing)) |
| Roles | Roles down to a single field or an editor's own entries; access changes go to an append-only audit log | Free: 2 roles; Growth: 5; custom roles and an audit log on Enterprise ([pricing](https://www.sanity.io/pricing)) |
| AI agents | An MCP server: agents draft and ask for review with a scoped token; budgets and quotas per token | A hosted MCP server; tool calls run with the permissions of the token or signed-in user ([docs](https://www.sanity.io/docs/mcp)) |
| Querying | REST with a bounded query document; read-only GraphQL on the signed-in API | GROQ and GraphQL ([docs](https://www.sanity.io/docs/content-lake)) |
| Maturity | Pre-release, one maintainer, no users yet | An established hosted product |

## What Colophon does, and why it matters

### All of it runs on your servers

With Colophon, the editing app, the API and the content are one Rust server and one PostgreSQL database that
you run. Nothing about your content depends on a vendor's service staying available, priced the same or
hosted in a region you accept. You also carry the work: backups (encrypted, with a staged restore that has been
rehearsed on clean infrastructure), upgrades and uptime. Sanity's split is the opposite trade. You own and shape
the Studio, and Sanity runs the store, the APIs and their scaling, so no database is yours to keep alive.

### Every publish is a release of the whole site

A Colophon publish is a numbered release of everything that is live, committed in one transaction, and every
release is kept. "What did the site say last Tuesday?" becomes one lookup, with every reference resolved at the
same release. Sanity keeps a document's history for a period that depends on the plan, and its Content Releases
group documents so they go live together. The general problem, and the options on any stack, are in
[how to see what your website said on a past date](/blog/website-history-past-date/).

### A receipt says whether readers can see it

Each Colophon release gets a receipt: **published** when nothing checks your site, **pending** while a rebuild
or purge is in flight, and **verified at N locations** once a site check has seen that release on the live page.
Sanity serves content through its own API and CDN quickly. Whether your site has rebuilt is up to your build and
hosting, as with most headless CMSs. How to check each layer on any CMS is in
[why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

### A rollback is a reviewed change

Rolling back in Colophon opens an ordinary publish request for the earlier content: someone reviews it, it lands
as a new release, and something taken down since stays down. Sanity's Studio can revert a document to an earlier
revision and revert a content release. See [how to roll back a bad CMS publish](/blog/roll-back-a-bad-publish/)
for what any rollback should and shouldn't bring back.

### Agents draft; the server decides who approves

Sanity's MCP server runs tool calls with the permissions of the token or the signed-in user. Colophon's rule is
enforced by the server itself: an agent's token can draft and submit a change for review, but no token can
approve what a token submitted, and budgets and request quotas are reserved per token in the database. An
adversarial test run with no model in the loop recorded zero unauthorised actions (a stored run, 4 November
2026). The questions to ask any CMS's MCP server are in
[give AI agents CMS access, not the publish button](/blog/ai-agents-cms-permissions/).

## Moving from Sanity

Sanity's CLI exports a dataset as a tarball whose documents are newline-delimited JSON
([docs](https://www.sanity.io/docs/content-lake/exporting-data)). Colophon's import reads that NDJSON shape.
Recreate your content types in Colophon first, then run the import with a dry run: it reports, item by item, what
it would create, refuse or leave unmapped before anything is written, up to 512 items per request. Imported
entries land as drafts and go live through a reviewed release. Assets and Portable Text need their own
conversion; Colophon stores rich text in its own JSON format, not Portable Text.

## What to know before choosing Colophon

- **It's pre-release.** The first version, 0.1.0-alpha.1, is tagged, and its npm packages aren't published
  yet. Nobody runs it in production.
- **There's no hosted option.** You run PostgreSQL, backups and upgrades yourself.
- **The Studio isn't a framework.** You configure content types in the Studio or through the API; you don't
  write the editing app in code the way you can with Sanity Studio, and there is no plugin system that runs
  your code.
- **The public delivery API has no language parameter yet,** webhooks aren't signed yet, and there's no adapter
  for a real CDN; purging is tested against a stand-in.
- **The 24-hour soak test hasn't passed yet.** The load results that exist are laptop numbers, labelled as such.
