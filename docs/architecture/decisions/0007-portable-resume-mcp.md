---
title: ADR-0007 — Portable resume MCP
---

# ADR-0007 — Portable resume MCP

**Date:** 2026-10-07
**Status:** accepted

## Context

An assistant should be able to send a job reference and return a tailored resume
without driving RolePatch's browser UI. Job IDs are scoped to their board; a
number alone cannot identify an arbitrary posting. Browser localStorage is not
available to an HTTP or stdio MCP client. Existing tailoring already owns the
AI gateway, factual-grounding prompt, token debit/refund and change explanations.

## Decision

Expose a stateless, JSON-response Streamable HTTP MCP endpoint and a Node stdio
bridge. Reuse the existing server actions. Public callers bring explicit resume
Markdown on every call; they cannot list or resolve cloud-owned records. A
signed-in session can use the existing owner-scoped actions and token rules.
Results are portable, unsaved drafts requiring review, with no apply tools.

Accept full public posting URLs or pasted descriptions. Resolve qualified IDs
for LinkedIn, Greenhouse, Lever and Ashby; board-scoped IDs require a company
slug. A RolePatch saved ID requires a session. Do not guess a bare ID's source.

Hosted extraction uses the fixed public reader origin already used by the
product. The optional local bridge can import Fleet's `slow-serp` HTTP parser
without requiring that sibling checkout for normal operation. It pins validated
public IPv4 addresses and rechecks redirects. Access challenges fall back to
pasted descriptions; no browser session or CAPTCHA bypass is used.

## Consequences

The endpoint can work with remote assistants after deployment; the local bridge
works with stdio clients. The focused protocol handler follows the repository's
existing dependency-free MCP precedent: initialize, notifications, ping, tool
listing and calls. It does not implement server-push SSE, sessions or resumability.
Account OAuth is not implemented: a remote assistant cannot silently retrieve a
user's saved resume. Session cookies are only an optional local-client facility.

The in-isolate request limit supplements the existing shared AI gateway; it is
not a durable global quota. Hosted anonymous generation retains the existing
guest-mode policy. Public URLs do not guarantee extractability or job identity;
the caller must review extracted context and the resulting resume.

## Alternatives considered

- New tailoring service: rejected because it would duplicate token and grounding behavior.
- OAuth/account-first MCP: defer until access to stored cloud records is needed remotely; adding an auth-provider migration is outside this change.
- Require `slow-serp` as a service: rejected because RolePatch must remain independently operable and Workers cannot run its local browser runtime.
- Guess globally unique IDs: rejected because job boards use overlapping identifiers.
