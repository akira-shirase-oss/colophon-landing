---
kind: compare
title: "Colophon vs Decap, Keystatic and TinaCMS"
description: "A database CMS or a git-based one? Colophon compared with Decap, Keystatic and TinaCMS on history, review, permissions, scheduling and builds, dated."
targetQuery: "git based cms vs headless cms decap keystatic tina alternative"
pubDate: 2026-11-19
factsChecked: 2026-11-19
status: "Decap, Keystatic and TinaCMS facts were checked on 19 November 2026 against their own docs and repositories; corrections are welcome."
related:
  - href: /compare/
    text: "Open-source alternatives to popular CMSs"
  - href: /blog/website-history-past-date/
    text: "How to see what your website said on a past date"
  - href: /blog/roll-back-a-bad-publish/
    text: "How to roll back a bad CMS publish"
  - href: /use-cases/static-site-fresh-after-publish/
    text: "Keep a static site fresh after every publish"
  - href: /blog/field-level-permissions/
    text: "Field-level permissions in a headless CMS"
faq:
  - q: "Isn't git history already a full audit trail?"
    a: "For the content files, largely yes: every commit is a snapshot of the whole site with an author and a date, and reverting one is cheap. What git doesn't give you is permissions finer than the repository, a scheduled publish, a query API, or a check that the live site actually shows a given commit."
  - q: "Does Colophon store content as Markdown files in my repository?"
    a: "No. Content lives in PostgreSQL and is read through the delivery API; rich text is stored as validated JSON. That is the main trade: you give up content in pull requests for runtime content types, field permissions, scheduling and queries."
  - q: "Can I use Colophon with a static site generator, like a git-based CMS?"
    a: "Yes. The site reads the delivery API at build time and rebuilds on a webhook when a release is published; five Astro demo sites in the repository work that way."
---

I build Colophon, so read this with that in mind. Every fact about Decap, Keystatic and TinaCMS below links to
their own docs or repositories, checked on 19 November 2026. If one has changed,
[open an issue](https://github.com/akira-shirase-oss/colophon-cms/issues) and I'll correct it with a dated note.

## The short answer

Git-based CMSs store content as files in your repository, so they get whole-site history, diffs, review in pull
requests and one-command revert for free, and they need no database. That's a real strength, and if a small team
editing Markdown is your case, a git-based CMS is a natural fit.

Colophon is a database CMS that copies git's best idea: every publish is a numbered release of the whole site,
kept forever and readable later, and a rollback is a reviewed change, like a revert commit. On top of that it
adds what a repository can't do on its own: content types you change at runtime, roles down to a single field,
scheduled publishing, a query API, and a receipt that checks the live site. Colophon is pre-release, as the
status line above says.

## At a glance

Checked on 19 November 2026.

| | Colophon | Git-based CMSs |
|---|---|---|
| Content lives in | PostgreSQL | Files in your git repository: Markdown, MDX, JSON or YAML |
| Review | Publish requests, approval bound to exact content, review stages | Pull requests. Decap's editorial workflow makes each draft a branch and pull request, and publishing merges it ([docs](https://decapcms.org/docs/editorial-workflows/)); a TinaCMS save is a commit ([docs](https://tina.io/docs)) |
| Whole-site history | Numbered releases, each readable later | Git history |
| Permissions | Roles down to a field or an editor's own entries | Your git host's repository access |
| Scheduling | A local time in a named time zone, rechecked when due | Not built in |
| Server | A Rust server and PostgreSQL that you run | None, or an optional hosted backend |

The three git-based CMSs:

| Project | Where content is saved | Licence |
|---|---|---|
| Decap | Your repository, through the GitHub, GitLab or Bitbucket API ([docs](https://decapcms.org/docs/intro/)) | MIT |
| Keystatic | Local files, GitHub, or both; Keystatic Cloud is optional ([docs](https://keystatic.com/docs/introduction)) | MIT ([repository](https://github.com/Thinkmill/keystatic)) |
| TinaCMS | Your repository; Tina Cloud, or a backend you host ([docs](https://tina.io/docs)) | Apache-2.0 ([repository](https://github.com/tinacms/tinacms)) |

All three are established open-source projects; Colophon is pre-release, with one maintainer.

"Not built in" means the project's own docs describe no scheduler; a scheduled build or a dated merge can do the
job outside the CMS.

## What Colophon does, and why it matters

### Whole-site history without a repository

Colophon's releases give the "what was live on that day" answer that git gives, without putting content in a
repository: any past release can be read through the API, with every reference resolved at that same release.
See [how to see what your website said on a past date](/blog/website-history-past-date/).

### Permissions finer than the repository

In a git-based CMS, whoever can push to the repository can change any file in it. Colophon's roles reach down
to a single field, or to an editor's own entries, and PostgreSQL enforces the rules that matter most. See
[field-level permissions in a headless CMS](/blog/field-level-permissions/).

### A publish that knows whether it reached readers

A merge in a git-based CMS starts a build, and whether the live site changed is up to your host. Colophon
announces each release to a webhook with a stable key and marks it **verified** only once a check of the live
page has seen it. See [keep a static site fresh after every publish](/use-cases/static-site-fresh-after-publish/).

### A rollback is reviewed

Reverting a commit is quick and anyone with push rights can do it. In Colophon a rollback is a publish request,
reviewed and landing as a new release, and a takedown stays down. See
[how to roll back a bad CMS publish](/blog/roll-back-a-bad-publish/).

## What to know before choosing Colophon

- **It's pre-release.** The first version is tagged, and its npm packages aren't published yet. Nobody runs it
  in production.
- **You run a server and a database.** A git-based CMS needs neither; Colophon needs PostgreSQL, backups and
  upgrades.
- **Content isn't in your repository.** No Markdown files, no content in pull requests, and no review in your git
  host's tools.
- **The public delivery API has no language parameter yet,** and webhooks aren't signed yet.
