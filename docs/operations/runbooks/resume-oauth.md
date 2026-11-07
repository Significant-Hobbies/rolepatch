---
title: Assistant resume OAuth setup and verification
---

# Assistant OAuth

The source implements an OAuth connection using the maintained Better Auth
provider. Check [project status](../../../PROJECT_STATUS.md) for release and
qualification before configuring the public server.

Add `https://rolepatch.com/api/mcp` in an OAuth-capable assistant's MCP settings.
Choose OAuth, sign in with Google, and review **Connect your resume** in RolePatch
Settings. Check the client-provided name and callback origin, then allow or cancel
access. No browser cookie needs to be copied. Request `resume` scope; clients
supporting renewal also request `offline_access`.

Discovery is served at:

- `/.well-known/oauth-protected-resource/api/mcp`
- `/.well-known/oauth-protected-resource/api/resume`
- `/.well-known/oauth-authorization-server/api/auth`

The issuer is `https://rolepatch.com/api/auth`. Authorization, token and dynamic
registration endpoints live under `/api/auth/oauth2/`. Public clients register
exact callbacks and use PKCE S256 with authorization-code and refresh grants.
The implementation retains the deployed MCP protocol versions and does not
claim CIMD or the newer MCP transport profile.

Access JWTs expire in five minutes. Refresh lasts at most seven days while the
linked browser session stays active. Verification checks signature, type,
issuer, audience, expiry, scope, DPoP and current session/client/consent records.
**Disconnect and sign out** rejects this session's API/OAuth access immediately;
other sessions stay active. Provider refresh revocation prevents renewal;
self-contained JWTs otherwise retain their five-minute maximum and live checks.

Owned tools return a standards-based 401 challenge when disconnected, or 403
when resume scope is missing. Invalid supplied credentials cannot fall back to
a guest or cookie. Inline guest master/JD requests remain supported. MCP History
saves stay explicit; the plain API saves authenticated results by default.
OAuth requires D1 and migration 0003; no-D1 guest development stays supported.

Architecture: [ADR-0015](../../architecture/decisions/0015-assistant-resume-oauth.md).

