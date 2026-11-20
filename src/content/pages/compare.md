---
kind: hub
title: "Open-source alternatives to popular CMSs"
description: "How Colophon, an open-source headless CMS you host yourself, compares with Strapi, Payload, Directus, Contentful, Sanity and git-based CMSs, dated."
targetQuery: "open source headless cms alternative"
pubDate: 2026-11-19
factsChecked: 2026-11-19
related:
  - href: /features/
    text: "Colophon's features, one page each"
  - href: /compare/colophon-vs-contentful/
    text: "Colophon vs Contentful: self-hosted or SaaS CMS"
  - href: /compare/colophon-vs-sanity/
    text: "Colophon vs Sanity: self-hosted or content lake"
  - href: /compare/colophon-vs-storyblok/
    text: "Colophon vs Storyblok: self-hosted or visual SaaS"
  - href: /compare/colophon-vs-git-based-cms/
    text: "Colophon vs Decap, Keystatic and TinaCMS"
  - href: /blog/colophon-vs-strapi/
    text: "Colophon vs Strapi: an honest comparison"
  - href: /blog/colophon-vs-payload/
    text: "Colophon vs Payload CMS: an honest comparison"
  - href: /blog/colophon-vs-directus/
    text: "Colophon vs Directus: an honest comparison"
  - href: /blog/headless-cms-publishing-checklist/
    text: "Six publishing questions a headless CMS should answer"
faq:
  - q: "Is Colophon ready to replace my current CMS?"
    a: "Not for production yet. It is pre-release, run by one maintainer, with no users so far. It is ready to try with Docker, to read, and to judge against the comparisons on this page."
  - q: "Why do these comparisons only describe competitors neutrally?"
    a: "Each comparison says what Colophon does and why it matters, states every competitor fact with a link to that vendor's own page and the date it was checked, and ends with what to know before choosing Colophon. If a fact is wrong or out of date, open an issue and it gets corrected with a dated note."
---

I build Colophon, so read this with that in mind. Each comparison below says who Colophon is for, puts the
facts side by side with a link to the other vendor's own page and the date they were checked, and ends with
what to know before choosing Colophon.

## Who Colophon is for

Colophon is an open-source headless CMS, under the MIT licence, that you run on your own servers with
PostgreSQL. It is built for a team that wants every publish to leave a record it can check: a numbered
release of the whole site, a receipt that says whether readers can see it, a rollback that is reviewed like
any other change, roles down to a single field, and AI agents that can draft but never approve. It is
pre-release, as the status line above says.

## The comparisons

| Comparison | How the other one runs | Licence |
|---|---|---|
| [Colophon vs Strapi](/blog/colophon-vs-strapi/) | Self-hosted, or Strapi Cloud | MIT, with enterprise code under a separate licence |
| [Colophon vs Payload](/blog/colophon-vs-payload/) | Installs into a Next.js app | MIT |
| [Colophon vs Directus](/blog/colophon-vs-directus/) | Self-hosted, or Directus Cloud | Its own source-available licence |
| [Colophon vs Contentful](/compare/colophon-vs-contentful/) | A hosted platform | Commercial service |
| [Colophon vs Sanity](/compare/colophon-vs-sanity/) | Studio anywhere; content in its hosted Content Lake | Studio MIT; hosted store |
| [Colophon vs Storyblok](/compare/colophon-vs-storyblok/) | Hosted spaces, with a visual editor | Commercial service |
| [Colophon vs Decap, Keystatic and TinaCMS](/compare/colophon-vs-git-based-cms/) | Content as files in your git repository | MIT (Decap, Keystatic); Apache-2.0 (TinaCMS) |

The Strapi, Payload and Directus facts were checked on 16 November 2026, and the Contentful, Sanity, Storyblok,
Decap, Keystatic and TinaCMS facts on 19 November 2026. Every row's sources are listed in its comparison.

## What sets Colophon apart

Each of these has a page of its own under [features](/features/).

- **A release of the whole site on every publish.** Any past release can be read by its number, so "what
  did the site say last Tuesday?" has an exact answer. See
  [how to see what your website said on a past date](/blog/website-history-past-date/).
- **A receipt that says whether readers can see it.** A release counts as verified only once a check of
  the live site has seen it. See [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).
- **Rollback as a reviewed change.** It lands as a new release, and it never brings back something that
  was taken down. See [how to roll back a bad CMS publish](/blog/roll-back-a-bad-publish/).
- **Roles down to a field,** with an append-only log of who changed access. See
  [field-level permissions in a headless CMS](/blog/field-level-permissions/).
- **Agents draft; people approve.** The server refuses any token's approval of what a token submitted. See
  [give AI agents CMS access, not the publish button](/blog/ai-agents-cms-permissions/).

## What to know before choosing Colophon

- **It's pre-release.** The first version, 0.1.0-alpha.1, is tagged, and its npm packages aren't published
  yet. Nobody runs it in production.
- **There's no hosted option,** no plugin system that runs your code, and PostgreSQL is the only database.
- **The public delivery API has no language parameter yet,** webhooks aren't signed yet, and there's no
  adapter for a real CDN.
- **The 24-hour soak test hasn't passed yet.** The load results that exist are laptop numbers, labelled as such.
