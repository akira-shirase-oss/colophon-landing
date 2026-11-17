---
title: "What happens to your draft when the CMS crashes"
description: "How Colophon keeps an acknowledged save from being lost or doubled when the server dies, two editors collide, or the network drops mid-save."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["reliability", "editing", "autosave", "testing"]
draft: false
---

You've been editing for twenty minutes. The editor said Saved a moment ago. Then the server restarts, or your laptop loses Wi-Fi, or a colleague opens the same article and saves over it. Which version survives?

Most people never ask, because most of the time nothing goes wrong. I'm building Colophon, an open-source CMS in Rust and Svelte, and I wanted a specific answer for each of those cases, backed by a test that kills the process on purpose. This post walks through them.

## What "Saved" means in Colophon

The Studio shows Saved only after the server has answered that the save committed. Before that it says Saving…, or "Unsaved changes, kept on this device". When a save fails it says "Not saved" and why. That sounds obvious, but it rules out a common shortcut: showing Saved when the request was sent, or when the browser stored a copy.

On the server, a save never edits anything in place. Every save writes a new revision, and revisions are insert-only. An old revision is never changed, and restoring one creates a new revision on top. So a bug or a crash can't corrupt a version that already exists; the worst it can do is fail to add a new one.

## When the server dies in the middle of a save

There are two moments where a crash hurts, and Colophon has a crash test for each. Both kill the real server binary at a fault point built into a test-only feature of the server.

- **Killed just before the commit.** The client must not be told the save worked, because it didn't. The test checks that no success was acknowledged, nothing was stored, and a retry with the same key then works.
- **Killed just after the commit, before the answer.** The save did happen, but the client never heard. The safe move is to retry, and the retry must not save the text a second time. The test checks that the retry returns the same result as the original.

What makes the second case work is an idempotency key. Every save carries one, and so do creates and publishes. If the same key arrives again with the same request, the server replays the answer it already recorded instead of doing the work twice. The Studio reuses the key for as long as the base revision and the content haven't changed, so a retried autosave is the same request, not a new one.

These two tests, and a third that kills the worker after it announces a release, run in CI on every push.

## When two people save the same article

Every save says which revision it started from. The server accepts it only if that revision is still the current draft. If someone else saved in between, the answer is a conflict, `409`, naming the revision that is current now. Nothing is merged silently and nothing is overwritten.

In the Studio, that conflict opens a screen with both versions side by side. You choose:

- **Keep my version** saves yours on top of theirs; theirs stays in the history.
- **Use their version** discards your unsaved changes.

Either way, the history keeps both, because both were real revisions.

Agents and scripts get the same rule. An agent's update through Colophon's MCP adapter sends the revision it read, and a stale one comes back as an error naming the current revision and saying nothing was saved. The rest of what an agent may do is in [give AI agents CMS access, not the publish button](/blog/ai-agents-without-the-publish-button/).

## When the network drops

The Studio keeps your edits in the browser first, then saves a second after you stop typing, one save at a time. If the network is gone, the edit stays on the device and goes out when the connection comes back. If you reload the page right away, your edits come back. These local copies expire after 30 days.

A local copy is not a save, and the Studio doesn't pretend it is. It's a way to not lose typing while the server can't be reached.

One case surprised me, and a test found it rather than a person. A save commits just before you reload. Meanwhile someone else saves on top. When you reopen the entry, the Studio still has your kept copy and sends it again. Without care, that becomes a conflict, or a second copy of your text. The fix: the resend carries the original idempotency key, so the server recognises it and replays the original answer. No conflict, no duplicate.

## How a crash gets tested more than once

Two crash tests prove two moments. They can't prove the thousands of orderings in between, where one editor's request is slow, another's answer is lost and a worker restarts. For that, Colophon has a deterministic simulator.

It runs the editing and publishing rules in one thread, with a virtual clock and a fake network that drops, delays, duplicates and reorders messages. Every run is chosen by a seed number. CI runs 2,000 seeds of the editing scenario and 1,000 of the publishing scenario on every push. If a seed fails, the run prints it, and replaying that seed reproduces the same failure step for step, so a once-in-a-thousand interleaving becomes a bug you can debug at your desk.

The simulator is checked two ways. A deliberately broken rule has to be caught, so it can't pass by testing nothing. And runs of the editing scenario are replayed save by save against real PostgreSQL, which must give the same answers, so the model is checked against the database it stands in for. The publishing scenario has no such replay yet. The double-save case above is one the simulator found.

## What this does not cover

- **Live co-editing.** Two people typing in the same document at once, Google Docs style, is not a goal. Colophon detects the collision and asks a person to choose.
- **Unsent typing on a lost device.** If a laptop dies before the browser stores the edit, that edit is gone. The guarantee starts when the server acknowledges a save.
- **The whole-system crash demo.** A recorded run that kills the server and worker at random during saves and publishes, then checks that nothing was lost or doubled, is on the list for version 0.1. It isn't recorded yet. What is recorded, including a server killed behind a load balancer with no acknowledged write lost, is in [Colophon's load tests, with the caveats](/blog/colophon-load-test-numbers/).

## Where it stands

Colophon is pre-release (0.1.0-alpha.1) and has no users yet. I'm building it in public, alone. Insert-only revisions, expected-revision saves, idempotent retries, the conflict screen, the crash tests and the simulator are built and run in CI. Publishing has the same kind of protection, which is the subject of [what a headless CMS should be able to prove](/blog/headless-cms-should-prove/). The engineering behind each step goes in the build log at [404human.dev/colophon](https://404human.dev/colophon/).
