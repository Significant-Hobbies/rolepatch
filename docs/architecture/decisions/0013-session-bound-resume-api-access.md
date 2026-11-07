---
title: Session-bound resume API capabilities
---

# ADR-0013: Session-bound resume API access

Date: 2026-10-08
Status: Accepted; deployed after local and public qualification

## Context

External callers need an owned master and resumable History without copying a
browser cookie. RolePatch already has Better Auth sessions and owner-scoped
actions. Full external OAuth would add authorization-server lifecycle and
client-registration responsibilities beyond a plain resume API connection.

## Decision

An explicit signed-in server action issues an expiring bearer capability for
only `/api/resume` and `/api/mcp`. The capability payload holds its session ID,
expiry and resume scope. Web Crypto HMAC-SHA256 signs a domain-separated message
using that session's existing random token. The session token is never returned
or accepted as a resume bearer credential.

Every bearer request checks the current session row, expiry and signature before
dispatching generation, billing or persistence. Capabilities expire after at
most 24 hours, bounded by the linked session's expiry. Ending that session
revokes its capabilities; other sessions are unaffected. Invalid credentials
cannot silently become a guest call or fall back to an accompanying cookie.

Verified identity travels through request-local AsyncLocalStorage into existing
owner-scoped actions. It is never read from client-supplied user IDs or forwarding
headers. Ordinary browser actions still use Better Auth. No migration, new
dependency, production secret or configuration change is needed.

The connection grants access to owned master profiles, resume generation using
the existing credit rules and optional History writes. It grants no application
submission, Settings changes or general account access. The stdio bridge accepts
the capability through `ROLEPATCH_API_TOKEN` in secure client configuration.

## Consequences

- Users reconnect after expiry or sign-out. This is deliberately finite access,
  not a persistent API key.
- Disconnecting all capabilities for the current session also signs that
  browser session out. Individual client revocation requires future persisted
  grants; it is not claimed here.
- This supports bearer-capable API/stdio clients. ChatGPT OAuth client support
  is separate and is not implemented by this decision.
- Synthetic local Better Auth/SQL tests must qualify issuance, ownership,
  charging/refund, exact History, expiry/revocation and concurrent request
  isolation. They cannot substitute for signed-in production qualification.

Tracking: [issue #12](https://github.com/Significant-Hobbies/rolepatch/issues/12).
