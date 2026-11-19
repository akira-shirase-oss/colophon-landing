---
kind: use-case
title: "A CMS with an audit trail for every publish"
description: "What an auditor asks of a website: what was live, who approved it, who could change it. How a headless CMS can answer from records, not from memory."
targetQuery: "cms audit trail publishing approval"
pubDate: 2026-11-19
related:
  - href: /use-cases/ai-agents-draft-people-publish/
    text: "Let AI agents draft content, and people publish"
  - href: /use-cases/members-only-content/
    text: "Members-only content on a headless CMS"
  - href: /use-cases/static-site-fresh-after-publish/
    text: "Keep a static site fresh after every publish"
  - href: /blog/website-history-past-date/
    text: "How to see what your website said on a past date"
  - href: https://docs.colophon.404human.dev/studio/publishing/
    text: "Publishing and review, in the docs"
faq:
  - q: "Does Colophon's audit log record every content edit?"
    a: "No. The append-only activity log records access changes: members, invitations, roles and API tokens. Content has its own trail: every saved revision is kept, every publish is a numbered release with its approval, and an unpublish is a release too."
  - q: "Can an editor approve their own changes?"
    a: "A project can require review stages before anything publishes. On a team of one, self-review is possible and shown as such. What no one can do is approve with a token what a token submitted, so a script or an agent can't wave its own work through."
  - q: "How long are releases kept?"
    a: "Every release is kept; release numbers only go up, and a rollback is a new release rather than a rewrite of history."
---

Regulated teams, newsrooms and anyone who answers complaints get the same three questions about their website:
**what was live on that date, who approved it, and who could have changed it?** Most CMSs can answer them only in
part, from per-entry version history, a log of who signed in and someone's memory. This page sets out what a
complete answer needs, and how Colophon records it.

## What an audit actually asks

1. **What did the page say, on a given day and time?** Not "what versions of this entry exist", but what readers
   could see then, across every entry on the page.
2. **Who approved that exact content?** An approval given before a last-minute edit shouldn't count for the edit.
3. **Who could change it?** Which roles and tokens existed, what they could touch, and when that changed.
4. **What happened when something was taken down?** A takedown that a later rollback quietly reverses is a
   compliance problem.

A per-entry history answers none of these on its own, because a site is many entries, and permissions and
approvals live somewhere else. The background is in
[how to see what your website said on a past date](/blog/website-history-past-date/).

## How Colophon records each answer

- **What was live.** Every publish is a numbered release of everything live in that environment, committed in one
  transaction and kept for good. Reading at a past release returns exactly what readers got then, with every
  reference resolved at that same release.
- **Who approved it.** A publish request pins the exact revisions in it, and an approval counts only for that
  content's hash, so an edit after approval needs approval again. Approvals expire after seven days, and a project
  can require named review stages.
- **Who could change it.** Roles are data, down to a single field or an editor's own entries, and nobody can grant
  more than they hold. Every change to members, invitations, roles and API tokens goes into an activity log that
  nobody can edit or delete.
- **Takedowns stay down.** An unpublish is a release too. The public API answers `410 Gone` for it at every release
  number, old ones included, and a rollback never brings it back.
- **Whether readers could see it.** Each release gets a receipt that says **verified at N locations** only once a
  check of the live site has seen it.

## Check your own CMS

Ask it to show the whole site as it was at 14:00 last Tuesday, then edit an entry after it has been approved and
see whether it still publishes. Then roll back past a takedown and see whether the taken-down page returns. Any
CMS that keeps a release history, binds approvals to content and treats takedowns as permanent will pass all
three.

## What to know before choosing Colophon

- **It's pre-release,** with no users yet: there's no compliance certification or third-party audit of Colophon
  itself.
- **The activity log covers access, not every content edit;** the content trail is revisions, publish requests and
  releases.
- **You run it,** so retention, backups and access to the database are your controls to set.
