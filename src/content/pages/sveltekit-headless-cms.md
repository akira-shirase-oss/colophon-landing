---
kind: guide
title: "SvelteKit and a headless CMS: one release a build"
description: "Prerender a SvelteKit site from a headless CMS without mixing two versions of your content in one build: pin a release, mark each page, rebuild on publish."
targetQuery: "sveltekit headless cms"
pubDate: 2026-11-19
status: "The code below is from the SvelteKit demo site in Colophon's repository, run against Colophon on 19 November 2026."
related:
  - href: /guides/nextjs-headless-cms/
    text: "Next.js and a headless CMS: one release a build"
  - href: /guides/
    text: "Guides: building sites on Colophon"
  - href: /blog/astro-headless-cms/
    text: "Using Colophon as a headless CMS for Astro"
  - href: /use-cases/static-site-fresh-after-publish/
    text: "Keep a static site fresh after every publish"
  - href: /blog/website-not-updating-after-publish/
    text: "Why your site shows old content after publishing"
  - href: https://docs.colophon.404human.dev/api/delivery/
    text: "The delivery API, in the docs"
faq:
  - q: "Why not just fetch the latest content on every page?"
    a: "Because a build takes time. If someone publishes while your site is building, early pages get the old content and later pages the new, and a link from one to the other can point at something that isn't there yet. Asking for one release everywhere makes the whole build one consistent version."
  - q: "Does this work with server-side rendering instead of prerendering?"
    a: "The same reads work per request: learn the newest release when the request starts and read every query of that request at it. This guide and its demo cover the static model; Colophon's live per-request demo, The Draft, is an Astro site."
  - q: "How do I render rich text?"
    a: "Colophon stores rich text as validated JSON, not HTML. The demo renders it with the renderer in Colophon's repository, which isn't published to npm yet, so outside the repository you walk the JSON yourself or render the fields you need."
  - q: "Is there an official SvelteKit package?"
    a: "No. The demo uses plain fetch on purpose, so there is nothing to install beyond SvelteKit itself."
---

Prerendering a SvelteKit site from a headless CMS is straightforward until someone publishes while the site is
building. Then the first pages are built from the old content and the last from the new, and the site you deploy
is a version that never existed. This guide builds a small recipe site that can't do that: every page in one
build reads the same release, every page says which release it was built from, and the site rebuilds when a new
release is published.

The code is from the SvelteKit demo site in Colophon's repository
([`apps/sites/sveltekit`](https://github.com/akira-shirase-oss/colophon-cms/tree/main/apps/sites/sveltekit)),
which I ran against a Colophon on 19 November 2026. The pattern works with any CMS whose API can answer at a
fixed version.

## What you need

- A Colophon with published content. The [quick start](https://docs.colophon.404human.dev/quick-start/) runs one
  with Docker. You need its address, your project's id and a collection; here the collection is `recipes`.
- SvelteKit 3 with `@sveltejs/adapter-static`, so every page is prerendered at build time.

Colophon's public delivery API needs no credential: published content is public by default.

## Step 1: see what a release is

Every answer from the delivery API says which release it was read at, in the `Colophon-Generation` header.
Without a release, you get the newest:

```text
GET /content/v1/{project}/production/recipes?limit=1

HTTP/1.1 200 OK
colophon-generation: 2
cache-control: public, max-age=0, must-revalidate, s-maxage=30
```

With `?generation=N`, you get the content exactly as release N published it, even after newer releases exist:

```text
GET /content/v1/{project}/production/recipes?limit=1&generation=1

HTTP/1.1 200 OK
colophon-generation: 1
cache-control: public, max-age=0, must-revalidate, s-maxage=300
```

Those are real answers from the run. Release 1 still served the recipe intro that release 2 replaced, and a
pinned read may be cached longer because it never changes.

## Step 2: learn the release once per build

The build asks once for the newest release, and every page uses that number. SvelteKit prerenders all pages in
one process, so a module-level promise is shared by every page. `src/lib/server/colophon.ts`:

```ts
let pinned: Promise<number> | undefined;

/**
 * The release this build reads: the newest one when the build starts, learned once and shared by every
 * page the build renders (they run in one process). A failed read isn't cached, so a retry asks again.
 */
export function buildRelease(site: Site, collection: string): Promise<number> {
	pinned ??= (async () => {
		const url = new URL(collectionUrl(site, collection));
		url.searchParams.set('limit', '1');
		const generation = Number((await get(url)).headers.get('colophon-generation'));
		if (!Number.isInteger(generation) || generation < 1) throw new Error('the delivery API named no release');
		return generation;
	})().catch((error) => {
		pinned = undefined;
		throw error;
	});
	return pinned;
}
```

`get` is `fetch` with a 10-second deadline, which throws on any answer that isn't a success, so a CMS that
doesn't answer fails the build instead of hanging it.

## Step 3: read every page at that release

Every read asks for the build's release, follows the cursor, and refuses an answer from any other release:

```ts
/** Every published entry of `collection`, read at release `generation`, page by page. */
export async function entriesAt(site: Site, collection: string, generation: number): Promise<Recipe[]> {
	const items: Recipe[] = [];
	let cursor: string | null = null;
	for (let page = 0; page < MAX_PAGES; page += 1) {
		const url = new URL(collectionUrl(site, collection));
		url.searchParams.set('generation', String(generation));
		url.searchParams.set('limit', String(PAGE_SIZE));
		if (cursor !== null) url.searchParams.set('cursor', cursor);
		const response = await get(url);
		const answered = Number(response.headers.get('colophon-generation'));
		if (answered !== generation) throw new Error(`asked for release ${generation}, got ${answered}`);
		const body = (await response.json()) as Page;
		items.push(...(body.data ?? []));
		cursor = body.next_cursor ?? null;
		if (cursor === null) return items;
	}
	throw new Error(`more than ${MAX_PAGES} pages in ${collection}`);
}
```

The refusal is the safety net. If anything between you and the CMS ever answers with another release, the
build stops instead of shipping a mix.

## Step 4: prerender a page per entry

The layout pins the release for every page (`src/routes/+layout.server.ts`):

```ts
export const prerender = true;
export const trailingSlash = 'always';

export async function load() {
	const connection = site();
	// Not seeded yet (a clean checkout, CI): draw a page that says so instead of failing the build.
	if (connection === null) return { generation: null };
	return { generation: await buildRelease(connection, 'recipes') };
}
```

`site()` is how the demo finds its Colophon (an address, a project id and an environment). In your own site, read
those from your environment. The recipe route tells SvelteKit which pages exist, at the same release
(`src/routes/recipes/[slug]/+page.server.ts`):

```ts
// Which recipe pages to prerender: one per published recipe, at the build's release.
export async function entries() {
	const connection = site();
	if (connection === null) return [];
	const generation = await buildRelease(connection, 'recipes');
	return (await entriesAt(connection, 'recipes', generation)).map((r) => ({ slug: r.content.slug ?? r.id }));
}
```

## Step 5: mark every page with its release

The layout writes the release into every page (`src/routes/+layout.svelte`):

```svelte
<svelte:head>
	<!-- The release this page was built from: a Colophon site check reads it to verify a release reached the site. -->
	{#if data.generation !== null}<meta name="colophon-generation" content={String(data.generation)} />{/if}
</svelte:head>
```

It's what turns "I published" into "readers can see it": a Colophon site check reads this tag on your live site
and marks the release **verified** only when it finds it. In the run, release 1 built 11 pages, each marked `1`.

## Step 6: rebuild when a release is published

Add a website connection in Colophon that points at your host's build hook. Each release is announced once or
more with a stable key, so your receiver can drop repeats and build the newest release it has heard of. In the
run, publishing a change made release 2, and the rebuild marked all 11 pages `2` and showed the new intro. The
receiver pattern, duplicates and failures included, is in
[keep a static site fresh after every publish](/use-cases/static-site-fresh-after-publish/), and the setup is in
the docs' [website connections](https://docs.colophon.404human.dev/api/website-connections/).

## Check it yourself

- Build, then look for the marker: every page should carry the same `colophon-generation`.
- Publish a change during a slow build. The build either finishes at the release it started with, or stops on the
  refusal; it never mixes two.
- Request `?generation=` with an older number and compare: the old content is still there.

## When not to use this

If your pages must change the moment content does, prerendering is the wrong model. Render per request and use
Colophon's live update stream. That's The Draft's model, in Astro, and this demo doesn't cover it yet.

## What to know before choosing Colophon

- **It's in alpha** (0.1.0-alpha.7), and its npm packages, the rich-text
  renderer included, aren't published yet.
- **Webhooks aren't signed yet.** Put a long random secret in the build hook's address.
- **The public delivery API has no language parameter yet.**
