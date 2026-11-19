---
kind: use-case
title: "Members-only content on a headless CMS"
description: "Gating articles behind a sign-in without leaking them through caches, counts or live updates, and enforcing it in the database instead of in page code."
targetQuery: "headless cms gated content members only"
pubDate: 2026-11-19
related:
  - href: /use-cases/audited-publishing/
    text: "A CMS with an audit trail for every publish"
  - href: /use-cases/ai-agents-draft-people-publish/
    text: "Let AI agents draft content, and people publish"
  - href: /use-cases/static-site-fresh-after-publish/
    text: "Keep a static site fresh after every publish"
  - href: /blog/field-level-permissions/
    text: "Field-level permissions in a headless CMS"
  - href: https://docs.colophon.404human.dev/api/delivery/
    text: "The delivery API, in the docs"
faq:
  - q: "How do members sign in?"
    a: "With a password, or with a magic link sent by email to an address on a list of approved sites. Each site user gets an audience role, managed under Audience in the Studio."
  - q: "Can I gate content by plan or tier?"
    a: "Yes, through audience roles: an entry can be visible to everyone, to any signed-in site user, or to one named role. Payments aren't part of Colophon; your site or billing system decides which role a member has."
  - q: "Is anyone using this in production?"
    a: "No. The audience feature is built and tested, and one of the demo sites uses it end to end, but Colophon has no users yet."
---

Putting some articles behind a sign-in looks like a login problem. Most leaks happen elsewhere: a shared cache
that serves a member's page to the next visitor, a CDN that stored an answer meant for one person, a count or
search result that reveals a gated article exists, a live-update stream that names it, or a check that lives only in
page code, so one forgotten route skips it.

## Where gated content leaks

1. **Shared caches.** If the cache key doesn't include who is asking, a member's answer is served to strangers.
2. **The CDN.** A response without `Cache-Control: private` can be stored at the edge for everyone.
3. **Existence.** Totals, search results, sitemaps and "related posts" can show a title that the page itself hides.
4. **Live updates.** A stream that says "entry X changed" tells anyone listening that X exists.
5. **Checks in application code only.** Every new route has to remember the rule, and one that forgets serves it.

## How Colophon does it

Each published revision carries its own visibility: `public`, `authenticated`, or `role:<name>`. The delivery API
enforces it in PostgreSQL itself, with row-level security on the published content, so a route can't forget it.
Members' reads skip the shared cache and are sent with `Cache-Control: private, no-cache` and
`Vary: Authorization, Cookie`, so neither Colophon's cache nor a CDN keeps them for others. An expired or revoked
credential is treated as anonymous rather than as an error that might reveal something. The public live-update
stream says only that something changed, never what, so it reveals nothing gated. Site users sign in with a
password or a magic link to an approved site. The background, from permissions down to the database, is in
[field-level permissions in a headless CMS](/blog/field-level-permissions/).

## Check your own CMS

Sign in as a member, load a gated article, then load it again signed out from another browser, through your CDN.
Check the response headers for `private`. Search and list the collection while signed out, and count the results.

## What to know before choosing Colophon

- **It's pre-release, and the audience feature has no users yet.** It's built, tested, and used end to end by one of
  the demo sites.
- **There's no billing.** Colophon decides who may read; who pays is up to your site.
- **The public delivery API has no language parameter yet,** so a multilingual members' area needs care today.
