---
title: "Why your site shows old content after publishing"
description: "The CMS says published, the site shows the old page. Check each layer in turn (API, build, CDN, browser), fix the one at fault, and make it visible."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["publishing", "caching", "cdn", "static sites", "troubleshooting"]
status: "For this topic: webhook payloads aren't signed yet, cache clears are tested against a fake CDN only, and site checks run from one location by default."
draft: false
---

You press publish. The CMS says published. You open the site and it still shows the old headline. You refresh, and it's still old. Someone asks in chat whether it went out, and the honest answer is "I think so".

This post is for that moment. It explains where the old copy is hiding, gives you four checks you can run from a terminal in a few minutes, and shows how to fix each layer so it doesn't happen again. It works for any headless CMS. Colophon, the CMS I build, appears near the end as one worked example. This is one of the [six publishing questions a CMS should answer](/blog/headless-cms-publishing-checklist/): can readers see it yet?

## The short answer

"Published" means one thing for certain: the CMS's own database changed. Between that database and a reader there are usually up to four more copies of your page: the content API's cache, a static build, a [CDN](/blog/headless-cms-glossary/#cdn) edge and the reader's browser. Each has its own clock. Check them in order, from the CMS outwards. The first layer that still shows the old content is the one at fault. Fix it with a rebuild, a [purge](/blog/headless-cms-glossary/#purge) or a shorter cache lifetime, and make every page say which version it is, so next time you can tell in one command.

## Where old copies hide

<figure>
<svg viewBox="0 0 640 520" role="img" aria-labelledby="layers-title layers-desc" xmlns="http://www.w3.org/2000/svg" font-family="Geist, sans-serif">
<title id="layers-title">Where an old copy can hide between publish and reader</title>
<desc id="layers-desc">Five layers in order. The CMS database changes when you publish. The content API and its cache can still answer with an old copy until the cache expires or is cleared. The site build is old until a rebuild runs and goes live. The CDN edge is old until its copy expires or is purged at that edge. The browser is old until its own copy is no longer fresh.</desc>
<g stroke-width="1.5" style="fill: var(--c-figure-fill); stroke: var(--c-figure-ink)">
<rect x="1" y="8" width="232" height="64" rx="12"/>
<rect x="1" y="112" width="232" height="64" rx="12"/>
<rect x="1" y="216" width="232" height="64" rx="12"/>
<rect x="1" y="320" width="232" height="64" rx="12"/>
<rect x="1" y="424" width="232" height="64" rx="12"/>
</g>
<g stroke-width="1.5" fill="none" style="stroke: var(--c-figure-ink)">
<path d="M117 72v32m-6-8 6 8 6-8"/>
<path d="M117 176v32m-6-8 6 8 6-8"/>
<path d="M117 280v32m-6-8 6 8 6-8"/>
<path d="M117 384v32m-6-8 6 8 6-8"/>
</g>
<g font-size="20" font-weight="600" text-anchor="middle" style="fill: var(--c-figure-ink)">
<text x="117" y="47">CMS database</text>
<text x="117" y="151">Content API + cache</text>
<text x="117" y="255">Site build</text>
<text x="117" y="359">CDN edge</text>
<text x="117" y="463">Browser</text>
</g>
<g font-size="17" style="fill: var(--c-figure-text)">
<text x="256" y="36">Publishing changes this layer.</text>
<text x="256" y="58">Nothing after it has moved yet.</text>
<text x="256" y="140">Old until its cache expires</text>
<text x="256" y="162">or is cleared.</text>
<text x="256" y="244">Old until a rebuild runs, succeeds</text>
<text x="256" y="266">and goes live.</text>
<text x="256" y="348">Old until its copy expires or is</text>
<text x="256" y="370">purged, edge by edge.</text>
<text x="256" y="452">Old until its own copy stops</text>
<text x="256" y="474">being fresh. Only this reader.</text>
</g>
</svg>
<figcaption>Each layer after the database can answer with an older copy, and each one is moved by something different: an expiry, a rebuild, a purge.</figcaption>
</figure>

- **The content API and its cache.** Many CMSs cache their delivery API, in memory, in Redis or behind their own CDN. Some are eventually consistent by design: Sanity's Next.js helper for validating webhooks waits 3 seconds by default "so the Content Lake has time to reach eventual consistency" ([Sanity docs](https://www.sanity.io/docs/nextjs/validating-sanity-webhooks-nextjs), checked 16 November 2026).
- **The site build.** A statically generated page is a snapshot of the API at build time. If no build ran, the build failed, it is still queued, or it read the API a moment too early, the page is old. Incremental regeneration ([ISR](/blog/headless-cms-glossary/#isr)) narrows the gap but adds its own cache, and on several servers it can be cleared on one and not the others. Strapi wrote up exactly that on their own site: an editor clicked Revalidate, nothing changed, because only one pod's cache had been cleared ([Strapi's write-up](https://strapi.io/blog/fixing-isr-revalidation-across-kubernetes-replicas-on-strapi), checked 17 November 2026).
- **The CDN.** An edge keeps a copy for as long as the cache headers or the CDN's own rules allow (its [TTL](/blog/headless-cms-glossary/#ttl)). A purge can fail, or be accepted and not yet reached every edge. Each edge has its own copy, so a reader in another city can see a different version from you.
- **The browser.** A page the browser considers fresh is shown without asking anyone. Only that one reader is affected, which makes it the most confusing layer to debug from a chat thread.

## Step 1: ask the CMS API directly

Ask the delivery API for the entry you changed, and read both the body and the headers. Use the published, public API, not a preview endpoint, and the same environment and locale your site reads.

```sh
curl -sS -D - "https://cms.example.com/api/posts/hello" | head -40
```

If the body has the new text, the CMS side is fine; go to step 2. If it doesn't, look at:

- `Age`: how many seconds this copy has sat in a shared cache. A large number means you are reading a cached answer, not the database.
- `Cache-Control`: `max-age` sets how long the answer stays fresh in any cache, and `s-maxage` overrides it for shared caches such as CDNs ([RFC 9111](https://www.rfc-editor.org/rfc/rfc9111)).
- `ETag` or `Last-Modified`: compare them with an earlier response. If they haven't changed, neither has the answer.
- Any cache-status header the CMS or its CDN adds (step 3 lists the common ones).

An old answer here means the publish didn't commit, you are reading a different environment, or the CMS's own cache hasn't caught up. Wait out the cache time from the headers, or check the CMS's status page and logs.

## Step 2: did the page rebuild?

Skip this step if your pages render on every request. Otherwise:

1. Open your host's deploy list. Did a build start after the time you published? Did it succeed? Is that build the one serving production?
2. Open your CMS's webhook log, if it has one. Did the rebuild hook fire, and what status did your host answer with? Common causes: the hook URL changed when the site moved, the request timed out, or the host debounced several hooks into one build that started before your publish.
3. Check what the live page was built from. This is where a version marker earns its keep (more below): one `curl` and you know whether the page is from before or after your change.

```sh
curl -sS "https://www.example.com/blog/hello/" | grep -o '<meta name="build-time"[^>]*>'
```

If the API is new but the page is old and no build ran after the publish, the problem is the build trigger. If a build ran but read old content, it raced the API cache from step 1: rebuild again, and add a delay or a check that the API is fresh before building.

## Step 3: is the CDN serving an old copy?

Read the live page's headers, twice, a few seconds apart:

```sh
curl -sS -D - -o /dev/null "https://www.example.com/blog/hello/"
```

Look for `Age` and `Cache-Control` as in step 1, plus your CDN's own cache status:

- **Cloudflare** sends `cf-cache-status`. `HIT` came from the edge's cache; `EXPIRED` means a cached copy was outdated and the origin answered; `STALE` and `UPDATING` mean an outdated copy was served, because the origin couldn't be reached or while a fresh one was being fetched ([Cloudflare cache responses](https://developers.cloudflare.com/cache/concepts/cache-responses/), checked 17 November 2026). No header at all, or `DYNAMIC`, means the answer didn't come from Cloudflare's cache.
- **Fastly** sends `X-Cache`: `HIT` or `MISS`, and it may contain reports from more than one server when more than one cache handled the request. Stale serves are reported as `HIT` ([Fastly's X-Cache reference](https://www.fastly.com/documentation/reference/http/http-headers/X-Cache/), checked 17 November 2026).
- **Vercel** reports a cache status for each request ([Vercel's cache status reference](https://vercel.com/docs/caching/cache-status)), and its guide walks through telling a CDN problem from a data-cache or build-cache problem ([Vercel's cache-debugging guide](https://vercel.com/docs/caching/cdn-cache/debug-cache-issues)), both checked 17 November 2026.

A `HIT` with an old body and a large `Age` is the CDN. Purge that URL (or its tag) and request it again. If it still hits with the old body, the purge didn't reach this edge yet, or it was sent for a different URL than the one readers use: watch for trailing slashes, `www` and query strings.

## Step 4: rule out the browser

Open the page in a private window, or trust your `curl` from step 3, which never uses the browser's cache. In the browser's developer tools, the Network panel shows "(disk cache)" or "(memory cache)" for answers that never left your machine; tick "Disable cache" and reload. If the site registers a service worker, it can serve pages from its own cache too; unregister it in the Application panel.

If `curl` sees the new page and your browser doesn't, only you are affected, and only until your copy stops being fresh. Fix the headers (below) so it doesn't happen to readers.

## Fixes for each layer

| Layer | What you see | Fix | What it costs |
|---|---|---|---|
| API cache | The API answers old text, with a large `Age` | Key the cache by content version, or clear it on publish | A cache that knows about publishing |
| Build | API new, page old, no build after the publish | A rebuild hook on publish; a receiver that drops repeats and builds the newest version | Build minutes; a hook to secure |
| Regeneration (ISR) | The page updates only after a second visit, or on one server | Revalidate on demand by tag or path, on every instance | Plumbing between the CMS and each instance |
| CDN | `HIT`, large `Age`, old body | Purge by URL or by [cache tag](/blog/headless-cms-glossary/#cache-tag) on publish, or a short shared lifetime (`s-maxage`) | Purges can fail; short lifetimes mean more origin load |
| Browser | Only your browser shows it | `max-age=0, must-revalidate` with an `ETag` for HTML; long lifetimes only for files whose names change | A cheap revalidation request per page view |

One trade-off deserves a sentence of its own. [`stale-while-revalidate`](/blog/headless-cms-glossary/#stale-while-revalidate) ([RFC 5861](https://www.rfc-editor.org/rfc/rfc5861)) lets a cache serve an expired copy once more while it fetches a fresh one. Pages stay fast, and the price is exactly the symptom this post is about: the first reader after a publish can get the old version. Use it for content where a few extra seconds of old doesn't matter, and not for prices, legal text or takedowns.

## Make every page say which version it is

Most of the debugging above gets faster if the live page tells you what it was built from. Put a marker in the HTML at build time. Any CMS can do this, because the build knows when it ran and what it read.

Two markers are worth having. `build-time` says when the page was built, which answers step 2. `content-version` says what it was built from: a value you set from the content itself, such as the newest update time among the entries the build read, or a release number if your CMS has one. That is the value you know right after you publish, so it is the one to wait for.

In Astro, in your base layout (the frontmatter runs once per page at build time on a static site):

```astro
---
// src/layouts/Base.astro
// contentVersion comes from your build's CMS reads: the newest updatedAt, or a release number.
const { contentVersion } = Astro.props as { contentVersion: string }
const builtAt = new Date().toISOString()
---
<meta name="build-time" content={builtAt} />
<meta name="content-version" content={contentVersion} />
```

In Next.js with the App Router, through the Metadata API, whose `other` field becomes `<meta>` tags:

```ts
// app/layout.tsx
import type { Metadata } from 'next'
// Your own helper: the newest updatedAt among the entries you read, or a release number.
import { contentVersion } from '@/lib/cms'

export async function generateMetadata(): Promise<Metadata> {
  return {
    other: { 'build-time': new Date().toISOString(), 'content-version': await contentVersion() },
  }
}
```

Then a short script can tell you when the live site has caught up with what you published. Pass it the version you expect, for example the update time your CMS shows for the entry you just published:

```sh
#!/bin/sh
# usage: wait-for-version.sh <expected content-version> <url>
want="$1"; url="$2"
for attempt in $(seq 1 30); do
  got=$(curl -fsS "$url" | grep -o 'name="content-version" content="[^"]*"' | sed 's/.*content="//; s/"$//')
  if [ "$got" = "$want" ]; then echo "live: $got"; exit 0; fi
  echo "not yet: saw ${got:-no marker}"
  sleep 10
done
exit 1
```

Run it after each publish, or from CI after a deploy, and you have the one fact a CMS dashboard can't give you: what a reader would get from that URL right now.

## How Colophon makes this visible

Colophon builds this check into publishing. Every publish is a numbered [release](/blog/headless-cms-glossary/#release), and every answer from its public API names the release in a `Colophon-Generation` header (the API calls a release number a generation). A static page carries the same number in a marker, written exactly like this:

```html
<meta name="colophon-generation" content="42">
```

A project can add three kinds of website connection. A site rebuild is a [webhook](/blog/headless-cms-glossary/#webhook) sent after each release, with a key that stays the same on every resend so your receiver can drop repeats. A cache clear asks a CDN to purge by tag, and each clear covers every release since the last one that worked, so one failure leaves no gap. A [site check](/blog/headless-cms-glossary/#site-check) reads a live URL after each release and looks for the header or the marker.

Each release then gets a [receipt](/blog/headless-cms-glossary/#receipt) with one label: **Published in Colophon** (nothing checks your website), **Website update pending**, **Verified at N locations**, or **Needs attention**, with what failed and what to do next. Only a site check that saw this release, or a later one, can verify it. A rebuild that was sent successfully never counts as proof on its own, because that is step 2's trap: the hook fired, but nobody knows what the page says.

Colophon's own API answers carry the headers from step 1: `Cache-Control: public, max-age=0, must-revalidate, s-maxage=30` for the latest release (browsers revalidate every time, shared caches may keep it 30 seconds) and `s-maxage=300` for a read pinned to a past release, with an `ETag`, a `Cache-Tag` and a `Colophon-Cache` header that says `hit`, `miss`, `coalesced` or `bypass`. Its own cache keys include the release number, so a cached answer for release 41 can't be served for release 42. Wiring this into a site, marker included, is in [using Colophon as a headless CMS for Astro](/blog/astro-headless-cms/), and reading a past release is in [how to see what your website said on a past date](/blog/website-history-past-date/).

## What no check can prove

- **A check sees one URL, at one moment, from one place.** Colophon runs one worker by default, so its receipts say "verified at 1 location". Another edge in another region may still hold an old copy until it expires or the purge reaches it.
- **An accepted purge is the CDN's word, not an observation.** Colophon records whether a CDN accepted a purge, and only a site check counts as seeing the result. Its cache clears are tested against a fake CDN that caches by tag; an adapter for a real CDN isn't built yet. How purges behaved under a minute of CDN failures is in [the load tests](/blog/load-testing-a-cms/).
- **Copies already downloaded can't be recalled.** No purge reaches a browser cache, an RSS reader or a screenshot. That matters most for takedowns.
- **Cache lifetimes are policies, not guarantees.** Thirty seconds of shared caching is a setting to test against your CDN, not a promise about every edge.
- **Webhook payloads aren't signed yet in Colophon.** A receiver should rebuild from the API, not trust the payload, so a forged call can cost at most an extra build.

## FAQ

**Why does a hard refresh fix it for me but not my colleague?** A hard refresh affects your browser only. Your colleague has their own browser cache, and may reach a different CDN edge with a different copy. Compare `curl` output from both of your machines: if the edges disagree, purge.

**How long can a CDN keep an old copy?** As long as its rules allow: usually `s-maxage` or `max-age` from your headers, unless the CDN is configured to override them. `stale-while-revalidate` and serving stale on origin errors add time on top. The `Age` header tells you how old the copy you got is.

**Does purging the CDN clear browser caches?** No. A purge empties the CDN's copies. Browsers keep theirs until they stop being fresh, which is why HTML should be sent with `max-age=0, must-revalidate` and an `ETag`: the browser asks every time, and a "not modified" answer is cheap.

**Should I set every cache lifetime to zero?** Then every request reaches your origin, and a busy page can overwhelm it at the worst moment. Keep a short shared lifetime with revalidation, and purge on publish for the pages that must change at once.
