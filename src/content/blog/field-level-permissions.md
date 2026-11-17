---
title: "Field-level permissions in a headless CMS"
description: "Roles down to a single field or an editor's own entries in Colophon: which checks the API runs, and which rules PostgreSQL itself refuses to break."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["permissions", "roles", "security", "postgresql"]
draft: false
---

"Editors can edit articles but not the price field." "Freelancers can see and change only the entries they wrote." "Translators can read everything but only touch the body." Most teams hit a rule like this sooner or later, and a CMS's answer says a lot about how it treats permissions: as a setting on a screen, or as something enforced everywhere content can be reached.

I'm building Colophon, an open-source CMS in Rust and Svelte. This post covers its permission model, and draws a line I think CMS docs often blur: which checks happen in the application, and which rules the database itself enforces.

## The default roles

Every project starts with four roles for people:

| Role | Read | Write content | Change content types | Manage members |
|---|---|---|---|---|
| Owner | yes | yes | yes | yes |
| Developer | yes | yes | yes | no |
| Editor | yes | yes | no | no |
| Publisher | yes | yes | no | no |

Owners and publishers can approve and publish. Editors create and edit, and ask for review.

## Roles you define

Owners can create their own roles, up to 100 per project. In the Studio, a role is a grid in plain words: See, Create, Edit, Approve, Publish and Change fields, for everything at once or for each content type, plus the project-wide powers such as managing members.

Two narrowing tools take this down to the level of the examples above:

- **Field lists.** Reading, creating and updating can each be limited to named fields. "Edit the title and body of any article" is one permission.
- **Own entries.** Reading, updating and deleting can be limited to entries the person created. "Every field of their own articles" can sit beside "titles of any article" in the same role.

Any member can read what a role means before it's given to them.

## What happens when a role can't see a field

The rules apply to every read and every write, from the Studio, the CLI, the API and AI agents alike, because they all go through the same Rust services.

- **Reading.** Fields the role can't read are left out of the answer. Fields it can read but not change are marked locked. An entry it can't read at all answers `404`, the same as one that doesn't exist, so a guess can't be confirmed. Revisions and history follow the same rules.
- **Lists and search.** If a role may read only its own entries, a list holds only those. A title search looks only where the role can read titles. A search that would reveal which hidden titles match is refused instead (`403 titles_not_readable`). That gap was found while rewriting the docs, and fixed with a test that failed first.
- **Saving.** Fields the saver can't read are put back exactly as stored. A save that sends a different value for one, or changes a field the role can't change, is refused with `422 field_not_permitted`, pointing at the field.
- **Publishing.** A publish request may include an entry only if the role may change it.

The Studio's editor leaves hidden fields out entirely, shows locked ones disabled, and says which. But the Studio is a convenience on top: the server makes the decision.

## Nobody hands out more than they hold

Permission systems often leak through administration rather than content. Someone who can manage members promotes themselves, or creates a role broader than their own.

Colophon checks that whoever creates, changes or deletes a role holds every power of that role, before and after the change. Giving someone a role, or removing them, needs member management plus every power of both their old role and the new one, rechecked under a lock. So a role that manages members but can't change content types can't demote a developer, promote itself to owner, or remove an owner. A changed role takes effect from its holders' next request.

## What PostgreSQL enforces, not just the application

The field-level checks above live in one policy function in Colophon's Rust code, which every request goes through. That's application enforcement, and a bug there would matter. Some rules are important enough that the database refuses to break them even if application code tried:

- **Projects are isolated by row-level security.** The server's database login is subject to PostgreSQL row-level security, never owns the tables and never has rights to bypass it. A request runs in its project's context; rows from other projects aren't visible to it.
- **The public API reads through a role that can't see drafts.** Anonymous delivery switches to a database role whose only rights are reading published content and release numbers. A bug in a delivery query can't return a draft, because the role has no access to drafts.
- **Gated content is filtered by the database.** For members-only content on a site, Colophon's audience feature, row-level security decides inside the delivery transaction which published entries a visitor's role may read. Gated answers never touch the shared cache.
- **The owner role can't be changed.** Database triggers refuse any update or delete of the owner role or its permissions, even as the application's own login.
- **A project can't lose its last owner.** A deferred trigger refuses any commit that would leave none.
- **Some powers are never a token's.** API tokens for scripts and agents can never hold member, role or token management, or read the audit log. The API refuses those grants, and so does a database check.
- **The audit log is append-only.** Changes to roles, members, invitations and tokens, and a few operational events such as schema migration approvals, are recorded in the same transaction that makes them. The server's database login can only add to it and read it, and a trigger refuses updates, deletes and truncation, including from the table's owner. There are two sanctioned deletes, each through its own database function: the retention sweep, which removes events after 90 days by default, and deleting a whole project, which removes that project's events with it. That second one is an operator's job, run from the database owner's login; the server's own login can't call it. Whoever administers the database itself could still disable a trigger, so this protects the record from the application, not from the database's operator.

## Tokens for scripts and agents

Project API tokens use the same permission model as roles: read-only, full access, or a custom list narrowed by fields and own entries. A token is an identity of its own, so what it writes names the token. Revoking it is exact: no new request starts under it once the revocation commits. How this applies to AI agents, including the rule that a token can't approve what a token submitted, is in [give AI agents CMS access, not the publish button](/blog/ai-agents-without-the-publish-button/).

## What this doesn't cover yet

- **The audit log doesn't record content edits or publishes.** Those are attributed through revision history and the release record, which name who saved and who published.
- **No per-locale permissions yet.** Roles can't be limited to one language.
- **Sign-in extras.** There is no password reset and no emailed staff invitation yet; invitations are single-use links an owner shares.

## Where it stands

Colophon is pre-release (0.1.0-alpha.1) and has no users. The roles, field lists, own-entry conditions, tokens, audit log and the database rules above are built and covered by tests against a real database. How this compares with other CMSs is in [Colophon vs Strapi](/blog/colophon-vs-strapi/) and [Colophon vs Directus](/blog/colophon-vs-directus/). The build log is at [404human.dev/colophon](https://404human.dev/colophon/).
