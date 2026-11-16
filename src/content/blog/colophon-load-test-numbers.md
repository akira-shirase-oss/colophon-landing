---
title: "Colophon's load tests, with the caveats"
description: "Measured load results for Colophon's Rust CMS server: warm and cold reads, cache stampedes, outages and a failed 24-hour run. Laptop numbers, labelled as such."
pubDate: 2026-11-16
tags: ["performance", "load testing", "reliability", "rust"]
draft: false
---

CMS performance claims are easy to make and hard to check. "Fast" rarely comes with a machine, a commit, a dataset or a failure count. I'd rather publish numbers you can trace to a stored file, including the runs that failed, and be plain about what they can't tell you.

I'm building Colophon, an open-source CMS with a Rust server and a Svelte editor. Every load run writes a result file to `perf/results/` in the repository, named with its date, scenario and machine. A file records the commit it ran on, the request counts, the latency distribution and the scenario's own pass or fail verdict, and most also record whether the working tree had uncommitted changes. A failed run is kept, not rerun until it goes green. The numbers below are quoted from those files, and each section names its file.

## The machine, and why it matters

Every run here was on one laptop: an Apple M2 Pro with 12 cores and 32 GB of memory. The release-built server, PostgreSQL 18, the Valkey cache and the S3-compatible object store (all in Docker), and the k6 load generator shared those 12 cores, along with whatever else the laptop was doing.

That makes these numbers evidence about the code's behaviour, not a capacity claim. A production deployment on separate machines would draw different curves, better or worse, and nothing here predicts them. The proper reference setup, with a separate database host and load generator, hasn't been run yet.

## Warm reads for 30 minutes

The baseline case is anonymous readers hitting published content that's already in the cache, at a steady 300 requests a second for 30 minutes.

- 540,063 requests, 0 failures.
- p95 6.4 ms, p99 19.6 ms, and every five-minute window's p99 inside the gate (p99 under 350 ms).
- 99.98% cache hits: 485,976 hits against 119 misses.
- Server memory peaked around 41 MB; server CPU averaged 6.9%.

File: `2026-11-04T220239Z-warm-baseline-steady-apple-m2-pro-12c.json`, commit `09217ad`, clean tree.

## Cold reads, where every request hits the database

A cache that hides the database can make any system look fast. So one scenario makes every read unique: 30,000 reads across a 2,048-entry corpus, each one a real PostgreSQL fill.

- 30,095 requests at about 1,017 a second, 0 errors.
- p95 62.1 ms, p99 68.2 ms.
- 0 cache hits, by design. About three database transactions per request.

File: `2026-11-04T210933Z-cold-cache-throughput-apple-m2-pro-12c.json`, commit `080053e` with uncommitted changes.

## A thousand readers at the moment a cache entry expires

The classic way a cache hurts you is a stampede: a popular entry expires and every waiting reader goes to the database at once. The stampede scenario puts 1,000 callers on one project's hot key exactly at its expiry, and 200 on a second project's to check that no answer crosses between them, while a third arm republishes an entry every 12 seconds.

- 22,106 requests, but only 50 origin fills for the whole run (the scenario's bound was 84). 1,673 callers waited for a fill already in progress instead of starting their own.
- 0 stale reads across 7 republished releases, and 0 reads that crossed between the projects.

File: `2026-11-04T204739Z-stampede-throughput-apple-m2-pro-12c.json`, commit `080053e` with uncommitted changes.

Stale reads are impossible here by construction: every cache key includes the release number, so an answer cached for release 41 can't be served for release 42.

## What happens when a dependency goes away

Speed matters less than behaviour when something breaks. Three scenarios pause a dependency in the middle of a run. These are the clean reruns from 7 November, on commit `4c5e605` with no uncommitted changes; the 4 November runs before them held too.

- **Cache paused for about a minute.** All 24,000 reads during the outage were answered from PostgreSQL, none as a cache hit, with 0 errors. The readiness check said `degraded` throughout the outage, never ready and never broken. No write failed. File: `2026-11-07T115354Z-cache-down-steady-apple-m2-pro-12c.json`.
- **PostgreSQL paused and the worker killed.** During the outage, every read and write got an honest "unavailable" error: 0 fake commits, 0 corrupt read-backs of acknowledged writes. Afterwards, all 7,227 recovery requests succeeded and the killed worker's job was reclaimed and finished. File: `2026-11-07T115717Z-postgres-trouble-steady-apple-m2-pro-12c.json`.
- **CDN purges failing and the site frozen.** A fake CDN answered every purge with 503 for about a minute. 480 publishes landed at the API during the outage, none failed, retries waited at least the 5 seconds the CDN asked for, and no release was marked verified while the fault held. File: `2026-11-07T120039Z-purge-trouble-steady-apple-m2-pro-12c.json`.

## A server killed behind a load balancer

With three API servers and two workers behind HAProxy, one server was killed with SIGKILL ten seconds into a 30-second run of writes and brought back five seconds later. 6,001 writes were acknowledged, and all 6,001 were stored, each with a distinct title. 0 logical failures. File: `2026-11-07T120926Z-failover-kill-apple-m2-pro-12c-cluster3s2w.json`, commit `a356a44`.

## An agent that won't stop

Colophon lets scripts and AI agents work through API tokens with request quotas. The noisy-agent scenario runs normal editorial traffic, then adds a token capped at 60 requests a minute that tries about 600 a second.

- 99.7% of the agent's attempts were refused with `429` and a `Retry-After` header.
- Editors' p95 latency under that noise was 1.83 times their own baseline; the gate is twice the baseline plus 2 ms. A second project's editors saw 1.86 times.

File: `2026-11-04T154012Z-noisy-agent-steady-apple-m2-pro-12c.json`, commit `7d29742` with uncommitted changes.

## The 24-hour run that failed

The last load gate before version 0.1 is a 24-hour soak: mixed reads, saves and publishes at 200 a second, with a dependency outage every hour. The first attempt, on 9 November, ran the full day at that rate but without the hourly outages, because the drill runner was written afterwards. It failed.

It sent 19.9 million requests. k6 counted 3,458,766 failed requests and 6,049,935 failed checks, and the scenario counted 867,613 errors, so its "no errors" gate failed. The cause was the test itself: the test account's session has a 12-hour absolute expiry, and the scenario signed in once, so for the second half of the day every signed-in call got a `401`. Reads, which need no session, held their gate all day: p99 6.0 ms. The save (p95 10.2 ms) and publish (p99 119 ms) figures cover a day in which about half those calls were refused, so they aren't evidence of a full day of saves. There were 0 stale cache refills and 0 pages mixing two releases. File: `2026-11-09T004610Z-mixed-steady-apple-m2-pro-12c.json`, commit `88ef666`.

The scenario now signs in again when its session expires, and a drill runner pauses the cache or the database on a schedule and expires the sessions every sixth drill. Getting to a passing run took five more full runs, all at 300 requests a second (three short harness checks from the same day are stored too):

- **10 November, 1 hour.** The re-sign-in fix worked: 34 re-sign-ins after every session was expired mid-run. But the gate failed, with 443 counted errors and 161,332 failed requests. Refusals during a 30-second database pause counted against a gate that allowed none, and a gate like that can never pass a run with drills in it, so it became drill-aware: errors inside an announced drill window are recorded as drill evidence, and any error outside one fails the run. File: `2026-11-10T174746Z-mixed-steady-apple-m2-pro-12c.json`.
- **11 November, 1 hour.** It reported held, but the gate was vacuous: the error count it checked never reached the summary, so it was zero by construction. Recorded as a harness defect, not a pass. File: `2026-11-11T142834Z-mixed-steady-apple-m2-pro-12c.json`.
- **11 November, 1 hour.** The new failure stamps worked, though a harness bug made the gate fail closed before it could sort them; they exposed a scenario bug: about three quarters of one check's pinned reads asked for an entry at a release it wasn't in yet. That bug had also produced most of the failed requests in the two runs before. File: `2026-11-11T163036Z-mixed-steady-apple-m2-pro-12c.json`.
- **11 November, 30 minutes.** With the scenario fixed, it still failed: 1,536 failures outside the drill windows, almost all in the first two minutes before the first drill. They didn't recur, and their cause is still unexplained. File: `2026-11-11T171030Z-mixed-steady-apple-m2-pro-12c.json`.
- **11 November, 30 minutes, five drills** (three cache pauses, two database pauses). Held: 628,813 requests, with all 3,296 failed checks inside the drill windows and 0 outside, 0 stale refills and 0 torn pages. Under the drills, read p99 was 199.8 ms, save p95 186.4 ms and publish p99 459.3 ms, against gates of 350, 700 and 700. k6's own thresholds still fail on this run by design, because drills cause errors, and 18,544 iterations were dropped when k6 ran out of virtual users. File: `2026-11-11T200341Z-mixed-steady-apple-m2-pro-12c.json`, commit `15e1e4a`, clean tree.

A clean 24-hour run with the drills hasn't been done yet.

## Runs that missed

Some full runs miss their own thresholds, and they stay in the store. On 7 November, the OpenAPI document endpoint's p99 was 101 ms, entry deletion's p99 was 339 ms and token management's was 157 ms. They're recorded as open, not tuned away.

## What these numbers don't tell you

- **Capacity.** One laptop ran everything. These are development observations.
- **Long-run stability.** Most runs last seconds to minutes. Only the warm baseline and the soak attempts ran 30 minutes or longer, and the 24-hour gate hasn't passed.
- **Large datasets.** Each scenario builds its own small corpus, from 4 articles to 10,000 imported records. The specification's dataset of 100,000 entries per project hasn't been run.
- **Clean commits, for some cases.** Several of the 4 November runs were made on working trees with uncommitted changes; their files say so and name the base commit, as noted above.
- **Other CMSs.** I haven't run the same scenarios against Strapi, Payload or anyone else, so none of this is a comparison.

## Where it stands

Colophon is pre-release (0.1.0-alpha.1) and has no users. Every file named here is in [perf/results](https://github.com/akira-shirase-oss/colophon-cms/tree/main/perf/results), indexed in `history.jsonl`, and the soak's definition and status are in [perf/LOAD_MATRIX.md](https://github.com/akira-shirase-oss/colophon-cms/blob/main/perf/LOAD_MATRIX.md). The repository's benchmark report, `docs/BENCHMARKS.md`, predates the soak work. Why the server behaves this way under failure is covered in [what a headless CMS should be able to prove](/blog/headless-cms-should-prove/). New runs, failures included, go in the build log at [404human.dev/colophon](https://404human.dev/colophon/).
