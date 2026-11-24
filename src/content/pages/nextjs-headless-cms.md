---
kind: guide
title: "Next.js and a headless CMS: one release a build"
description: "Statically export a Next.js site from a headless CMS without mixing two versions of your content across build workers: pin a release before the build."
targetQuery: "next.js headless cms static export"
pubDate: 2026-11-19
status: "The code below is from the Next.js demo site in Colophon's repository, run against Colophon on 19 November 2026."
related:
  - href: /guides/
    text: "Guides: building sites on a headless CMS"
  - href: /guides/sveltekit-headless-cms/
    text: "SvelteKit and a headless CMS: one release a build"
  - href: /use-cases/static-site-fresh-after-publish/
    text: "Keep a static site fresh after every publish"
  - href: /blog/website-not-updating-after-publish/
    text: "Why your site shows old content after publishing"
  - href: https://docs.colophon.404human.dev/api/delivery/
    text: "The delivery API, in the docs"
faq:
  - q: "Why can't I just remember the release in a module variable?"
    a: "Because Next.js renders pages in several worker processes, and each has its own memory. In the run, the build used 5 workers. A release learned in one isn't seen by the others, so a publish during the build could give different workers different releases. A file written once before the build is read by all of them."
  - q: "Does this work with on-demand revalidation instead of a static export?"
    a: "The reads work the same way: learn a release, read every query of that render at it. This guide covers the static export, rebuilt on publish; it doesn't cover revalidation, which depends on your host."
  - q: "How do I render rich text?"
    a: "Colophon stores rich text as validated JSON, not HTML, and its renderer isn't published to npm yet. The demo leaves the rich-text field out; outside the repository you walk the JSON yourself or render only the fields you need."
---

A Next.js static export builds every page ahead of time. If someone publishes while that build runs, some pages
get the old content and some the new, and the site you deploy is a version that never existed. Next.js makes this
easier to hit than most, because it renders pages in several worker processes at once. This guide builds a small
recipe site where all of those workers read the same release, every page says which release it shows, and a
publish triggers the next build.

The code is from the Next.js demo site in Colophon's repository
([`apps/sites/nextjs`](https://github.com/akira-shirase-oss/colophon-cms/tree/main/apps/sites/nextjs)), run
against a Colophon on 19 November 2026. The SvelteKit version of the same idea is in
[SvelteKit and a headless CMS](/guides/sveltekit-headless-cms/); this page focuses on what Next.js changes.

## What you need

- A Colophon with published content. The [quick start](https://docs.colophon.404human.dev/quick-start/) runs one
  with Docker. You need its address, your project's id and a collection; here the collection is `recipes`.
- Next.js with `output: 'export'`, so every page is written as a file at build time.

Every answer from Colophon's public delivery API names its release in the `Colophon-Generation` header, and
`?generation=N` asks for the content exactly as release N published it. The SvelteKit guide shows both answers,
from the same run.

## Step 1: pin the release before `next build`

The build runs a small script first. It asks for the newest release once and writes it to a file every worker can
read (`scripts/pin-release.mjs`, abridged to the part that pins):

```js
const site = connection();
if (site === null) {
	console.log('pin-release: nothing seeded; building the "seed first" page');
} else {
	const url = `${site.api}/content/v1/${site.project}/${site.environment}/recipes?limit=1`;
	const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
	if (!response.ok) throw new Error(`GET ${new URL(url).pathname}: HTTP ${response.status}`);
	const generation = Number(response.headers.get('colophon-generation'));
	if (!Number.isInteger(generation) || generation < 1) throw new Error('the delivery API named no release');
	writeFileSync(out, JSON.stringify({ site, generation }) + '\n');
	console.log(`pin-release: this build reads release ${generation}`);
}
```

`connection()` reads your Colophon's address and project from the environment. The package script runs it before
the build:

```json
"build": "node scripts/pin-release.mjs && next build && node scripts/place-output.mjs"
```

In the run, the output read `pin-release: this build reads release 1`, then Next reported
`Generating static pages using 5 workers`.

## Step 2: every worker reads the pinned release

`lib/colophon.ts` reads the file. Every worker gets the same answer:

```ts
/** The release this build reads, as scripts/pin-release.mjs wrote it, or null when nothing is seeded. */
export function buildRelease(): { site: Site; generation: number } | null {
	try {
		return JSON.parse(readFileSync(join(process.cwd(), '.release.json'), 'utf8'));
	} catch {
		return null;
	}
}
```

Every read then asks for that release, follows the cursor, and refuses an answer from any other release, exactly
as in the SvelteKit guide:

```ts
const answered = Number(response.headers.get('colophon-generation'));
if (answered !== generation) throw new Error(`asked for release ${generation}, got ${answered}`);
```

## Step 3: one page per entry, at that release

`app/recipes/[slug]/page.tsx` tells Next which pages to export:

```tsx
// Only the recipes published at the build's release exist; any other path is a 404.
export const dynamicParams = false;

// Which recipe pages to export: one per published recipe, at the build's release. Before seeding there are none,
// and a static export needs at least one, so the build makes a single placeholder page.
export async function generateStaticParams() {
	const pinned = buildRelease();
	if (!pinned) return [{ slug: 'not-seeded' }];
	const recipes = await entriesAt(pinned.site, 'recipes', pinned.generation);
	return recipes.map((r) => ({ slug: r.content.slug ?? r.id }));
}
```

## Step 4: mark every page with its release

The root layout puts the release in every page's head through Next's metadata (`app/layout.tsx`):

```tsx
// The release this page was built from, as <meta name="colophon-generation">: a Colophon site check reads it to
// verify a release reached the site.
export function generateMetadata(): Metadata {
	const pinned = buildRelease();
	return {
		title: 'Butter & Thyme',
		...(pinned ? { other: { 'colophon-generation': String(pinned.generation) } } : {})
	};
}
```

In the run, release 1 exported 13 pages, the 404 pages included, and every one was marked `1`.

## Step 5: rebuild when a release is published

Point a Colophon website connection at your host's build hook, and drop repeated announcements by their stable
key. In the run, publishing a change made release 2, and the rebuild read `pin-release: this build reads
release 2` and marked all 13 pages `2`. The receiver pattern is in
[keep a static site fresh after every publish](/use-cases/static-site-fresh-after-publish/).

## Check it yourself

- After a build, every exported page should carry the same `colophon-generation`.
- Publish during a slow build: the build either finishes at the release it pinned or stops on the refusal; it
  never mixes two.
- Delete `.release.json` between builds. Each build should write a fresh one, never reuse an old release.

## When not to use this

If pages must change the moment content does, a static export is the wrong model; render per request instead.
This guide doesn't cover Next's revalidation, which depends on where you host.

## What to know before choosing Colophon

- **It's in alpha** (0.1.0-alpha.7), and its npm packages, the rich-text renderer
  included, aren't published yet.
- **Webhooks aren't signed yet.** Put a long random secret in the build hook's address.
- **The public delivery API has no language parameter yet.**
