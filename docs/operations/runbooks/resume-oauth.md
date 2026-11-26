---
title: Assistant resume OAuth setup and verification
---

# Assistant OAuth

The source implements an OAuth connection using the maintained Better Auth
provider. Check [project status](../../../PROJECT_STATUS.md) for release and
qualification before configuring the public server.

Add `https://rolepatch.com/api/mcp` in an OAuth-capable assistant's MCP settings.
Choose OAuth, sign in with Google, and review **Connect to RolePatch** in RolePatch
Settings. Check the client-provided name and callback origin, then allow or cancel
access. No browser cookie needs to be copied. Request the scopes needed for the task. Clients supporting renewal also request `offline_access`.

Discovery is served at:

- `/.well-known/oauth-protected-resource/api/mcp`
- `/.well-known/oauth-protected-resource/api/resume`
- `/.well-known/oauth-authorization-server/api/auth`

The issuer is `https://rolepatch.com/api/auth`. Authorization, token and dynamic
registration endpoints live under `/api/auth/oauth2/`. Public clients register
exact callbacks and use PKCE S256 with authorization-code and refresh grants.
The implementation retains the deployed MCP protocol versions and does not
claim CIMD or the newer MCP transport profile.

The protected-resource document lists available permissions. Each MCP tool’s HTTP
challenge identifies the scopes required by that call. A 401 on MCP also requests
`offline_access` for clients that renew through discovery. A 403 identifies the
missing grant. The separate `/api/resume` resource uses the original `resume` grant.

| Permission | Grants |
| --- | --- |
| `resume` | Existing master list, tailoring, and explicit history save |
| `profile:read`, `profile:write` | Read or maintain career facts |
| `answers:sensitive` | Explicit sensitive-answer access in addition to profile permission |
| `applications:read`, `applications:write` | Read or maintain applications and their events |
| `materials:read`, `materials:write` | Read or maintain materials and resume versions |
| `resume:generate` | Generate from a readable profile |
| `offline_access` | Renew the approved connection |

Clients must request expanded scopes and show the user the signed consent
request. Registration describes scopes a client can request. The access token
and current owner consent must both cover the operation. Older grants and
finite API tokens retain their original resume permissions.

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

