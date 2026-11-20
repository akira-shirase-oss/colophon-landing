---
title: "Colophon's load tests, with the caveats"
description: "Load results for a Rust CMS server: warm and cold reads, a cache stampede, outages and a failed 24-hour run. Laptop numbers, labelled as such."
pubDate: 2026-11-16
updatedDate: 2026-11-20
tags: ["performance", "load testing", "reliability", "rust"]
draft: false
---

CMS performance claims are easy to make and hard to check. "Fast" rarely comes with a machine, a commit, a dataset or a failure count. I'd rather publish numbers you can trace to a stored file, including the runs that failed, and be plain about what they can't tell you.

I'm building Colophon, an open-source CMS with a Rust server and a Svelte editor. Every load run writes a result file to the repository, named with its date, scenario and machine. A file records the commit it ran on, the request counts, the latency distribution and the scenario's own pass or fail verdict, and most also record whether the working tree had uncommitted changes. A failed run is kept, not rerun until it goes green. The numbers below are quoted from those files.

## The machine, and why it matters

Every run here was on one laptop, except the cold reads below, which come from a CI runner. The laptop is an Apple M2 Pro with 12 cores and 32 GB of memory. The release-built server, PostgreSQL 18, the Valkey cache and the S3-compatible object store (all in Docker), and the k6 load generator shared those 12 cores, along with whatever else the laptop was doing.

That makes these numbers evidence about the code's behaviour, not a capacity claim. A production deployment on separate machines would draw different curves, better or worse, and nothing here predicts them. The proper reference setup, with a separate database host and load generator, hasn't been run yet.

## Warm reads for 30 minutes

The baseline case is anonymous readers hitting published content that's already in the cache, at a steady 300 requests a second for 30 minutes.

- 540,063 requests, 0 failures.
- p95 6.4 ms, p99 19.6 ms, and every five-minute window's p99 inside the gate (p99 under 350 ms).
- 99.98% cache hits: 485,976 hits against 119 misses.
- Server memory peaked around 41 MB; server CPU averaged 6.9%.

## Cold reads, where every request hits the database

A cache that hides the database can make any system look fast. So one scenario makes every read unique: 30,000 reads across a 2,048-entry corpus, each one a real PostgreSQL fill.

- 30,091 requests at about 505 a second, 0 errors.
- p95 137.9 ms, p99 152.6 ms; a second run on the same runner gave p95 139.1 ms, p99 153.0 ms.
- 0 cache hits, by design. About six database transactions per request.

These numbers come from a CI runner (an AMD EPYC 9V74, [the stored run](https://github.com/akira-shirase-oss/colophon-cms/actions/runs/44635083698)), not the laptop. **Correction, 20 November 2026:** the version of this section published on 16 November reported a laptop run (30,095 requests at 1,017 a second, p95 62.1 ms, p99 68.2 ms) that read fewer than a third of the corpus: the test chose entries by a counter that each simulated user keeps for itself, so all 64 users walked the same first few hundred entries, and a recount found 675 of the 2,048 read. The test now numbers reads across all users, and a fixed run reads all 2,048. Re-running the old test beside the fixed one on the same machine showed no consistent latency difference, so the earlier figure wasn't flattered by it, but it didn't measure what the section said. The new figures replace it; the machine is different too, so they aren't comparable with the laptop's.

## A thousand readers at the moment a cache entry expires

The classic way a cache hurts you is a stampede: a popular entry expires and every waiting reader goes to the database at once. The stampede scenario puts 1,000 callers on one project's hot key exactly at its expiry, and 200 on a second project's to check that no answer crosses between them, while a third arm republishes an entry every 12 seconds.

- 22,106 requests, but only 50 origin fills for the whole run (the scenario's bound was 84). 1,673 callers waited for a fill already in progress instead of starting their own.
- 0 stale reads across 7 republished releases, and 0 reads that crossed between the projects.

Stale reads are impossible here by construction: every cache key includes the release number, so an answer cached for release 41 can't be served for release 42.

## What happens when a dependency goes away

Speed matters less than behaviour when something breaks. Three scenarios pause a dependency in the middle of a run. These are clean reruns from 7 November, on committed code with no local changes; the 4 November runs before them held too.

- **Cache paused for about a minute.** All 24,000 reads during the outage were answered from PostgreSQL, none as a cache hit, with 0 errors. The readiness check said `degraded` throughout the outage, never ready and never broken. No write failed.
- **PostgreSQL paused and the worker killed.** During the outage, every read and write got an honest "unavailable" error: 0 fake commits, 0 corrupt read-backs of acknowledged writes ([why an acknowledged save survives](/blog/cms-lost-edits/)). Afterwards, all 7,227 recovery requests succeeded and the killed worker's job was reclaimed and finished.
- **CDN purges failing and the site frozen.** A fake CDN answered every purge with 503 for about a minute. 480 publishes landed at the API during the outage, none failed, retries waited at least the 5 seconds the CDN asked for, and no release was marked verified while the fault held; [why your site shows old content after publishing](/blog/website-not-updating-after-publish/) explains why.

## A server killed behind a load balancer

With three API servers and two workers behind HAProxy, one server was killed with SIGKILL ten seconds into a 30-second run of writes and brought back five seconds later. 6,001 writes were acknowledged, and all 6,001 were stored, each with a distinct title. 0 logical failures.

## An agent that won't stop

Colophon lets scripts and AI agents work through API tokens with request quotas. The noisy-agent scenario runs normal editorial traffic, then adds a token capped at 60 requests a minute that tries about 600 a second. What else a token can and can't do is in [give AI agents CMS access, not the publish button](/blog/ai-agents-cms-permissions/).

- 99.7% of the agent's attempts were refused with `429` and a `Retry-After` header.
- Editors' p95 latency under that noise was 1.83 times their own baseline; the gate is twice the baseline plus 2 ms. A second project's editors saw 1.86 times.

## The 24-hour run that failed

The last load gate before version 0.1 is a 24-hour soak: mixed reads, saves and publishes at 200 a second, with a dependency outage every hour. The first attempt, on 9 November, ran the full day at that rate but without the hourly outages, because the drill runner was written afterwards. It failed.

It sent 19.9 million requests. k6 counted 3,458,766 failed requests and 6,049,935 failed checks, and the scenario counted 867,613 errors, so its "no errors" gate failed. The cause was the test itself: the test account's session has a 12-hour absolute expiry, and the scenario signed in once, so for the second half of the day every signed-in call got a `401`. Reads, which need no session, held their gate all day: p99 6.0 ms. The save (p95 10.2 ms) and publish (p99 119 ms) figures cover a day in which about half those calls were refused, so they aren't evidence of a full day of saves. There were 0 stale cache refills and 0 pages mixing two releases.

The scenario now signs in again when its session expires, and a drill runner pauses the cache or the database on a schedule and expires the sessions every sixth drill. Getting to a passing run took five more full runs, all at 300 requests a second (three short harness checks from the same day are stored too):

- **10 November, 1 hour.** The re-sign-in fix worked: 34 re-sign-ins after every session was expired mid-run. But the gate failed, with 443 counted errors and 161,332 failed requests. Refusals during a 30-second database pause counted against a gate that allowed none, and a gate like that can never pass a run with drills in it, so it became drill-aware: errors inside an announced drill window are recorded as drill evidence, and any error outside one fails the run.
- **11 November, 1 hour.** It reported held, but the gate was vacuous: the error count it checked never reached the summary, so it was zero by construction. Recorded as a harness defect, not a pass.
- **11 November, 1 hour.** The new failure stamps worked, though a harness bug made the gate fail closed before it could sort them; they exposed a scenario bug: about three quarters of one check's pinned reads asked for an entry at a release it wasn't in yet. That bug had also produced most of the failed requests in the two runs before.
- **11 November, 30 minutes.** With the scenario fixed, it still failed: 1,536 failures outside the drill windows, almost all in the first two minutes before the first drill. They didn't recur, and their cause is still unexplained.
- **11 November, 30 minutes, five drills** (three cache pauses, two database pauses). Held: 628,813 requests, with all 3,296 failed checks inside the drill windows and 0 outside, 0 stale refills and 0 torn pages. Under the drills, read p99 was 199.8 ms, save p95 186.4 ms and publish p99 459.3 ms, against gates of 350, 700 and 700. k6's own thresholds still fail on this run by design, because drills cause errors, and 18,544 iterations were dropped when k6 ran out of virtual users.

A clean 24-hour run with the drills hasn't been done yet.

## Runs that missed

Some full runs miss their own thresholds, and they stay in the store. On 7 November, the OpenAPI document endpoint's p99 was 101 ms, entry deletion's p99 was 339 ms and token management's was 157 ms. They're recorded as open, not tuned away.

## What these numbers don't tell you

- **Capacity.** One laptop ran everything. These are development observations.
- **Long-run stability.** Most runs last seconds to minutes. Only the warm baseline and the soak attempts ran 30 minutes or longer, and the 24-hour gate hasn't passed.
- **Large datasets.** Each scenario builds its own small corpus, from 4 articles to 10,000 imported records. The specification's dataset of 100,000 entries per project hasn't been run.
- **Clean commits, for some cases.** Several of the 4 November runs were made on working trees with uncommitted changes; their result files say so.
- **Other CMSs.** I haven't run the same scenarios against Strapi, Payload or anyone else, so none of this is a comparison.

## Where the evidence is

The result files behind every number here, failed runs included, and the soak's definition and status are in [Colophon's repository](https://github.com/akira-shirase-oss/colophon-cms/tree/main/perf). Why the server behaves this way under failure is covered in [six publishing questions a CMS should answer](/blog/headless-cms-publishing-checklist/).

Running Colophon yourself, and what it reports about its own health, is in the docs: [monitoring](https://docs.colophon.404human.dev/self-hosting/monitoring/) and [configuration](https://docs.colophon.404human.dev/self-hosting/configuration/).
