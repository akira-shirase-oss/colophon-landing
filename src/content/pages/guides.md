---
kind: hub
title: "Guides: building sites on a headless CMS"
description: "Step-by-step guides to building websites on Colophon with Astro and SvelteKit, each from a demo that ran: read one release, mark pages, rebuild on publish."
targetQuery: "headless cms astro sveltekit guide"
pubDate: 2026-11-19
related:
  - href: /guides/sveltekit-headless-cms/
    text: "SvelteKit and a headless CMS: one release a build"
  - href: /blog/astro-headless-cms/
    text: "Using Colophon as a headless CMS for Astro"
  - href: /use-cases/static-site-fresh-after-publish/
    text: "Keep a static site fresh after every publish"
  - href: https://docs.colophon.404human.dev/api/delivery/
    text: "The delivery API, in the docs"
---

Each guide builds a real site on Colophon's public delivery API, and its code comes from a demo site in
Colophon's repository that I ran before writing it. They share three ideas that work with any CMS whose API can
answer at a fixed version:

- **Read one release per build,** so a publish during a build can't give your pages two versions of the content.
- **Mark every page with its release,** so a check of the live site can tell whether readers see it.
- **Rebuild when a release is published,** with a receiver that ignores repeated announcements.

## The guides

| Framework | Guide | Model |
|---|---|---|
| SvelteKit | [SvelteKit and a headless CMS: one release a build](/guides/sveltekit-headless-cms/) | Prerendered, rebuilt on publish |
| Astro | [Using Colophon as a headless CMS for Astro](/blog/astro-headless-cms/) | Prerendered, rebuilt on publish |

A Next.js guide is planned. It will be written the same way, from a demo that has run.

## Before you start

You need a running Colophon with published content; the docs'
[quick start](https://docs.colophon.404human.dev/quick-start/) runs one with Docker. Colophon is pre-release, so
read [what's built](https://github.com/akira-shirase-oss/colophon-cms/blob/main/docs/ROADMAP.md) before you build
on it.
