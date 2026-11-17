---
title: "Self-hosting Colophon: what runs today"
description: "What it takes to run Colophon, the open-source Rust CMS, on your own machine today, what an operator gets, and what a production install is still missing."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["self-hosting", "operations", "postgresql", "rust"]
# Draft until the README path is rehearsed again on current main. The commands below are
# quoted from Colophon's README on main as of 2026-11-17 (f3d22c0); the last stored mechanical rehearsal
# (scripts/clean-install.sh, perf/results/2026-11-04T225448Z-clean-install-apple-m2-pro-12c.json)
# ran against an older README, before Keycloak left the default stack. Rerun it, then publish.
draft: true
---

"Self-hosted headless CMS" usually means one of two things: a Docker image you start on a server, or source you build yourself. Colophon is the second kind today. I'm building it in the open, and this post is the honest version of a self-hosting guide: what runs, what an operator gets, and what a production install is still missing.

## What you're running

Colophon is one Rust binary, `colophon-server`, that can run as the API, the background worker, or both. Around it:

- **PostgreSQL 18**, the only source of truth for content, revisions, releases, permissions, jobs and budgets.
- **Valkey**, a Redis-protocol cache. It's disposable: if it's gone, reads fall back to PostgreSQL and nothing is lost.
- **S3-compatible object storage** for uploads. The local stack uses Garage.

Sign-in uses built-in email-and-password accounts by default. An OpenID Connect provider is optional.

## Running it on your own machine

The README is the authority, and these are its steps on `main` as I write this. You need rustup (it installs the pinned toolchain, Rust 1.99.1), Docker with Compose, Node 22.17 or later, and `curl`, `jq` and `openssl`.

```sh
git clone https://github.com/akira-shirase-oss/colophon-cms.git
cd colophon-cms

scripts/stack.sh up          # PostgreSQL, Valkey and Garage on 127.0.0.1, then checks that each works
scripts/migrate.sh           # apply migrations and create the two development accounts

set -a; . deploy/local.env; set +a
npm ci
npm run build -w @colophon/studio
COLOPHON_STUDIO_DIR="$PWD/apps/studio/build" cargo run --release -p colophon-server
```

Then open `http://localhost:58000/studio/`. In another terminal, `cargo run --release -p colophon-cli -- doctor` reports the server's status, role and each dependency, and exits 0 only when it's ready.

The local stack is for development only. Its credentials are public, written in the repository, and every port is bound to `127.0.0.1` on purpose. Don't expose it. The local settings file you load above also turns on development-only settings, such as letting website connections reach local addresses, so never copy it into a production environment. Behind a reverse proxy, set `COLOPHON_TRUSTED_PROXIES` to the proxy's address, or every visitor counts as the proxy for per-client limits. The [security policy](https://github.com/akira-shirase-oss/colophon-cms/blob/main/SECURITY.md) has the operator notes and says how to report a vulnerability.

## What an operator gets

These are built and tested in the repository:

- **Honest health checks.** `/livez` says the process answers. `/readyz` checks dependencies and says `degraded` when the cache is down and `not_ready` when PostgreSQL is.
- **Structured JSON logs** with request ids, latency and the deployment's version and commit. Every binary reports its version through `--version` and `GET /version`.
- **Backups.** Continuous WAL archiving plus encrypted base backups, with a backup script for capture, verification, a daily job and retention.
- **A rehearsed restore.** A restore script rebuilds onto clean infrastructure in six stages. It starts a new recovery epoch so jobs from before the backup are held rather than blindly resent, and it replays a deletion ledger so content deleted after the backup stays deleted. A drill on 4 November restored and verified.
- **Upgrades.** A runbook: verified backup, check pending migrations, swap the binary, migrate, smoke checks.
- **Several servers.** Sessions, idempotency keys and caches live in PostgreSQL and Valkey, so any server can answer any request. A failover test kills one of three servers behind HAProxy mid-run and loses no acknowledged write.
- **Bounded growth.** An hourly sweep removes expired jobs, sessions and old audit events. It never deletes revisions, publications or comments.

## What a production install is still missing

- **No container image.** There's no Dockerfile or published image yet; you build the binary yourself.
- **No published binaries or packages.** An install script and a Homebrew formula template exist, but no release has been published, so they have nothing to download yet.
- **No production deployment guide.** The repository's design calls for a TLS proxy in front, PostgreSQL and the cache on a private network, and separate origins for administration and public content. That's written as design, not as a tested guide.
- **No outbound proxy for deliveries.** Webhooks, cache clears and site checks never use `HTTP_PROXY`, so a host whose outbound traffic must go through a proxy can't send them yet.
- **Limited observability.** Logs and health endpoints, but no Prometheus-style metrics or OpenTelemetry export yet.
- **Backups cover PostgreSQL only.** Versioning for uploaded files in object storage is undecided for production.
- **No independent install yet.** One of the gates for version 0.1 is a person other than me installing Colophon from the README alone and recording the friction. That hasn't happened.

## Where it stands

Colophon is pre-release (0.1.0-alpha.1) and has no users; my own site doesn't run on it yet. If you try the steps above and something doesn't work as written, that's exactly the feedback the independent-install gate is for. The operational behaviour under failure is measured in [Colophon's load tests, with the caveats](/blog/colophon-load-test-numbers/), and the build log is at [404human.dev/colophon](https://404human.dev/colophon/).
