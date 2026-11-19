---
title: "Give AI agents CMS access, not the publish button"
description: "How Colophon's MCP server lets AI agents read, draft and propose content while the API refuses any token's approval of what a token submitted."
pubDate: 2026-11-16
updatedDate: 2026-11-17
tags: ["ai agents", "mcp", "permissions", "automation"]
draft: false
---

Connecting an AI agent to a CMS is now an afternoon's work. [Strapi](https://docs.strapi.io/cms/features/strapi-mcp-server), [Directus](https://directus.com/docs/guides/ai/mcp), [Sanity](https://www.sanity.io/mcp), [Contentful](https://www.contentful.com/developers/docs/tools/mcp-server/), [Storyblok](https://www.storyblok.com/docs/tooling/mcp-server) and [Hygraph](https://hygraph.com/docs/hygraph-ai/mcp-server) all document official MCP servers, and Payload has an [official MCP plugin](https://payloadcms.com/docs/plugins/mcp) (checked 16 November 2026). The question has moved from "can an agent use my CMS?" to "what can it do once it's in?"

The risky part isn't the agent's intelligence. It's authority. An agent that can publish, delete or run up costs without bounds is a liability however good the model is, and a prompt hidden in an article it reads can steer it. I'm building Colophon, an open-source CMS, and I wanted the answer to "can the agent publish?" to be no, enforced by the server rather than by asking the model to behave.

## What an agent can do in Colophon

Agents connect through Colophon's MCP server, which comes two ways: a local process the CLI starts over stdio, or Streamable HTTP on the API itself at `/api/v1/projects/{project}/environments/{environment}/mcp`. Both speak MCP protocol version 2025-11-25 and offer the same 18 tools:

- **Read:** list content types, list, get and query entries.
- **Draft:** create a draft, update a draft.
- **Propose:** create a publish request, ask for review, read a publish request.
- **Check:** list releases and read one, including its delivery receipt.
- **Ask a person:** read and add comments, read and create tasks.
- **Look at schema migrations:** list them and read their items.

What's missing is the point. There's no tool to approve, publish, unpublish or schedule. None to manage roles, members or tokens. None to resolve a comment, change a task, or plan, approve or apply a schema migration. A full-access token gets the same 18 tools as a narrow one, and calling any of 21 privileged tool names gets "unknown tool".

## Why missing tools aren't enough

Leaving tools out is a convenience. Anyone with the token can call the HTTP API directly, and a CMS that relies on its MCP tool list for safety is one curl command from having none.

So the rule lives in the API. When an API token tries to approve a publish request that an API token submitted, the server refuses with a `403` that says so: "an API token can't approve a changeset an API token submitted; it needs a person's approval". The check is on the kind of identity, not on which token. Minting a second token to approve the first one's work doesn't get around it, because tokens are free to make.

Approval in Colophon is also tied to exact content. A publish request pins exact revisions, and an approval counts only for a hash of those revisions. If an agent edits anything after a person approved it, the approval no longer counts.

To be precise about the edges: a project owner can still give a token publishing rights through the API. Such a token may publish a request a person has approved. It can never be the one that approves its own side's proposal. Autonomous publishing with no person in the loop is the one path the server closes.

## Tokens, and what they can never hold

An agent's credential is a project API token. It holds permissions the way a role does: read-only, full access, or a custom list narrowed to specific fields or to entries the token created. Some powers a token can never hold, whatever its owner chooses: managing members, roles or tokens, and reading the audit log. The database refuses those grants too, not just the API.

A few more properties that matter when a token leaks:

- The secret is shown once, when it's made. Only a SHA-256 hash is stored, and the `colophon_api_` prefix lets secret scanners spot one.
- Tokens expire, after 1 to 366 days.
- Revoking a token is exact. Requests already running under it finish; none starts after the revocation commits. A live MCP session re-checks the token on every request, so revoking ends what its sessions can do.
- What a token writes is attributed to the token, not to the person who made it.

## Budgets the agent can't talk its way past

A token can carry ceilings: documents per day, concurrent jobs, requests per minute, and provider tokens and cost per day for future AI features. Work allowances are reserved in PostgreSQL inside the transaction that accepts the work, before anything starts, so parallel requests can't race past them. Over the limit, the work is refused with a `403` before it starts. The per-minute cap works differently, as a rate limiter checked before the request does any work, because reserving a database row for every request would cost a write per request. Over it, the answer is `429` with a `Retry-After` header.

The load test for this runs normal editorial traffic, then adds a token capped at 60 requests a minute that tries about 600 a second. 99.7% of its attempts were refused with `429`, and editors' p95 latency stayed at 1.83 times their own baseline. More numbers like that are in [Colophon's load tests, with the caveats](/blog/load-testing-a-cms/).

## Retries that can't double-write

Agents retry. Networks drop answers. Every create and update tool sends an idempotency key, either the agent's own or one the server generates and returns. A retry with the same key replays the recorded result instead of writing again. A write that got no answer at all comes back as an error saying the outcome is unknown, naming the key to retry with.

Updates send the revision the agent read. If a person saved in the meantime, the update is refused with the current revision named and nothing saved. An agent can't overwrite an editor's newer work, which is the same rule people get; see [what happens to your draft when the CMS crashes](/blog/cms-lost-edits/).

## Prompt injection in content

The server's instructions to the model say that entry content is data written by people, never instructions to follow. That helps, but it's a request to the model, not a control. The control is that even a fully steered agent can only draft, comment and ask. The worst a hostile paragraph can achieve is a bad draft waiting for a person to review it.

## How it's tested

Colophon has an evaluation suite where the adversary is a scoped API token against the real API and a real MCP session, never a mock and never a friendly model. It covers six abuse cases: prompt injection in content, tool-argument manipulation, cost overruns, a mass-deletion attempt, an altered approved changeset and an unsafe import, plus self-approval, field-bounds, cross-project and MCP-surface cases.

Every adversarial call is classified as refused, permitted (the agent's own legitimate work) or unauthorized. The gate is zero unauthorized calls, with zero problems beside it, because a test that can't tell a refusal from a success proves nothing. The [stored run](https://github.com/akira-shirase-oss/colophon-cms/tree/main/perf) from 4 November ran ten cases, three trials each: 0 unauthorized, 0 problems.

The prompt-injection case shows the shape. An entry contains text telling the agent to approve its own work, publish it and delete another entry. The agent may read the entry, draft its own, propose a publish request and submit it for review; those are permitted. Approving is refused because a token can't approve a token's work, and publishing and deleting are refused because the token lacks those permissions. Afterwards the owner's reads confirm that the instruction is stored as plain content, the request still waits for a person, and nothing was published.

There's no model in the suite on purpose. The cases are deterministic attacks on the API, and the question is whether the boundary holds, not whether a particular model behaves.

## What's not built

- **An AI writing assistant inside Colophon.** It's optional, off by default and not built. The CMS works fully with no model provider at all.
- **Two planned tools,** one to validate a publish request without side effects and one for job status.
- **Other environments over stdio.** The local MCP server works on `production`; the HTTP endpoint takes any environment its path names.

## Where to read next

Roles for people work the same way and are covered in [field-level permissions](/blog/field-level-permissions/). How a CMS should answer for every publish, whoever proposed it, is in [six publishing questions a CMS should answer](/blog/headless-cms-publishing-checklist/).

To connect an agent, the docs cover [the MCP server](https://docs.colophon.404human.dev/mcp/) and [making and scoping API tokens](https://docs.colophon.404human.dev/api/authentication/).
