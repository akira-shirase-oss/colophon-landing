---
kind: use-case
title: "Let AI agents draft content, and people publish"
description: "Connecting an AI agent to a CMS through MCP without giving it the publish button: scoped tokens, approvals it can't give itself, budgets and a kill switch."
targetQuery: "ai agent cms draft human approval mcp"
pubDate: 2026-11-19
related:
  - href: /features/ai-agents-mcp/
    text: "MCP for AI agents: it asks before it publishes"
  - href: /use-cases/audited-publishing/
    text: "A CMS with an audit trail for every publish"
  - href: /use-cases/members-only-content/
    text: "Members-only content on a headless CMS"
  - href: /use-cases/static-site-fresh-after-publish/
    text: "Keep a static site fresh after every publish"
  - href: /blog/ai-agents-cms-permissions/
    text: "Give AI agents CMS access, not the publish button"
  - href: https://docs.colophon.404human.dev/mcp/
    text: "The MCP server, in the docs"
faq:
  - q: "Which AI agents work with Colophon?"
    a: "Any client that speaks the Model Context Protocol, over stdio or Streamable HTTP. Colophon doesn't run a model itself; the agent and its model are yours."
  - q: "Can an agent publish if I give its token more permissions?"
    a: "It can't approve. The API refuses any token's approval of what a token submitted, so even a token with wide permissions can't approve its own or another token's work. A token you give publish rights may publish a request a person approved."
  - q: "How do I stop an agent at once?"
    a: "Revoke its API token. Each agent should have its own, so revoking one stops that agent without touching the others; its next request is refused."
---

Content teams want help from AI agents: first drafts, translations, tag clean-ups, link checks. What they don't
want is an agent that can put something on the live site because a prompt told it to. Hiding the publish tool
from the agent isn't enough, because the agent's credential still reaches the same API. The rule has to live on
the server.

## What a safe set-up needs

- **Its own credential.** One scoped API token per agent, with only the content types and fields it needs, so it can
  be revoked without stopping anyone else.
- **Drafts only.** The agent can write drafts and ask for review, and only people can approve and publish.
- **An approval it can't give itself.** If an agent can submit work and another token can approve it, two agents
  can still publish together.
- **Stale-write protection.** An agent's edit should land only on the version it read, so it never overwrites a
  person's newer work.
- **Limits.** Budgets and request quotas, so a looping agent stops instead of running up a bill or a queue.

The full checklist, for any CMS, is in [give AI agents CMS access, not the publish button](/blog/ai-agents-cms-permissions/).

## How Colophon does it

An agent that runs on its own, without a person at the keyboard, connects to Colophon's MCP server with a
project API token of its own, over stdio or Streamable HTTP. Its tools read content, search it, write drafts,
comment, file tasks and request review, and the tools generated from the API cover the rest. Which tools it
is offered is a convention, so the rule is enforced underneath: the API refuses any token's approval of what a token
submitted, whatever the token's permissions. Every write starts from what the agent read (`update_draft` takes the
revision it read, `request_review` the hash it read), so a person's newer edit is never overwritten. Budgets are
reserved in the database per token, with request quotas on top, and revoking the token stops the agent at once.

The rule was tested without a model: an adversarial evaluation suite tried the ways an agent might get content
published, and a stored run on 4 November 2026 recorded zero unauthorised actions.

## Check your own CMS

Give an agent's token every permission your CMS allows, then ask it to approve its own submission through the API
directly, not through the agent's tools. If it can, the protection is in the tool list, not in the server.

## What to know before choosing Colophon

- **It's in alpha** (0.1.0-alpha.7), and the evaluation is the project's own; no outside party has tested it.
- **The standalone MCP binary isn't in the release archives or on npm yet;** the server's own MCP endpoint is
  included.
- **Agents propose; people still do the reviewing.** Colophon makes that enforceable, not faster.
- **An AI app connected by signing in is different.** It acts as its person, with their role, and can publish
  after asking them; that suits a person working with an assistant, not an agent left to run alone.
