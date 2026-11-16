---
title: "Rollback is a change too: reverting published content in Colophon"
description: "In Colophon, rolling back published content opens a normal publish request. It gets reviewed, lands as a new numbered release, and history only moves forward."
pubDate: 2026-11-16
tags: ["rollback", "review", "releases"]
draft: true
---

Something wrong went live. A price, a legal line, a page that should have waited. The first instinct is to find a button that makes it un-happen.

I'm building Colophon, an open-source CMS in Rust and Svelte, and I made a choice about that button early. There is a rollback in Colophon, but it doesn't skip anything. Going back to an older release opens an ordinary publish request. Someone reviews it, it's published like any other change, and it becomes a new numbered release. Release numbers never go backwards.

This post explains why, and what that choice costs.

## How to roll back published content in a CMS

There are two common shapes of rollback.

The first rewrites history. The system deletes or overwrites the bad version, or moves a "current" pointer back to an older one, as if the newer release never happened.

The second flips publish state. Each item goes back to its previous published version, or gets unpublished if it had none.

Both feel fast. Both have the same weakness: the rollback itself is a publish. It changes what readers see, and it usually does so outside the process every other publish goes through.

## Why rewriting history is risky

A rollback is made under pressure, by someone who is sure they know what the old version contained. That is exactly when a second pair of eyes helps.

Consider what an older release actually holds. It may include an entry that was taken down since for a good reason. It may include a field value that no longer fits the current content model. It may predate a fix someone else made an hour ago. A rollback that skips review restores all of that without anyone reading it.

Rewriting history has a second cost. If the record of releases can be rewound, you can no longer say with confidence what the site showed at a given point. Colophon is built around being able to answer that question, so its release history is append-only: every committed release gets the next number for its environment, and rollback is defined as a new release that points at older content.

## What happens when you roll back in Colophon

In the Studio, every release has a receipt page. On an older release, people who can edit content see a button: **Roll back to this release**. There is also a release slider for stepping through releases one by one.

Pressing the button doesn't publish anything. It builds a publish request titled "Rollback to release N" and takes you to it. The request says which release it restores, with a link back.

What goes into that request is computed, not typed. For every entry that was live at the target release, it pins the exact revision that was live then. For every entry that is live now but wasn't live then, it adds an unpublish. Entries already showing the right revision are left out. If nothing would change, the request is refused as already at that release. The caller can't add or remove entries by hand; the release decides.

From there it's a publish request like any other. It is submitted, reviewed and published through the same path, with the same checks. Content in Colophon is never edited in place: old revisions are kept, so the rollback can point at the exact bytes that were live.

One example from the test suite. It publishes version one of an entry, then version two, then rolls back to release 1. The rollback request is reviewed and published as release 3. Afterwards, reading the site pinned to release 1, 2 or 3 returns what each of those releases held, and the latest is release 3. Asking for the same rollback again is refused, because the site is already there.

## Does a rollback skip review

No. A rollback request needs the same approval as any other publish request.

An approval in Colophon is tied to the exact contents of a request, identified by a hash of every pinned entry and revision. If the request changes after approval, the approval no longer counts. Approvals also expire after seven days. Reviewing a rollback means reviewing precisely what will be restored, not a description of it.

Who may approve is a role question. By default, publishers and owners can review and publish; editors can create and edit content and ask for review. An agent can never approve its own proposal. So a script or AI assistant connected to Colophon can propose a rollback, but a person has to approve it.

## What a reviewed rollback costs

It's slower than a panic button. That's the real trade, and I'd rather say it plainly.

What keeps it workable: self-review is allowed by default. If you are the only person who can publish, you can approve your own rollback and publish it in a few clicks. The approval is still recorded, and the Studio shows a visible badge on the request: "approved their own request". A project that wants stricter rules can require a different reviewer.

So a solo maintainer pays a couple of extra clicks. A team that has chosen two-person review pays for that choice during an incident too. I think that's consistent. If a change needs a second reviewer on a normal day, it needs one on a bad day.

What you get back is a record. The rollback is a release with a number, a title, who published it and when, and a link to the request it came from, which links to the release it restores. Its delivery receipt works the same as any release's, so you can see whether the website actually picked it up. One honest note: Colophon's separate audit log today covers access changes such as roles, members and tokens, not publishes. The record of a rollback lives in the release history and its publish request.

## What a rollback won't bring back

Some things are deliberately not restored.

Content that was taken down stays down. Unpublishing in Colophon revokes every earlier publication of that entry, so a rollback to a release from before the takedown does not bring it back. History can't be used to get around a removal.

Old revisions must fit the current content model. If a field became required or changed type since the target release, publishing the rollback is refused, naming the entry and the field that fails.

Images have one known gap. Every uploaded version of an image is kept and can be addressed by its own URL, but an image's plain URL serves its current version. Making a rollback serve the exact image bytes a release used is planned follow-up work, not done.

## How other CMSs handle rollback

Other CMSs document their own approaches. Contentstack, for example, can [roll back a deployed release](https://www.contentstack.com/docs/headless-cms/roll-back-a-release). Its docs describe restoring each item to its previous published state, or unpublishing it if no prior version existed, and note that a rollback changes publish state rather than deleting or restoring content versions. A rollback release there must be deployed manually and can't be scheduled. Different design goals lead to different answers. Colophon's is to treat the rollback as one more reviewed change.

## Where it stands

Colophon isn't launched and has no users yet. I build it in public, alone. Rollback through a reviewed publish request is built and covered by tests against a real database, and the Studio has the rollback button and the release slider. Version 0.1 still has gates I owe, including a long soak run and checks that need other people. Exact image versions on rollback come later. I post progress in the build log at [404human.dev/colophon](https://404human.dev/colophon/).
