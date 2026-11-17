---
title: "\"Published\" should mean readers can see it"
description: "Why a CMS says published while your site still shows old content, and how Colophon keeps a release pending until a check on the live site has seen it."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["publishing", "delivery", "cdn", "caching"]
draft: false
---

You press publish. The CMS says published. You open the site, and it still shows the old headline. You refresh. Still old. Somebody asks in chat whether it went out, and the honest answer is "I think so".

I'm building Colophon, an open-source CMS, partly because of that question: "I published it, so why isn't the site updated?" This post is about why it happens and how Colophon keeps track of the answer.

## Why the CMS says published but the live site shows old content

When a CMS says published, one thing has definitely happened: its own database changed. What readers see depends on other systems, each with its own timing and its own ways to fail. Three come up most:

- **A CDN still holds the old copy.** Copies stay at the edge until they expire or are purged. A purge request can fail, or be accepted but not have taken effect everywhere yet.
- **A static site hasn't rebuilt.** If your pages are generated at build time, new content in the CMS means nothing until a build runs and the new build goes live. A build can be slow, fail, or never start.
- **The webhook didn't land.** The message that tells your site to rebuild can time out, get an error back, or go to an address that changed.

In each case the CMS is not lying about its own state. It is answering a different question from the one you asked. You wanted to know whether readers can see the change.

## Why a fresh API response doesn't prove the page changed

A common check is to call the content API and see the new text. That proves the API has it. It says nothing about a statically generated page that was built before the change, or about a CDN copy of that page. The Colophon design docs put it bluntly: a fresh API response does not prove that a statically generated page rebuilt. You have to look at the page itself.

## What "published" means in Colophon

Every publish in Colophon is a numbered release ([what was live on your site last Tuesday?](/blog/what-was-live-last-tuesday/) covers the numbering). A publish either commits as one release or doesn't commit at all, and each release has a receipt. The receipt carries one label, and the label says only what has been proven:

- **Published in Colophon.** The release is committed. Anything that reads Colophon directly has it. Nothing has checked your website.
- **Website update pending.** A rebuild, cache clear or site check is still on its way. The label settles by itself.
- **Verified at 1 location** (or 2, or more). A site check read this release, or a later one, on the live site, from that many places.
- **Needs attention.** Something gave up, and the receipt says what failed and what to do next.

The Releases page in the Studio describes it this way: "Its label says what is proven: published in Colophon, on its way to your website, or checked on the live site."

The rules behind the label are short. A failure anywhere outranks everything else. Anything still open means pending. Only a site check can verify, and only at the locations it actually looked from. A rebuild that was sent successfully is not proof that readers see the change, so it never turns a release into "verified" on its own.

## How a site check knows which release a page shows

Colophon has three kinds of website connection:

- A **site rebuild** tells your site a release is out. It is a webhook, sent once per release, and retried if needed with the same key, which your site can use to drop repeats.
- A **cache clear** asks the cache in front of your site, usually a CDN, to drop the copies the release changed.
- A **site check** reads your live site after each release to confirm readers see it.

Each one must point at a public `https` address, checked when the connection is saved and again before every attempt.

For the check to work, the page has to say which release it was built from. The content API already sends a `Colophon-Generation` header with every answer. A static page can't set its own headers, so it carries a marker instead:

```html
<meta name="colophon-generation" content="42">
```

The check fetches the URL and reads the header or that marker. If it sees the release it is looking for, or a later one, it passes. If it sees an older release or no marker at all, the result is "not yet", and it tries again no sooner than every 5 seconds, up to 10 attempts. An error status counts as an error even when a marker is present.

Every look is kept: which release it was looking for, where the check ran from, which release it saw, the status code, a SHA-256 hash of the body and any error. That record is the evidence behind the label.

A later release can cover an earlier one. If release 7 reaches your site, it carries release 6's changes too, so release 6's receipt shows that it was covered by release 7. It doesn't stay pending forever.

The reference site in the repository marks every page with exactly one marker. Before a new build goes live, its pages are checked for the right marker, and a build of an older release is refused, so a slow old build can't replace a newer one.

## What the receipt says when the update didn't reach the site

When a connection gives up, the release shows Needs attention, and the receipt explains the failure in plain words built from what the worker recorded. For example:

- "your website had a problem (HTTP 503)"
- "your website didn't answer in time"
- "couldn't reach your website"
- "the live site still showed release 6"
- "the page it checked doesn't say which release it shows"

It also says what is still true: "It is published in Colophon, and anything that reads Colophon directly has it, but your website may not show it yet." It suggests two next steps: check the connection's address and that your website is up, or publish again, because the next release carries this one's changes.

Cache clears report their own state on the Releases page. Pending reads "copies the CDN holds may still be served". Failed reads "copies the CDN holds may be served until they expire (up to 5 minutes)". A clear names the tags of the entries and collections that changed, and it covers every release since that CDN's last successful clear, so one failure doesn't leave a gap.

Taking content down follows the same rules. An unpublish is a release too, and its purge shows as pending, with the same warning that copies the CDN holds may still be served, until the CDN accepts it. The content API itself stops serving the entry at once, at every release number, old ones included.

## What a delivery check can't prove

I want the limits to be as clear as the labels.

- **"Verified" always says where.** Colophon never shows a bare "verified". The first version runs one worker, so receipts will say "verified at 1 location". That is one vantage point, not the whole internet.
- **A check sees one URL at one moment.** It can't say that every page or every CDN edge updated.
- **Some copies can't be recalled.** Browser caches and copies people already downloaded are out of reach, and the docs say so.
- **The cache timings are policies, not promises.** Live public answers have a 30-second shared cache lifetime and release-pinned content 300 seconds. The docs call these "policies to test, not a global 30-second consistency guarantee".

If you have no website connections at all, Colophon doesn't guess. The release says Published in Colophon, and the Studio tells you that nothing checks your website yet and where to add a site check.

## Where it stands

Colophon is pre-release (0.1.0-alpha.1) and has no users. I'm building it in public, on my own. Receipts, site checks and webhook rebuilds are built and tested in the repository, and five Astro demo sites rebuild themselves when a release is published; how to wire up your own is in [using Colophon as a headless CMS for Astro](/blog/colophon-with-astro/). Webhook payloads aren't signed yet. CDN purges are tested against a fake CDN that caches by tag, including a minute of failing purges in the [load tests](/blog/colophon-load-test-numbers/), and the adapter for a real CDN isn't built yet. The reference site and the demo sites run locally, not on the internet, and my own site doesn't run on Colophon yet. Some of the cache fault tests are still owed, and the publish-to-visible timing target hasn't been measured. A retry button for a single failed delivery is planned but not there yet. The other questions a CMS should be able to answer about a publish are mapped in [what a headless CMS should be able to prove](/blog/headless-cms-should-prove/). Progress, including what broke, goes in the build log: [404human.dev/colophon](https://404human.dev/colophon/).
