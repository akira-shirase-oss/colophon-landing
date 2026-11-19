---
kind: use-case
title: "Keep a static site fresh after every publish"
description: "Rebuilding a static site when CMS content changes: at-least-once webhooks, duplicate and late announcements, and checking that the live page changed."
targetQuery: "rebuild static site on cms publish webhook"
pubDate: 2026-11-19
related:
  - href: /use-cases/audited-publishing/
    text: "A CMS with an audit trail for every publish"
  - href: /use-cases/ai-agents-draft-people-publish/
    text: "Let AI agents draft content, and people publish"
  - href: /use-cases/members-only-content/
    text: "Members-only content on a headless CMS"
  - href: /blog/website-not-updating-after-publish/
    text: "Why your site shows old content after publishing"
  - href: /blog/astro-headless-cms/
    text: "Using Colophon as a headless CMS for Astro"
  - href: https://docs.colophon.404human.dev/api/website-connections/
    text: "Website connections and receipts, in the docs"
faq:
  - q: "Do I need a static site to use Colophon?"
    a: "No. A site can also render per request and read Colophon's delivery API live, with a stream that says when something changed. Static builds are one way to serve it."
  - q: "Are Colophon's webhooks signed?"
    a: "Not yet. Put a long random secret in the destination URL and check it in your receiver, and keep in mind that anyone who can read the project's website connections can see that URL."
  - q: "What if a build fails?"
    a: "The receipt for that release won't reach verified, because the site check doesn't see the release on the live page. It stays pending, or needs attention, until a later build gets it there."
---

Static sites are fast and cheap to host, and the price is that a publish in the CMS changes nothing until the site
rebuilds. The usual fix is a webhook to your host's build hook. That works most of the time. It fails in ways that
are hard to see: the webhook arrives twice and builds twice, arrives late and builds an older state, never arrives,
or arrives and the build fails, while the CMS still says "published".

## What a rebuild pipeline has to handle

- **Duplicates.** Over a network, delivery can only be at least once: a request that landed but whose answer was
  lost gets sent again. Your receiver should drop repeats by a stable key.
- **Order.** Announcements can arrive late or out of order. Build the newest state you've heard of, and re-read
  content from the API instead of trusting the payload.
- **Bursts.** Ten publishes in a minute shouldn't mean ten builds in parallel. Build one at a time, and build the
  newest when the current one finishes.
- **Proof.** "The hook fired" isn't "readers see it". Mark each page with the version it was built from, and check the
  live page.

The step-by-step diagnosis, for any CMS, is in
[why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

## How Colophon does it

Each release is announced to every website connection as `release.committed`, with an `Idempotency-Key` that is the
same on every attempt and a `Colophon-Generation` header carrying the release number. Delivery is at least once, from
a leased job that retries with backoff, to `https` and public addresses only. Five Astro demo sites in the repository
rebuild themselves on publish this way, building the newest release they've been told about, one build at a time.
Then the release's receipt moves from **pending** to **verified at N locations** only when a site check sees that
release's marker on the live page. A tutorial for Astro, marker included, is in
[using Colophon as a headless CMS for Astro](/blog/astro-headless-cms/).

## Check your own pipeline

Publish twice within a second and count the builds. Publish, then fail the build on purpose, and see whether
anything tells you. Look at a live page and ask which version of the content it shows.

## What to know before choosing Colophon

- **It's pre-release,** with no users yet.
- **Announcements aren't signed yet;** use a secret in the URL and treat it as visible to anyone who can read the
  project's website connections.
- **There's no adapter for a real CDN yet.** Purge-by-tag jobs are built and tested against a stand-in.
