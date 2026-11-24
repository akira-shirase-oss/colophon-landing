---
kind: hub
title: "Features of an open-source headless CMS"
description: "What Colophon does: publish receipts, releases with reviewed rollback, and an MCP server where AI agents ask before they publish. A page for each."
targetQuery: "open source headless cms features"
pubDate: 2026-11-19
related:
  - href: /features/publish-receipts/
    text: "Publish receipts: proof of what readers see"
  - href: /features/releases-and-rollback/
    text: "Releases and rollback in a headless CMS"
  - href: /features/ai-agents-mcp/
    text: "MCP for AI agents: it asks before it publishes"
  - href: /compare/
    text: "Open-source alternatives to popular CMSs"
---

Colophon is an open-source headless CMS, under the MIT licence, that you can use on its hosted service or run
on your own servers with PostgreSQL. Each page below answers one question, "does it do this, and how?", with the details from the docs.
It is in alpha, as the status line above says.

## Publish receipts

Every publish ends with a receipt: what went live, what each website connection did with it, and whether a check
of your live site saw it. A release is only called **verified** when a site check saw it, and then it says from
how many places. [How publish receipts work](/features/publish-receipts/).

## Releases and rollback

Every publish is a numbered release of the whole site that you can read later by its number. A rollback is a
publish request like any other, reviewed, and it lands as a new release; an entry that was taken down stays down.
[How releases and rollback work](/features/releases-and-rollback/).

## AI agents through MCP

An MCP server lets an AI app work in your projects once you sign in: it acts with your role, and anything that
publishes, deletes or changes access waits for your yes. Scripts can use a token of their own, under per-token
limits, and the server refuses any token's approval of a token's work. [How the MCP server works](/features/ai-agents-mcp/).

## Coming next

Roles down to a single field, the append-only audit log, and scheduled publishing across clock changes get their
own pages next. Meanwhile, [field-level permissions](/blog/field-level-permissions/) and
[scheduled publishing](/blog/scheduled-publishing-pitfalls/) explain them.
