---
title: "What was live on your site last Tuesday?"
description: "Most CMSs keep history per entry. Colophon numbers every publish as a release, so you can read the whole site at any past release, minus what was taken down since."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["releases", "history"]
draft: false
---

Someone asks what your site said on a particular day. It might be a complaint about a price, an editor checking a correction, a lawyer, or a bug that only showed up for a few hours. You open the CMS and find version history for each entry, one at a time. That tells you how one page changed. It does not easily tell you what the whole site looked like at one moment.

This post explains how I built Colophon to answer that question directly, and where it still falls short.

## Per-entry history versus whole-site history

Most content systems keep revisions per entry. Every save creates a version, and you can compare and restore old ones. That is useful, and Colophon has it too: revisions never change once written, and restoring an old one creates a new revision instead of rewriting the past.

The trouble starts when the question covers more than one entry. "What was live last Tuesday at 3 pm?" means: for every entry, which version was published at that moment, and which entries were not published at all. With per-entry history you have to rebuild that answer yourself, entry by entry, from timestamps. If one entry was published, unpublished and published again, you need every one of those intervals, not just the last.

Colophon keeps a second kind of history alongside revisions: the history of what was published, for the site as a whole.

## Every publish is a numbered release

In Colophon a publish is a changeset: a reviewed set of exact revisions, even when it holds a single entry. Each publish commits as one release. Releases are numbered. Within an environment the number goes up by exactly one per committed release, and it never goes down.

The Studio says it in plain words on the Releases page: "Every publish is a numbered release." Each release in the list shows its number, its title, how many entries changed, who published it and when.

Under the hood, each entry keeps a publication history: a list of intervals over release numbers, each one saying "this revision was live from release A up to, but not including, release B". The intervals for one entry never overlap, and at most one is open. So for any release number, each entry has at most one answer, or none.

That is what makes the question cheap to ask. "What was live at release 41?" is a lookup, not a reconstruction.

## Reading the site as it was at a release

The public content API reads the latest release by default. Add `?generation=` and it reads a past one instead. (Inside Colophon a release number is called a generation. The Studio says "release"; the API says "generation". They are the same number.)

```http
GET /content/v1/{project}/{environment}/{collection}?generation=41
```

The answer carries a `Colophon-Generation` header naming the release it was read at, and each entry in it says which release its version went live in (`published_in`). A few details matter if you are using this for an audit:

- **Pages don't mix releases.** A list's cursor carries the release number of its first page, so paging through a long collection keeps reading the same release even if someone publishes in the middle.
- **A release that doesn't exist is refused.** Asking for a number that hasn't been committed is a `422 invalid_generation` error, not a silent fallback to the latest.
- **References follow the pin.** When a query expands referenced entries, the referenced entries are read at the same release as the page.
- **The cache can't confuse them.** Every cache key includes the release number, so a cached answer for release 41 is never served for release 42.

The TypeScript SDK has the same idea: `delivery(project).atGeneration(41)` returns a client whose every read is pinned to that one release. A static site build can pin itself the same way; [using Colophon as a headless CMS for Astro](/blog/colophon-with-astro/) shows how.

## Turning a date into a release

There is no `?at=2026-11-10T15:00` parameter. The API takes a release number. To answer "last Tuesday", you look at the releases list, which records when each release was published, and take the last release published before the moment you care about. That release was live until the next one went out. Then you read the site at that number.

One more thing happens between "published in Colophon" and "readers saw it": your website has to rebuild or clear its cache. That is a separate problem, and each release records its own receipt of what reached your site: ["Published" should mean readers can see it](/blog/published-means-readers-can-see-it/).

## Rolling back is just another release

If release 41 was right and release 42 was a mistake, Colophon does not move the counter backwards. In the Studio, a past release's page has a "Roll back to this release" button. Through the API it is `POST .../releases/{generation}/rollback`.

Either way, the rollback builds an ordinary changeset. It pins the version that was live at that release for every entry that has changed since, plus an unpublish for every entry that is live now but wasn't then. That changeset then goes through the same review and the same publish as any other change, and it becomes a new release, say 43. Releases 41 and 42 stay in the history exactly as they were.

I chose this on purpose, and wrote up the reasoning in [rollback is a change too](/blog/rollback-is-a-change-too/). A rollback that skipped review would be the one way to change the live site without anyone approving it. Making it a normal changeset means the review rules cover it without any special case. A test in the repository walks through it: publish release 1, publish release 2, roll back to 1 as release 3, then check that reads pinned at 1, 2 and 3 and the latest each return what they should.

## What history will not show you

Time travel never brings back content that has since been taken down. If an entry was unpublished, a pinned read at an old release doesn't return it; the current answer is that it is gone. A rollback doesn't restore a publication that was revoked either. History is a record of what was published, not a way around a takedown. For some audits that's a limit you need to know about: the release list still shows that the release changed entries and how many it took down, but the content itself is no longer served.

Gated content works the same way. A pin to an old release doesn't let a visitor read members-only content their role can't read today.

## How other CMSs handle this

Some systems are moving in this direction at the record level. In June 2026 DatoCMS [added publication ranges to record versions](https://www.datocms.com/product-updates/see-exactly-when-each-version-of-a-record-was-live), with `published_from` and `published_until` metadata. Their announcement documents two limits: a version republished without edits "reflects its latest interval rather than a full multi-interval log", and intervals are not reconstructed for versions that were already live when the feature shipped. It is still per-record history, which is the model I wanted to step away from. The same is true of the open-source CMSs I compared: Strapi, Payload and Directus all keep history per entry or per item, not per release of the whole site (see [Colophon vs Strapi](/blog/colophon-vs-strapi/), [vs Payload](/blog/colophon-vs-payload/) and [vs Directus](/blog/colophon-vs-directus/)).

## Where it stands

Colophon is pre-release (0.1.0-alpha.1) and has no users. I'm building it in public, alone. The pieces above are built and tested: numbered releases, publication intervals, pinned reads through `?generation=`, the SDK's pinned client, and rollback as a reviewed changeset. In the Studio, a release's page has a slider that steps through releases ("Release 3 of 7") and shows each one's receipt. What it does not do yet is show you a rendered page of your site at that release; for now, reading content at a past release goes through the API. My own site isn't running on Colophon in production yet either. That is the next real test.

I write up each step in the build log at [404human.dev/colophon](https://404human.dev/colophon/).
