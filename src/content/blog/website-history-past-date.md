---
title: "How to see what your website said on a past date"
description: "Version history per entry can't show what your whole site said on a given day. The options on any stack, and how numbered releases make it one lookup."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["history", "releases", "versioning", "audit"]
status: "For this topic: there's no way yet to browse a rendered page at an old release, and the release-to-date lookup below goes through the API."
draft: false
---

Someone asks what your site said on a particular day. It might be a complaint about a price, an editor checking when a correction went out, a lawyer, or a bug that only showed for a few hours. You open the CMS and find version history for each entry, one at a time. That tells you how one page changed. It doesn't easily tell you what the whole site looked like at one moment.

This post covers the ways to answer that question on any stack, what each one can and can't show, and the data model that turns it into a single lookup. Colophon, the CMS I build, is the worked example in the second half. It is the starting point for everything on this blog about history, [rolling back a bad publish](/blog/roll-back-a-bad-publish/) and [not losing edits](/blog/cms-lost-edits/).

## The short answer

Per-entry version history answers "how did this page change?", not "what was live at 3 pm on Tuesday?". For the second question you need either a snapshot of the whole site from that moment (a web archive, an old build, a git commit, a database restored to that time) or a CMS that records when each version was live. The snapshot options work on any stack but each has gaps. The data-model option is cheap once it exists: keep, for every entry, the span during which each version was published, and number your publishes so "Tuesday at 3 pm" becomes one number.

## Why per-entry history can't answer it

Most content systems keep [revisions](/blog/headless-cms-glossary/#revision) per entry: every save creates a version, and you can compare and restore old ones. That is useful, and it answers a different question.

"What was live last Tuesday at 3 pm?" means: for every entry, which version was published at that moment, and which entries weren't published at all. With per-entry history you rebuild that answer yourself, entry by entry, from timestamps. Versions saved but never published get in the way. An entry that was published, taken down and published again needs every one of those spans, not only the last. And a list page or a navigation menu that was built from twenty entries needs all twenty answered for the same moment.

## Options that work on any stack

| Option | What it shows | Good for | Gaps |
|---|---|---|---|
| A web archive, such as the Wayback Machine | Rendered pages, as a crawler saw them | Public pages, with no setup | Only what was crawled, and only when; the nearest capture may be days off |
| Old builds kept by your host | The exact HTML you deployed | Static sites | Only as far back as builds are kept; a deploy time is not a publish time |
| Git history (git-based CMSs) | Content files at any commit | Decap, Keystatic, Tina and similar | A commit is not a deploy; pages built from several files need a build to see |
| Database point-in-time recovery | Everything, as stored at a moment | Disasters and audits with time to spare | Heavy: restore a copy, then query it; drafts and published content are mixed |
| Audit or activity logs | Who changed what, and when | The "who" | Rarely stores the content itself |

Two of these are worth trying right now.

**Ask the Wayback Machine for the capture nearest your moment.** Its availability API returns the closest snapshot it has, and its timestamp, which you must check:

```sh
curl -s "https://archive.org/wayback/available?url=example.com/pricing&timestamp=20261110150000"
```

**On a git-based CMS, read the content as it was committed at that time.** This finds the last commit on `main` before the moment and prints a file from it:

```sh
rev=$(git rev-list -1 --before="2026-11-10 15:00:00 +0000" main)
git show "$rev:content/pages/pricing.md"
```

Both answer "what existed", not quite "what readers saw". A commit still had to be built and deployed, and a capture shows one URL from one crawler's point of view. If the answer matters, say which of the two you have.

## The data model that makes it cheap

The idea behind every cheap answer is the same: record when each version was live, for every entry, and give the moments a name.

Number every publish. A publish that changes five entries is release 41; the next publish is release 42. Then, for each entry, keep a [publication interval](/blog/headless-cms-glossary/#publication-interval) for each time a version was live: "this version was live from release A up to, but not including, release B". An entry has at most one open interval, and its intervals never overlap. "What was live at release 41" becomes: every interval that contains 41.

<figure>
<svg viewBox="0 0 640 300" role="img" aria-labelledby="intervals-title intervals-desc" xmlns="http://www.w3.org/2000/svg" font-family="Geist, sans-serif">
<title id="intervals-title">Publication intervals for three entries across releases 39 to 44</title>
<desc id="intervals-desc">Pricing: version 1 live from release 39 until release 42, then version 2 from 42 onwards. About: version 1 live from 39 onwards. Promo: version 1 live from release 40 until 43, when it was taken down. A dashed line at release 41, Tuesday at 3 pm, crosses pricing version 1, about version 1 and promo version 1: that is what was live.</desc>
<g font-size="17" fill="#000" font-weight="600">
<text x="0" y="69">Pricing</text>
<text x="0" y="129">About</text>
<text x="0" y="189">Promo</text>
</g>
<g fill="#f2f2f2" stroke="#000" stroke-width="1.5">
<rect x="160" y="48" width="270" height="30" rx="6"/>
<rect x="430" y="48" width="200" height="30" rx="6"/>
<rect x="160" y="108" width="470" height="30" rx="6"/>
<rect x="250" y="168" width="270" height="30" rx="6"/>
</g>
<g font-size="15" fill="#000">
<text x="172" y="68">version 1</text>
<text x="442" y="68">version 2 →</text>
<text x="172" y="128">version 1 →</text>
<text x="262" y="188">version 1</text>
<text x="530" y="188" fill="#5e5e5e">taken down</text>
</g>
<path d="M520 160v46" stroke="#000" stroke-width="3"/>
<path d="M340 30v200" stroke="#000" stroke-width="1.5" stroke-dasharray="5 5"/>
<text x="348" y="24" font-size="15" fill="#000" font-weight="600">Tuesday 3 pm = release 41</text>
<g stroke="#8c8c8c" stroke-width="1"><path d="M160 238h470"/><path d="M160 232v12M250 232v12M340 232v12M430 232v12M520 232v12M610 232v12"/></g>
<g font-size="15" fill="#5e5e5e" text-anchor="middle">
<text x="160" y="266">39</text><text x="250" y="266">40</text><text x="340" y="266">41</text><text x="430" y="266">42</text><text x="520" y="266">43</text><text x="610" y="266">44</text>
<text x="395" y="292">release number</text>
</g>
</svg>
<figcaption>Each bar is the span during which one version was live. Whatever the dashed line crosses is the site at release 41.</figcaption>
</figure>

In a relational database it is one table and one query. A sketch in PostgreSQL, where the exclusion constraint makes overlapping intervals for one entry impossible rather than unlikely:

```sql
create extension if not exists btree_gist;

create table publications (
  entry_id    bigint not null,
  revision_id bigint not null,
  valid_from  bigint not null,   -- the release that published this revision
  valid_to    bigint,            -- the release that replaced or removed it; null while live
  exclude using gist (entry_id with =, int8range(valid_from, valid_to) with &&)
);

-- What was live at release 41: one lookup, no reconstruction.
select entry_id, revision_id
from publications
where valid_from <= 41
  and (valid_to is null or valid_to > 41);
```

The last piece is a table of releases with the time each was published, which turns a date into a number: the last release published before the moment is the one that was live.

## How Colophon answers it

Colophon is built on that model. Every publish is a numbered [release](/blog/headless-cms-glossary/#release), committed in one transaction; within an environment the number goes up by exactly one per release and never goes back. Each entry keeps its publication intervals over release numbers, enforced by the database. Revisions never change once written, so "release 41" names exact content.

The public content API reads the latest release by default. Add `?generation=` and it reads a past one instead (the API calls a release number a generation):

```http
GET /content/v1/{project}/{environment}/{collection}?generation=41
```

To go from a date to a release, list the releases, which records when each was published, and take the last one at or before your moment. A sketch in TypeScript for Node 22 or later, written against the API document on Colophon's `main` as of 17 November 2026:

```ts
const api = process.env.COLOPHON_API!; // e.g. https://cms.example.com
const project = process.env.COLOPHON_PROJECT!; // the project's id
const token = process.env.COLOPHON_TOKEN!; // an API token that can read
const environment = 'production';

type Release = { generation: number; published_at: string };

/** The release that was live at `moment`, or null if nothing was published yet. */
async function releaseAt(moment: Date): Promise<number | null> {
  let cursor: string | null = null;
  do {
    const url = new URL(`/api/v1/projects/${project}/environments/${environment}/releases`, api);
    if (cursor !== null) url.searchParams.set('cursor', cursor);
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`releases: HTTP ${response.status}`);
    const page = (await response.json()) as { data: Release[]; next_cursor: string | null };
    // Newest first, so the first one published at or before the moment was live then.
    const live = page.data.find((release) => new Date(release.published_at) <= moment);
    if (live) return live.generation;
    cursor = page.next_cursor;
  } while (cursor !== null);
  return null;
}

const generation = await releaseAt(new Date('2026-11-10T15:00:00Z'));
if (generation === null) throw new Error('nothing was published yet at that moment');
const pages = await fetch(new URL(`/content/v1/${project}/${environment}/pages?generation=${generation}`, api));
console.log(`release ${pages.headers.get('colophon-generation')}`, await pages.json());
```

A few details matter if you use this for an audit:

- **Pages don't mix releases.** A list's cursor carries the release number of its first page, so paging through a long collection keeps reading the same release even if someone publishes in the middle.
- **References follow the pin.** When a query expands referenced entries, they are read at the same release as the page.
- **A release that doesn't exist is refused**, never answered quietly from the latest one.
- **The cache can't confuse them.** Every cache key includes the release number, so an answer cached for release 41 is never served for release 42.

A static build can pin itself the same way, which keeps every page of one build on one release; [using Colophon as a headless CMS for Astro](/blog/astro-headless-cms/) shows how. A release published in Colophon still has to reach readers through rebuilds and caches, and each release keeps a receipt of that: [why your site shows old content after publishing](/blog/website-not-updating-after-publish/).

## What history won't show you

- **Content taken down stays down.** If an entry was unpublished, a read pinned to an old release doesn't return it; the answer is that it's gone, at every release number. The release list still shows that a release changed entries and how many it took down, but the content isn't served. For some audits that is a limit to know about; it is also what makes a takedown real.
- **Gated content stays gated.** A pin to an old release doesn't let a visitor read members-only content their role can't read today.
- **No rendered pages yet.** In the Studio, a release's page has a slider that steps through releases and shows each receipt, but there's no way yet to browse a rendered page of your site as it was at that release. Past content is read through the API.
- **A release time is not a reader time.** A release was live in Colophon from the moment it committed. When readers saw it depends on your site; the receipt records what a site check saw, and when.

Undoing a release is the other half of history. A rollback in Colophon doesn't move the counter back: it builds a reviewed change that becomes a new release, and both stay in the history. [Rolling back a release as a reviewed change](/blog/roll-back-a-bad-publish/) covers why.

## How other CMSs handle this

Some CMSs are moving in this direction at the record level. In June 2026 DatoCMS [added publication ranges to record versions](https://www.datocms.com/product-updates/see-exactly-when-each-version-of-a-record-was-live), with `published_from` and `published_until` metadata (checked 16 November 2026). Their announcement documents two limits: a version republished without edits "reflects its latest interval rather than a full multi-interval log", and intervals aren't reconstructed for versions that were already live when the feature shipped. It is still per-record history. Strapi, Payload and Directus also keep history per entry or per item, not per release of the whole site; the comparisons with [Strapi](/blog/colophon-vs-strapi/), [Payload](/blog/colophon-vs-payload/) and [Directus](/blog/colophon-vs-directus/) have the details and sources. Git-based CMSs get whole-site history from git itself, with the gap between a commit and a deploy described above.

## FAQ

**Can I prove what a reader saw, not only what was published?** Only with a record made at the time, from the reader's side: a web archive capture, a stored copy of the HTML, or a check of the live page that kept what it saw. A CMS can prove what it served; caches and builds sit between that and the reader.

**How far back can I go?** As far as your records go. Web archives depend on crawls, hosts on how many builds they keep, git on its history. In Colophon, revisions and publication history aren't deleted by retention, so every release can be read back, except content taken down since.

**Why number releases instead of using timestamps?** Two publishes can land in the same millisecond, clocks on different servers disagree, and "the site at 15:00" is ambiguous if a publish was half-applied at 15:00. A number that goes up by one per complete publish has none of those problems. Timestamps are still recorded; they map a date to a number.

**Is this the same as a backup?** No. A backup restores everything, drafts included, to a moment, and is for disasters. Release history answers questions about what was published while the system keeps running.
