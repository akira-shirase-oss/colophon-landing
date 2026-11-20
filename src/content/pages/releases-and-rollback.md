---
kind: feature
title: "Releases and rollback in a headless CMS"
description: "In Colophon every publish is a numbered release of the whole site that you can read later, and a rollback is a reviewed change that lands as a new release."
targetQuery: "headless cms content release rollback"
pubDate: 2026-11-19
related:
  - href: /features/
    text: "All of Colophon's features"
  - href: /blog/roll-back-a-bad-publish/
    text: "How to roll back a bad CMS publish"
  - href: /blog/website-history-past-date/
    text: "How to see what your website said on a past date"
  - href: https://docs.colophon.404human.dev/studio/rollback/
    text: "Rollback, in the docs"
faq:
  - q: "Can I roll back one entry instead of a whole release?"
    a: "Yes. An entry's History tab restores an older version of that entry as a new draft, which you then publish like any change. A rollback to a release puts back everything that release published."
  - q: "Does a rollback delete the releases after it?"
    a: "No. It makes a new release holding what the earlier one held. The releases in between stay in the list with their receipts, so the record of what was live, and when, is never rewritten."
  - q: "Can a site read an old release?"
    a: "Yes. The delivery API answers ?generation=N with the content exactly as release N published it, for as long as you keep the data."
---

Yes. Every publish in Colophon is a numbered release of everything live in that environment, committed in one
step and kept. You can read any past release by its number, and rolling back makes a new release that puts the
earlier content back, after the same review as any other change.

This page explains how it works. Why per-entry history isn't enough to answer "what did the site say on Tuesday?"
is in [how to see what your website said on a past date](/blog/website-history-past-date/).

## A release is the whole site

Publishing in Colophon always goes through a **publish request**: a list of exact versions of entries that someone
approves, and that becomes the next release when published. An approval counts only for exactly those versions,
so an edit after approval needs approving again. Approvals expire after seven days.

Each release has a number that only goes up, a receipt, and the exact versions it published. A site can read any
of them: the delivery API answers `?generation=N` with the content as release N published it, every reference
included. That is what lets a site build from one consistent version; the
[Astro tutorial](/blog/astro-headless-cms/) shows how.

## Rolling back

1. Open **Releases**, press the release you want back, and press **Roll back to this release**.
2. Colophon builds a publish request named after it. For each entry, it holds the version that was live then,
   or a take-down for an entry that is live now but wasn't then.
3. Review it, approve it and publish it, like any publish request. Review stages apply too.

Publishing the rollback makes the **next** release. After rolling back to release 4 from release 6, the live
release is 7, holding what 4 held, and 5 and 6 stay in the list with their receipts.

**A rollback never brings back an entry that was taken down,** even when you roll back to a release in which it
was live. A takedown is a decision; undoing it should be its own decision.

## What to know before choosing Colophon

- **Rollback is reviewed, so it isn't instant.** A team that wants a one-click revert with no second person may
  find this slower. On a team of one, your own approval is recorded and shown as such.
- **It's pre-release,** and nobody runs it in production yet.

The steps, with screenshots, are in the docs' [rollback](https://docs.colophon.404human.dev/studio/rollback/)
and [history](https://docs.colophon.404human.dev/studio/history/) pages.
