---
title: "What a headless CMS should be able to prove"
description: "Six questions about publishing that a headless CMS should answer with evidence, not a spinner, and how Colophon answers each one today."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["publishing", "reliability", "headless cms", "releases"]
draft: false
---

Comparisons of headless CMSs usually list features: content modeling, APIs, localization, a plugin marketplace. Those matter. But there is a set of questions that comes up after you've chosen one, usually during a bad afternoon, and feature lists rarely mention it:

1. Did my save actually land?
2. Did the publish happen once, and completely?
3. What exactly went live?
4. Can readers see it yet?
5. Can I undo it, and will someone check the undo?
6. Who, or what, was able to change it?

I'm building Colophon, an open-source CMS in Rust and Svelte, around the idea that a CMS should be able to answer these with evidence. This post is the map. Each answer links to a longer post.

## 1. Did my save land?

A save is either acknowledged and durable, or clearly not saved. Colophon writes every save as a new, insert-only revision, and accepts it only if it started from the current draft. A stale save is refused with a `409` that names the current revision, so two editors can't overwrite each other silently. Every save carries an idempotency key, so a retry after a lost answer replays the first result instead of saving twice.

Two crash tests kill the server just before and just after a commit and check both outcomes. A deterministic simulator runs thousands of seeded schedules of colliding editors and lost answers on every push. Details: [what happens to your draft when the CMS crashes](/blog/crash-safe-drafts/).

## 2. Did the publish happen once, and completely?

In Colophon you don't publish entries one by one. You publish a changeset: a set of exact revisions, even when it holds one entry. An approval counts only for that exact set, identified by a hash of every pinned revision. Edit anything after approval and it needs approving again.

Publishing an approved changeset is one database transaction. It moves the environment from the release number the publisher saw to the next one, and records what went live. If someone else published first, the transaction finds the number has moved and refuses with `409 generation_moved`; nothing is half-applied. So a release either commits whole or not at all, and two releases can't claim the same number.

Telling your website happens after the commit, never inside it. The same transaction writes a row to an outbox, and a background worker picks it up under a lease. If the worker dies mid-delivery, the lease runs out and another worker sends the announcement again with the same idempotency key, so your site can tell it's a repeat. A slow worker holding an old release can never deliver it after a newer one.

## 3. What exactly went live?

Every committed release has a number that only goes up, one per release, per environment. Each entry keeps a publication history: which revision was live from which release to which. Because revisions never change, "release 41" names exact revisions.

The public content API reads the latest release by default, or any past one with `?generation=41`, and every answer says which release it came from in a `Colophon-Generation` header. Details: [what was live on your site last Tuesday?](/blog/what-was-live-last-tuesday/)

## 4. Can readers see it yet?

This is the question most systems can't answer, because the CMS only knows its own database. Your readers see a CDN copy, or a static page built from an older release.

Colophon gives every release a receipt with one label: Published in Colophon, Website update pending, Verified at N locations, or Needs attention. Only a site check that read the live site can make it verified, and it always says how many places it looked from. Details: ["Published" should mean readers can see it](/blog/published-means-readers-can-see-it/).

## 5. Can I undo it, and will someone check the undo?

Rolling back in Colophon builds an ordinary changeset that restores what was live at an older release. It goes through the same review as any change and lands as a new release, so release numbers never go backwards and the history keeps both the mistake and the fix. Content that was taken down stays down. Details: [rollback is a change too](/blog/rollback-is-a-change-too/).

## 6. Who, or what, was able to change it?

Roles are data: owners, developers, editors and publishers by default, plus roles you define, narrowed down to single fields or to entries a person created. Project API tokens are identities of their own, so what a script wrote names the token. Changes to roles, members, invitations and tokens go in an append-only audit log: the server's database login can only add to it and read it, and triggers refuse edits and deletes apart from the retention sweep and whole-project deletion.

AI agents work through those same tokens. Colophon's MCP adapter lets them read, draft and propose, but no tool approves or publishes, and the API refuses a token's approval of anything a token submitted. Details: [field-level permissions](/blog/field-level-permissions/) and [giving AI agents CMS access without the publish button](/blog/ai-agents-without-the-publish-button/).

## What Colophon can't prove yet

The list above is what's built. A few things are not, and I'd rather say so here than in a footnote:

- **Verified means where it was checked.** The first version runs one worker, so a receipt can say "verified at 1 location". That's one vantage point, not every CDN edge.
- **No real CDN adapter yet.** Cache clears are tested against a fake CDN that caches by tag. The adapter for a real CDN isn't built.
- **No draft preview for editors yet**, and no way to browse a rendered page of the site as it was at an old release. Reading a past release goes through the API.
- **Webhook payloads aren't signed yet.**
- **The 24-hour soak hasn't passed.** Load results so far are from one laptop and say so: [Colophon's load tests, with the caveats](/blog/colophon-load-test-numbers/).

The changelog keeps the rest in its [known limitations](https://github.com/akira-shirase-oss/colophon-cms/blob/main/CHANGELOG.md#known-limitations).

## Where it stands

Colophon is pre-release (0.1.0-alpha.1) and has no users. It's open source under the [MIT licence](https://github.com/akira-shirase-oss/colophon-cms/blob/main/LICENSE). I'm building it in public, alone, and the [status section](/#pricing) on the home page says what's done; the list above says what isn't. Each step, including what broke, is in the build log at [404human.dev/colophon](https://404human.dev/colophon/).
