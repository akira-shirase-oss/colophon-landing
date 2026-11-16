---
title: "Content modeling that checks your stored entries"
description: "Colophon's content types: 19 field types, references that can't dangle, page-builder blocks, and schema changes checked against every stored entry first."
pubDate: 2026-11-16
tags: ["content modeling", "schema", "migrations", "headless cms"]
draft: false
---

Content modeling is the part of a headless CMS everyone compares first: which field types, can I nest them, is there a page builder. Those matter, and I'll cover them. But the harder question shows up six months in, when the model has to change and there are already a thousand entries shaped the old way.

I'm building Colophon, an open-source CMS, and this post is about both halves: the shapes it supports, and what happens when you change one.

## Field types

The Studio's type builder names each field type in plain words. There are 19:

- **Text**, with length limits, a pattern, a default, or a uniqueness rule.
- **Rich text**, stored as validated JSON, never as HTML.
- **Markdown text**, kept as text for your site to render.
- **Number**, **Yes or no**, **Choice** (a fixed list of values).
- **Date and time**, **Date**, **Time of day**.
- **Email address**, **Web address**, **Colour**.
- **Structured data (JSON)**, up to 64 KiB and 32 levels deep.
- **URL name**, the slug.
- **Link to entries**, a reference to one entry or a list of up to 100.
- **Uploaded file**, one upload or a list.
- **Group of fields**, **List** and **Page sections**, for structure.

Every field can carry help text. Validation runs on the server, and a refusal names the field with a code and a JSON Pointer, so an editor, a script and an agent all get the same answer.

## Structure: groups, lists and page sections

- A **group of fields** is an object nested inside an entry, such as an address.
- A **list** holds up to 100 items of one kind: text, numbers, or groups of fields such as a recipe's ingredients.
- **Page sections** is a page builder: up to 20 named kinds of block, each with its own fields, in any order the editor chooses.

Structures nest at most three levels deep. **Shared components** let one group of fields be reused across content types; change the component and every type that uses it changes, checked against the content each one stores. A content type can also be a **single type** holding exactly one entry, such as a home page or site settings. The database enforces the one.

## References that can't dangle

A broken link between entries is one of the quieter ways a site breaks: an article points at an author who was deleted, or at a category that was never published.

In Colophon, a reference is checked by a foreign key in PostgreSQL, not only by the application. A saved revision can't name an entry that doesn't exist, or one in a different collection than the field points to. Publishing adds a second check: a release is refused if it would leave a published entry pointing at an unpublished one, or take down an entry that something published still points at.

Every entry read also says what refers to it, so before you change or remove something you can see what depends on it. A reference can name an inverse field, so a link from an article to its author can be mirrored on the author. Deleting an entry is refused while anything depends on it.

## Rules the database enforces

Some rules can't be checked one document at a time. Uniqueness is the classic case: two editors saving the same slug at the same moment will both pass a check that reads first and writes second. So Colophon puts them in the database.

- **Slugs** are lowercase letters, digits and hyphens, refused rather than silently rewritten, and unique per collection among drafts and among published entries. A clash is `409 slug_taken`, naming the other entry.
- **Unique fields** work the same way for top-level text, email, URL, number and date fields.
- **Patterns** use Rust's regex engine, which matches in time linear in the input, so no pattern can stall a save.
- **Defaults** fill fields a new entry leaves out.
- **Conditional fields** apply only while a yes-or-no or choice field has a given value, and are required only while they apply.

## Changing a content type that already has content

This is where I think CMSs differ most, and where I spent the most care.

Colophon keeps content types as versioned definitions in PostgreSQL, not as files in your code. Owners and developers change them at runtime, through the same API as everything else. Every revision records which version of its type it was validated against.

When you change a type, Colophon sorts the change into one of three kinds:

- **Widening**, like a longer length limit or a new optional field. Nothing stored can break, so it applies.
- **Narrowing**, like a new required field, a stricter pattern or a changed field type. It applies only if every stored draft and published revision still passes. If any don't, the change is refused with `422 needs_migration`, naming up to 20 of the entries in the way, whether each is a draft or published, and why each would fail.
- **Refused outright**, like pointing a reference at a different collection, which would silently change what existing links mean.

A refused change isn't a dead end. It can become a migration plan:

1. **Plan.** Colophon checks every draft and published entry against the new definition and marks each one `ok` or `needs_input`, with the reason.
2. **Transform.** A plan can declare simple operations that run on each entry: fill a field with a value, or move a value from one path to another. A move never overwrites a value that's already there.
3. **Resolve.** For entries no rule can fix, a person supplies the corrected content, validated against the new definition like any save.
4. **Approve and apply.** The plan is approved against its own hash, so a plan that changed after approval needs approving again. A background worker then applies it entry by entry. If the worker is killed partway, the run resumes.

Every step is an API call that the Studio, the CLI and scripts share. Agents can read migration plans through the MCP server, but planning, approving and applying stay with people.

## Locales

Entries can have locale variants, grouped as one logical entry. Each variant has its own slug, draft and publication history. One honest gap: the public delivery API can't select a locale yet, so serving a multilingual site from Colophon isn't possible today.

## What's not there yet

- **Images inside rich text** are placeholders for now. Upload fields work, through a pipeline that checks every upload before it can be published.
- **Geopoint fields**, offered by some CMSs, aren't planned for 0.1.
- **Custom validation code.** The server runs no user code, so there are no validator functions; the rules above are all declared as data.

## Where it stands

Colophon is pre-release (0.1.0-alpha.1) and has no users. Everything above is built and tested in the [repository](https://github.com/akira-shirase-oss/colophon-cms), including load runs of the modeling and locale endpoints. To see how this compares with a schema-as-code CMS, read [Colophon vs Strapi](/blog/colophon-vs-strapi/) or [Colophon vs Payload](/blog/colophon-vs-payload/). The build log is at [404human.dev/colophon](https://404human.dev/colophon/).
