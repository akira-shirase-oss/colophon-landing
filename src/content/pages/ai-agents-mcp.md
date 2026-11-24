---
kind: feature
title: "MCP for AI agents: it asks before it publishes"
description: "Colophon's MCP server: connect Claude, ChatGPT or Cursor by signing in; it acts with your role and asks before it publishes, deletes or changes access."
targetQuery: "headless cms mcp server ai agents"
pubDate: 2026-11-19
updatedDate: 2026-11-24
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
    a: "Any client that speaks the Model Context Protocol (version 2025-11-25) over Streamable HTTP and can sign in with OAuth: Claude.ai, Claude Desktop, Claude Code, ChatGPT and Cursor among them. Colophon runs no model itself."
  - q: "Can a connected app publish?"
    a: "Yes, if your role can, and only after it asks you. A tool that publishes, deletes, revokes, rolls back or changes access answers with what it would do and goes ahead only when it is called again with a confirmation. No app can delete a project."
  - q: "How do I stop an app?"
    a: "Revoke it under Connected apps in the Studio's account menu; changing your password disconnects them all. A script's API token is revoked in the project's settings, and its next request is refused with 401."
---

Yes. Colophon has an MCP server, and you connect an AI app to it by signing in. Paste
`https://colophonapp.404human.dev/mcp` into Claude, ChatGPT, Cursor or another app as a custom connector; the
app opens Colophon, you sign in and approve once, and it can work in all your projects. There's no token to copy.

This page explains what it can do and where the limits are. The questions to ask any CMS's MCP server are in
[give AI agents CMS access, not the publish button](/blog/ai-agents-cms-permissions/).

## What a connected app can do

- **Everything you can do in the Studio, except delete a project.** About 110 tools, generated from the API:
  content, media, publish requests and review, publishing, schedules, releases and rollbacks, members, roles,
  invitations, tokens and settings.
- **With your role, in all your projects.** One connection covers every project you belong to, including ones
  you join later. The API decides each call with your permissions, so the app can never do more than you can.
- **It asks first.** Anything that publishes, deletes, revokes, rolls back or changes people's access does
  nothing on the first call: it answers "Not done yet" with what it would do, and goes ahead only when the app
  calls again with a confirmation, after you said yes. Tools carry read-only and destructive hints, so an app can
  tell a read from a change.
- **It starts from what it read.** A write passes the version it read; if someone saved in between, nothing is
  overwritten.

## Signing in

The sign-in is OAuth 2.1 with PKCE, dynamic client registration and resource indicators. Access tokens last an
hour; refresh tokens rotate and last 30 days. They work only at the MCP address, nowhere else in the API. You see
and revoke connected apps in the Studio, under **Connected apps** in the account menu.

## Scripts and CI: API tokens

Something without a browser can connect with a project API token instead. A token is an identity of its own, for
one project, and the server enforces a rule on it whatever tools it is offered: a token that approves a publish
request a token sent for review is refused with `403` and `agent_self_review`, even with a second token. A token
can carry ceilings:

- **`requests_per_minute`:** over it, `429 rate_limited` with `Retry-After`, before the request does any work.
- **`documents_per_day`:** over it, `403 budget_exceeded` for creates, saves and imports.
- **`max_concurrent_jobs`:** over it, `403 budget_exceeded` for a publish that would hold more delivery jobs at
  once.

The token rule was tested without a model in the loop: an adversarial evaluation tried the ways an agent might
get content published, and a stored run on 4 November 2026 recorded zero unauthorised actions.

## What to know before choosing Colophon

- **It's in alpha** (0.1.0-alpha.7), and the evaluation is the project's own; no outside party has tested it.
- **The confirmation is the app's to ask.** The server holds back a tool that publishes or deletes until it is
  called again with a confirmation, but it can't see whether you really said yes. What bounds a connected app is
  your role, so connect apps you trust, and revoke them when you're done.
- **Token limits are set through the API.** The Studio doesn't set them yet.

The setup for every app, with the exact steps, is in the docs' [MCP server](https://docs.colophon.404human.dev/mcp/)
page.
