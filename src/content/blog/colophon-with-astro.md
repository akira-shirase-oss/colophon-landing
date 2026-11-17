---
title: "Using Colophon as a headless CMS for Astro"
description: "Build a static Astro site from Colophon's public delivery API: page through a collection at one release, mark pages with it, and rebuild on publish."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["astro", "tutorial", "headless cms", "static sites"]
draft: false
---

Astro and a headless CMS fit well: the CMS holds content, Astro reads it at build time and ships plain HTML. This guide shows how to do that with Colophon, an open-source CMS I'm building, using only its public delivery API. It's the same approach the five Astro demo sites in Colophon's repository use.

First, an honest prerequisite. Colophon is pre-release (0.1.0-alpha.1) and isn't published to npm or any package registry yet, so to follow along you run Colophon from its [repository](https://github.com/akira-shirase-oss/colophon-cms) on your own machine, as its README describes. Nothing below needs Colophon's SDK; it's plain `fetch`.

## The delivery API in one paragraph

Published content is public, read without a credential, at:

```http
GET /content/v1/{project}/{environment}/{collection}
GET /content/v1/{project}/{environment}/{collection}/{entry}
```

`{project}` is the project's id, `{environment}` is usually `production`, and `{collection}` is the content type's slug. A list takes `limit` (1 to 100, default 20), `cursor` for the next page and `generation` to read a past release. Drafts never appear here. Every answer has a `Colophon-Generation` header naming the release it was read at; inside Colophon a release number is called a generation.

A list answer looks like this:

```json
{
  "data": [
    {
      "id": "…",
      "revision_id": "…",
      "collection": "posts",
      "title": "Hello",
      "slug": "hello",
      "content": { "title": "Hello", "body": { "type": "doc", "content": [] } },
      "content_hash": "…",
      "published_in": 3
    }
  ],
  "next_cursor": null
}
```

`slug` is there when the content type has a URL name field (the field types are in [content modeling that checks your stored entries](/blog/content-modeling-in-colophon/)). `published_in` is the release this version went live in.

## Step 1: read a collection at one release

Put the connection in environment variables so the same build works locally and in CI: `COLOPHON_API` (the server's origin), `COLOPHON_PROJECT` and `COLOPHON_ENVIRONMENT`. You can copy an entry's public address with Copy public link in the Studio; the project id is the first part of the path after `/content/v1/`.

Then a small module that pages through a collection:

```ts
// src/lib/colophon.ts — build-time reads of Colophon's public delivery API.
const api = process.env.COLOPHON_API!; // e.g. https://cms.example.com
const project = process.env.COLOPHON_PROJECT!; // the project's id
const environment = process.env.COLOPHON_ENVIRONMENT ?? 'production';

export interface Entry {
  id: string;
  revision_id: string;
  collection: string;
  title: string;
  slug?: string;
  content: Record<string, unknown>;
  content_hash: string;
  published_in: number; // the release this version went live in
}

/** Every published entry of a collection, read at one release. */
export async function entries(
  collection: string,
  generation?: number,
): Promise<{ items: Entry[]; generation: number }> {
  const base = `${api}/content/v1/${project}/${environment}/${collection}`;
  const items: Entry[] = [];
  let release = generation ?? 0;
  let cursor: string | null = null;
  for (let page = 0; page < 50; page += 1) {
    const url = new URL(base);
    url.searchParams.set('limit', '100');
    if (cursor !== null) url.searchParams.set('cursor', cursor);
    else if (generation !== undefined) url.searchParams.set('generation', String(generation));
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`GET ${url.pathname}: HTTP ${response.status}`);
    const header = response.headers.get('colophon-generation');
    const named = header === null ? NaN : Number(header);
    if (Number.isSafeInteger(named) && named > 0) release = named;
    const body = (await response.json()) as { data: Entry[]; next_cursor: string | null };
    items.push(...body.data);
    cursor = body.next_cursor;
    if (cursor === null) break;
  }
  return { items, generation: release };
}

/** The public address of an uploaded file, optionally a rendition such as `w1280`. */
export function mediaUrl(asset: string, rendition?: string): string {
  const base = `${api}/media/v1/${project}/${environment}/${asset}`;
  return rendition === undefined ? base : `${base}/${rendition}`;
}
```

Three details are doing real work here:

- **The cursor keeps the release.** A cursor carries the release number of the first page, so if someone publishes while your build is paging through 500 posts, every page still comes from the same release. You never get half old, half new.
- **Throwing on errors is deliberate.** A build that can't read its CMS should fail, not deploy an empty site.
- **The loop is bounded.** Fifty pages of 100 is 5,000 entries; raise it if you need more, but keep a limit.

## Step 2: keep the whole build on one release

Each call without `generation` reads the latest release at that moment. If your site reads two collections and a publish lands between the two calls, they could come from different releases. Pin the second read to the first one's release:

```ts
const posts = await entries('posts');
// Release 0 means nothing is published yet; there's nothing to pin to.
const authors = await entries('authors', posts.generation > 0 ? posts.generation : undefined);
```

Asking for a release that doesn't exist, including release 0, is refused with a `422` whose `error.details.reason` is `invalid_generation`, never quietly answered from the latest one.

## Step 3: pages from entries

```astro
---
// src/pages/posts/[slug].astro
import { entries, type Entry } from '../../lib/colophon';
import Base from '../../layouts/Base.astro';

export async function getStaticPaths() {
  const { items, generation } = await entries('posts');
  return items.map((post) => ({
    params: { slug: post.slug ?? post.id },
    props: { post, generation },
  }));
}

const { post, generation } = Astro.props as { post: Entry; generation: number };
---

<Base title={post.title} generation={generation}>
  <h1>{post.title}</h1>
</Base>
```

For uploaded images, an upload field holds the upload's id, and `mediaUrl(id, 'w1280')` or `'w320'` gives a resized rendition that the demo sites use.

Rich text is stored as validated JSON, not HTML. The demo sites render it with `@colophon/content-renderer`, a package in the repository that isn't on npm yet; until it is, use it from the repository or render the JSON yourself following the documented format in `docs/formats/rich-text-v1.md`. Images inside rich text are placeholders for now.

## Step 4: mark every page with its release

This is the step most guides don't have, and it's what lets Colophon tell you whether readers can see a release. A static page can't send headers, so it carries a marker instead:

```astro
---
// src/layouts/Base.astro
const { title, generation } = Astro.props as { title: string; generation?: number };
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{title}</title>
    {generation !== undefined && generation > 0 && (
      <meta name="colophon-generation" content={String(generation)} />
    )}
  </head>
  <body><slot /></body>
</html>
```

Release 0 means nothing has been published yet, so the marker is left out. The site check reads the marker in exactly this form: `name` before `content`, both double-quoted, within the first megabyte of the page. Astro writes it that way; a hand-written variant with the attributes swapped or single quotes counts as no marker.

## Step 5: rebuild when you publish

In the Studio, open Settings, then Website connections, and add a connection:

- **Site rebuild** is a webhook. After each release commits, Colophon's worker sends a `POST` with JSON naming the event (`release.committed`), the release number and the entries it changed, plus an `Idempotency-Key` header that stays the same if it has to resend. Point it at whatever starts your build. A `2xx` answer counts as delivered; timeouts and errors such as `429` and `503` are retried with backoff, up to five attempts.
- **Site check** reads a page of your live site after each release and looks for the `colophon-generation` marker. When it sees the new release, or a later one, the release's receipt says verified at 1 location. Until then it says website update pending. If it never does, it says needs attention, and why.

Both kinds of connection must point at a public `https` address. Colophon checks that when you save the connection and again before every attempt, so an address that later resolves somewhere private is refused too. On a development machine, the repository's `deploy/local.env` turns on a development-only setting that lets connections reach local `http` addresses, which is how the demo sites run; never copy that file into production.

I haven't tested specific hosts' deploy hooks, so check that yours accepts a `POST` with a JSON body. Two things to know about the webhook today: its payloads aren't signed yet, and the repository's own demo hook rebuilds from the API rather than trusting the payload. That's a good pattern anyway: a forged call can then cause at most an extra build, because the build reads its content from Colophon. How receipts work is covered in ["Published" should mean readers can see it](/blog/published-means-readers-can-see-it/).

## What this setup doesn't do yet

- **Preview.** There's no draft preview for editors yet. Your site only ever sees published content.
- **Locales.** The delivery API can't select a locale yet.
- **Live pages.** One of the demo sites renders on request and listens to Colophon's event stream to refresh open pages after a publish. That's a different setup, not covered here.

## Where it stands

Colophon is pre-release (0.1.0-alpha.1) and has no users. The delivery API, the generation marker, site rebuilds and site checks are built and tested, and the five demo sites in `apps/sites` show this end to end on a local machine. To see what a release pins and how to read an old one, read [what was live on your site last Tuesday?](/blog/what-was-live-last-tuesday/) The build log is at [404human.dev/colophon](https://404human.dev/colophon/).
