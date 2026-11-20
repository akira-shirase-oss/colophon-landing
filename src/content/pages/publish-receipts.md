---
kind: feature
title: "Publish receipts: proof of what readers see"
description: "Every publish in Colophon gets a receipt: what went live, what each website connection did, and whether a check of the live site saw it. How it works."
targetQuery: "headless cms publish verification"
pubDate: 2026-11-19
related:
  - href: /features/
    text: "All of Colophon's features"
  - href: /blog/website-not-updating-after-publish/
    text: "Why your site shows old content after publishing"
  - href: /use-cases/static-site-fresh-after-publish/
    text: "Keep a static site fresh after every publish"
  - href: https://docs.colophon.404human.dev/api/website-connections/
    text: "Website connections and receipts, in the docs"
faq:
  - q: "Does a receipt prove every reader sees the new content?"
    a: "No. It proves that site checks saw the release on your live site, from the places they ran. A reader's browser cache, a copy already downloaded or a cache the checks don't pass through can still hold an older page."
  - q: "What does a site check look for?"
    a: "The release number on a page of your live site, usually in a meta tag the site writes when it is built. A check that finds this release, or a later one, counts towards Verified."
  - q: "Do I need a site check at all?"
    a: "No, but without one a receipt can only say Published: Colophon knows what it served, not what your website shows."
---

Yes: every publish in Colophon ends with a receipt. It says what went live, what each of your website connections
did with it, and whether a check of your live site has seen it. A release is only ever called **verified** when a
check saw it, and then it says from how many places.

This page explains how receipts work. Why "published" usually isn't the same as "visible", on any CMS, is in
[why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

## What a receipt says

Each release gets one of four labels, on the **Releases** page and on its receipt:

| Label | Meaning |
|---|---|
| **Published** | Live in Colophon. No website connection was on, or every one is done but no site check looked. |
| **Website update pending** | A delivery or a check is still on its way. The label settles by itself. |
| **Verified at N locations** | Every connection is done, and site checks saw this release, or a later one, from N distinct places. |
| **Needs attention** | A connection gave up on this release. The receipt says which one failed. |

A failure anywhere outranks everything else, then anything still on its way.

## Where the evidence comes from

Website connections do the telling after each release, and there are three kinds:

- **Site rebuild** posts an announcement of the release to your build hook, so a static site rebuilds. The
  announcement carries a key that stays the same on every attempt, so your receiver can drop repeats.
- **Cache clear** posts the cache tags the release changed to your CDN's purge address.
- **Site check** reads a page of your live site and looks for the release number in it.

The first two send something; only a site check proves anything about what readers get. Checks can run from more
than one place, so a release can be **Verified at 2 locations**. Deliveries retry with backoff: a rebuild or a
cache clear gets 5 attempts, a site check 10, and a job not finished an hour after it was created fails, which
shows as **Needs attention**.

## How to set it up

1. In the Studio, open **Settings** → **Website connections** and add a **Site rebuild** pointing at your
   host's build hook.
2. Add a **Site check** pointing at a page of your live site.
3. Have your site write the release number it was built from into every page, as
   `<meta name="colophon-generation" content="…">`. The [Astro tutorial](/blog/astro-headless-cms/) shows how.

The setup, with the API calls, is in the docs'
[website connections and receipts](https://docs.colophon.404human.dev/api/website-connections/).

## What to know before choosing Colophon

- **There's no built-in adapter for a real CDN yet.** Cache-clear jobs post to the purge address you give
  them, and they are tested against a stand-in CDN. Hosted CMSs such as Contentful run their own CDN for you,
  which is less to set up.
- **Announcements aren't signed yet.** Put a long random secret in the build hook's address.
- **It's pre-release,** and nobody runs it in production yet.
