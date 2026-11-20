---
kind: feature
title: "MCP for AI agents: drafts, never publishes"
description: "Colophon's MCP server lets AI agents read content, write drafts and ask for review, while the server refuses any token's approval of a token's work."
targetQuery: "headless cms mcp server ai agents"
pubDate: 2026-11-19
related:
  - href: /features/
    text: "All of Colophon's features"
  - href: /blog/ai-agents-cms-permissions/
    text: "Give AI agents CMS access, not the publish button"
  - href: /use-cases/ai-agents-draft-people-publish/
    text: "Let AI agents draft content, and people publish"
  - href: https://docs.colophon.404human.dev/mcp/
    text: "The MCP server, in the docs"
faq:
  - q: "Which AI clients can connect?"
    a: "Any client that speaks the Model Context Protocol (version 2025-11-25), over stdio or Streamable HTTP. Colophon runs no model itself."
  - q: "What if I give the agent's token permission to approve?"
    a: "No tool uses it, and the API still refuses a token's approval of a publish request a token sent for review, with 403 agent_self_review. A second token doesn't get around it."
  - q: "How do I stop an agent?"
    a: "Revoke its API token. Each agent should have its own, so revoking one doesn't stop the others; its next request is refused with 401."
---

Yes. Colophon has an MCP server, so an AI agent can read your content, write drafts, comment, file tasks and put
its work in a publish request for review. Approving and publishing stay with people, and the server enforces
that rule rather than relying on which tools the agent is offered.

This page explains how. The questions to ask any CMS's MCP server are in
[give AI agents CMS access, not the publish button](/blog/ai-agents-cms-permissions/).

## What an agent can and can't do

| An agent can | An agent can't |
|---|---|
| Read content types, entries, publish requests, releases and their receipts, and migration plans | Approve a publish request, publish, take content down, or schedule a publish |
| Write drafts, starting from the version it read | Plan, approve, apply or cancel a schema migration |
| Comment on a revision, and create tasks for people | Delete anything |
| Group drafts into a publish request and ask for review | |

There are eighteen tools. A token that may only read gets twelve of them.

## Where the rule is enforced

The rule holds outside MCP too. A token that approves a publish request a token sent for review is refused with
`403` and `agent_self_review`, so an agent can't approve its own work through the plain API either, even with a
second token. Every write starts from what the agent read: a draft save takes the revision it read, and a request
for review takes the hash it read. If a person saved in between, nothing is overwritten.

The rule was tested without a model in the loop: an adversarial evaluation tried the ways an agent might get
content published, and a stored run on 4 November 2026 recorded zero unauthorised actions.

## Limits per agent

An agent signs in with a project API token of its own, and the token can carry ceilings:

- **`requests_per_minute`:** over it, `429 rate_limited` with `Retry-After`, before the request does any work.
- **`documents_per_day`:** over it, `403 budget_exceeded` for creates, saves and imports.
- **`max_concurrent_jobs`:** over it, `403 budget_exceeded` for a publish that would hold more delivery jobs at
  once.

Revoking the token stops the agent at its next request.

## What to know before choosing Colophon

- **It's pre-release,** and the evaluation is the project's own; no outside party has tested it.
- **Hosted CMSs offer hosted MCP servers.** Contentful and Sanity run theirs for you, with OAuth sign-in.
  Colophon's runs on your own server, over stdio or Streamable HTTP, with a project API token.
- **Token limits are set through the API.** The Studio doesn't set them yet.

The setup, with the exact calls, is in the docs' [MCP server](https://docs.colophon.404human.dev/mcp/) page.
