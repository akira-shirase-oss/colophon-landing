---
title: "Scheduled publishing that survives downtime"
description: "How Colophon schedules a publish: a local time and time zone, explicit choices at daylight-saving edges, a full recheck when it runs, and a delayed label."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["scheduling", "publishing", "reliability", "time zones"]
draft: false
---

Scheduled publishing looks like the simplest feature a CMS has. Pick a date, pick a time, go to bed. It hides four awkward questions:

1. Which time did you mean, when the clocks change that night?
2. What if the content changed after it was approved?
3. What if the server is down at the scheduled moment?
4. What if two servers both think it's their job?

I'm building Colophon, an open-source CMS in Rust and Svelte. Here is how its scheduler answers each one, and what it doesn't do.

## What a schedule stores

In Colophon you schedule a publish request, the reviewed set of exact revisions that would otherwise be published by hand. The request has to be approved first, and the person scheduling it needs the right to publish it now.

A schedule keeps what its author chose: a local date and time, and an IANA time zone such as `Europe/London`. It also stores the exact instant that resolves to, the hash of the publish request, and the approval it will publish under. One publish request can have one pending schedule. In the Studio, a publish request has a Schedule panel, and the Releases page lists what is scheduled.

The time has to be in the future, within a year and a day, and before the approval expires. Approvals in Colophon last seven days, so a schedule can't outlive the review behind it.

## When the clocks change

Twice a year in many zones, some local times happen twice and some don't happen at all. In New York, 01:30 on the night the clocks go back happens twice, and 02:30 on the night they go forward never happens.

Most schedulers pick one silently. Colophon refuses the ambiguous or missing time with a `422` that lists both possible instants, and asks for an explicit choice: earlier or later. The choice is stored with the schedule. The resolution uses a time zone database built into the server, and the tests cover New York's and London's 2026 changes.

## When the content changed after approval

An approval in Colophon is bound to a hash of every revision in the request. If someone edits an entry in it after the approval, the hash no longer matches.

When the schedule falls due, everything is checked again, as if the author pressed publish at that moment: the approval, the hash, the author's current role, whether they're still in the project, and whether a URL name the release would publish is now taken by another entry. If anything fails, the schedule is blocked, with the reason in plain words, and nothing is published. Edited content blocks the release rather than silently publishing the edit or the old version.

The publish runs as the person who scheduled it, so "who published this" stays true, and demoting or removing someone stops the schedules they set. Roles are covered in [field-level permissions](/blog/field-level-permissions/).

## When the server is down at the scheduled time

A schedule is a row in PostgreSQL, not a timer in a process's memory. A background loop in the worker asks the database for due schedules, every half second by default. If no worker is running at the scheduled moment, nothing is lost: when one starts, the schedule is due and runs.

It isn't presented as on time, though. A publish that starts more than 60 seconds after its scheduled instant is labelled delayed, and the Studio shows it as "Published late, as release 12" rather than "Published on time". If you scheduled an announcement for 09:00 and the server came back at 09:40, the record says it went out late.

There's one limit worth knowing. Because a schedule must fall before its approval expires, downtime long enough to outlast the approval ends with the schedule blocked as expired, not published days late on a stale review.

For comparison, Strapi documents a different choice for its scheduled releases: "If the server restarts less than 5 minutes after the scheduled time, the release is published automatically," and after that "the release ends as `Failed` and all its entries are skipped" ([Strapi Releases docs](https://docs.strapi.io/cms/features/releases), checked 16 November 2026), and, from Strapi 5.62.0, a "Create release from skipped" action recovers the skipped entries. That's a clear, documented rule. Colophon's rule is: run late, say so, and recheck everything first. The rest of the Strapi picture is in [Colophon vs Strapi](/blog/colophon-vs-strapi/).

## When two workers race

Colophon can run several workers. Each takes a due schedule with a row lock that skips rows another worker already holds, then runs the same publish routine the API uses, on the latest release number. The release and the schedule's published state commit in the same transaction. A test runs two workers against one schedule at once and checks it publishes exactly once.

Publishing itself can't double up either. A release commits only from the release number the publisher saw, so two attempts can't both land. More on that in [six publishing questions a CMS should answer](/blog/headless-cms-publishing-checklist/).

## Cancelling

Cancelling a schedule waits for a run already in progress and never undoes a release. If you cancel at 08:59:59 and the publish began at 08:59:58, you'll see a published release, not a half-cancelled one. To take content down, publish a request that unpublishes it, which can be scheduled the same way. If a scheduled release went out wrong, [rolling it back](/blog/roll-back-a-bad-publish/) is another reviewed release.

## What it doesn't do

- **No recurring schedules.** Each schedule is one publish, once. Recurrence isn't planned.
- **No crash test for the scheduler itself yet.** The scheduler is tested with a fake clock that's advanced in the test: on time, late and labelled delayed, cancelled, blocked by an edit or an expired approval, run as its author, and raced by two workers. The killed-process tests cover saving and delivery, not a worker killed mid-schedule.
- **Delayed by how much is a label, not an alert.** Colophon records that a publish was late; it doesn't notify anyone yet.

The steps in the Studio, including the choice at a clock change, are in the docs: [scheduling](https://docs.colophon.404human.dev/studio/scheduling/).
