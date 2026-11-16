---
title: "Colophon's load tests, with the caveats"
description: "Measured load results for Colophon's Rust CMS server: warm and cold reads, cache stampedes, outages and a failed 24-hour run. Laptop numbers, labelled as such."
pubDate: 2026-11-16
tags: ["performance", "load testing", "reliability", "rust"]
draft: false
---

CMS performance claims are easy to make and hard to check. "Fast" rarely comes with a machine, a commit, a dataset or a failure count. I'd rather publish numbers you can trace to a stored file, including the runs that failed, and be plain about what they can't tell you.

I'm building Colophon, an open-source CMS with a Rust server and a Svelte editor. Every load run writes a result file to `perf/results/` in the repository, named with its date, scenario and machine, and recording the commit it ran on, whether the working tree had uncommitted changes, the request counts, the latency distribution and the scenario's own pass or fail verdict. A failed run is kept, not rerun until it goes green. The numbers below are quoted from those files.

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

File: `2026-11-04T210933Z-cold-cache-throughput-apple-m2-pro-12c.json`.

## A thousand readers at the moment a cache entry expires

The classic way a cache hurts you is a stampede: a popular entry expires and every waiting reader goes to the database at once. The stampede scenario puts 1,000 callers per project on each hot key exactly at its expiry, across two projects, while another process keeps publishing.

- 22,106 requests, but only 50 origin fills for the whole run (the scenario's bound was 84). 1,673 callers waited for a fill already in progress instead of starting their own.
- 0 stale reads across 7 republished releases, and 0 reads that crossed a permission boundary.

File: `2026-11-04T204739Z-stampede-throughput-apple-m2-pro-12c.json`.

Stale reads are impossible here by construction: every cache key includes the release number, so an answer cached for release 41 can't be served for release 42.

## What happens when a dependency goes away

Speed matters less than behaviour when something breaks. Three scenarios pause a dependency in the middle of a run.

- **Cache paused for about a minute.** Every read during the outage was answered from PostgreSQL, never as a cache hit. The readiness check said `degraded`, not ready or broken. No write failed. File: `2026-11-04T193519Z-cache-down-steady-apple-m2-pro-12c.json`.
- **PostgreSQL paused and the worker killed.** During the outage, every read and write got an honest server error: 0 fake commits, 0 corrupt read-backs of acknowledged writes. Readiness said `not_ready`. Afterwards, the killed worker's job was reclaimed and finished. The whole-run p95 of about 2 seconds is the request deadline showing through during the outage, which is the point. File: `2026-11-04T193849Z-postgres-trouble-steady-apple-m2-pro-12c.json`.
- **CDN purges failing and the site frozen.** A fake CDN answered every purge with 503 for about a minute. Publishes kept landing at the API throughout, retries backed off as asked, and no release was marked verified while the fault held. File: `2026-11-04T194731Z-purge-trouble-steady-apple-m2-pro-12c.json`.

## A server killed behind a load balancer

With three API servers and two workers behind HAProxy, one server was killed with SIGKILL ten seconds into a 30-second run of writes and brought back five seconds later. 6,001 writes were acknowledged, and all 6,001 were stored, each with a distinct title. 0 logical failures. File: `2026-11-07T120926Z-failover-kill-apple-m2-pro-12c-cluster3s2w.json`.

## An agent that won't stop

Colophon lets scripts and AI agents work through API tokens with request quotas. The noisy-agent scenario runs normal editorial traffic, then adds a token capped at 60 requests a minute that tries about 600 a second.

- 99.7% of the agent's attempts were refused with `429` and a `Retry-After` header.
- Editors' p95 latency under that noise was 1.83 times their own baseline (the gate is at most 2 times). A second project's editors saw 1.86 times.

File: `2026-11-04T154012Z-noisy-agent-steady-apple-m2-pro-12c.json`.

## The 24-hour run that failed

The last load gate before version 0.1 is a 24-hour soak: mixed reads, saves and publishes at 200 a second, with a dependency outage every hour. The first attempt ran the full day and failed.

It sent 19.9 million requests. The latency gates held: reads p99 6.0 ms, saves p95 10.2 ms, publish requests p99 119 ms. There were 0 stale cache refills and 0 pages mixing two releases. But it recorded 867,613 errors, and the scenario's "no errors" gate failed. The cause was the test itself: the test account's session has a 12-hour absolute expiry, so the second half of the day collected `401` answers. File: `2026-11-09T004610Z-mixed-steady-apple-m2-pro-12c.json`.

The scenario now signs in again when its session expires, and a session-expiry drill is part of the hourly rotation so that path gets tested too. A 30-minute validation with five outage drills (three cache pauses, two database pauses) then held: 628,813 requests, with all 3,296 errors inside the announced drill windows and 0 outside. File: `2026-11-11T200341Z-mixed-steady-apple-m2-pro-12c.json`, commit `15e1e4a`, clean tree. The 24-hour run itself is still owed.

## Runs that missed

Some full runs miss their own thresholds, and they stay in the store. On 7 November, the OpenAPI document endpoint's p99 was 101 ms (the document is about 455 KB), entry deletion's p99 was 339 ms and token management's was 157 ms. They're recorded as open, not tuned away.

## What these numbers don't tell you

- **Capacity.** One laptop ran everything. These are development observations.
- **Long-run stability.** Most runs last seconds to minutes. Only the warm baseline and the soak attempts ran 30 minutes or longer, and the 24-hour gate hasn't passed.
- **Large datasets.** Each scenario builds its own small corpus, from 4 articles to 10,000 imported records. The specification's dataset of 100,000 entries per project hasn't been run.
- **Clean commits, for some cases.** Several of the 4 November runs were made on working trees with uncommitted changes; their files say so and name the base commit. The 30-minute warm baseline and the 11 November validation ran on clean commits.
- **Other CMSs.** I haven't run the same scenarios against Strapi, Payload or anyone else, so none of this is a comparison.

## Where it stands

Colophon is pre-release (0.1.0-alpha) and has no users. The full benchmark report, with every case and the command that reproduces it, is [docs/BENCHMARKS.md](https://github.com/akira-shirase-oss/colophon-cms/blob/main/docs/BENCHMARKS.md), and the result files are in [perf/results](https://github.com/akira-shirase-oss/colophon-cms/tree/main/perf/results). Why the server behaves this way under failure is covered in [what a headless CMS should be able to prove](/blog/headless-cms-should-prove/). New runs, failures included, go in the build log at [404human.dev/colophon](https://404human.dev/colophon/).
