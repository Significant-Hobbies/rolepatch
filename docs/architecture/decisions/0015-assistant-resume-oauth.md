---
title: ADR-0015 — Assistant resume OAuth
---

# ADR-0015 — Assistant resume OAuth

## Status

Accepted and deployed after local end-to-end verification on 8 October 2026.
Actual external assistant acceptance is qualified separately in project status.

## Context

The scoped, finite bearer connection in [ADR-0013](0013-session-bound-resume-api-access.md)
serves API and stdio clients. ChatGPT and similar remote assistants also need
standard OAuth discovery, client registration, consent and token renewal to use
a saved master without the user copying a session credential.

## Decision

Use the maintained Better Auth 1.7.7 MCP provider and its JWT plugin. The owner
explicitly approved the server dependency, auth upgrade and eight additive
provider tables after end-to-end verification. Keep the existing Better Auth
Google login and custom D1 adapter, adding native atomic consume and guarded
update operations for one-time codes and refresh rotation.

Register `/api/mcp` and `/api/resume` as separate resource audiences. OAuth
access tokens last five minutes; refresh tokens last at most seven days. The
`resume` scope authorizes the existing resume actions; `offline_access` enables
refresh. No client-credentials grant or OIDC identity scope is enabled. Public
clients require PKCE S256 and exact registered redirects. Consent stays a
bounded state of the existing Settings page, with the client-provided name,
callback origin, account access, credit use and explicit allow/cancel controls.

Use explicit dynamic client registration for existing ChatGPT clients. Do not
claim the newer CIMD protocol profile: it requires an additional Workers-safe
metadata transport. Retain the deployed MCP protocol versions and inline guest
resume compatibility. Account-dependent tools give an RFC 9728 challenge.

Validate JWT signatures, type, issuer, resource audience, expiry and DPoP using
the official library. Then check the current database session, subject owner,
client enabled state and consent scope/resource before delegating through the
existing request-local identity to owner-scoped server actions. A JWT that
validates cryptographically still cannot use a deleted session or withdrawn
consent. Any supplied invalid authorization fails closed without cookie or
guest fallback. The finite bearer capability remains compatible.

Disconnect and sign out invalidates this session's API and OAuth access
immediately. Provider refresh-token revocation prevents renewal; a self-contained
JWT is otherwise bounded by its five-minute expiry and the live session/consent
checks. Other signed-in sessions are unaffected. No job application is submitted.

## Consequences

- The auth upgrade and additive schema require local provider/SQL/Worker
  qualification before production migration or deployment.
- Browser consent uses the provider's signed, expiring query and server-side
  session checks; no client-supplied user ID grants access.
- The selected app and landing identity and footer remain intact. No new
  primary workspace or general settings navigation is introduced.
- Local provider tests do not establish Google login in production or actual
  ChatGPT connection. Qualify those separately when browser control is available.
- Resume assembly, immutable History, credit boundaries, intact projects,
  education, pins and source fallback keep their existing contracts.

Tracking and acceptance: [issue #12](https://github.com/Significant-Hobbies/rolepatch/issues/12).
