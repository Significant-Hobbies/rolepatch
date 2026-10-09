---
title: Resume MCP setup and verification
---

# Resume MCP

Return a tailored draft from an assistant using a base resume plus a job URL,
qualified ID or pasted description. The result includes complete Markdown and
change explanations; request `format: "html"` for an additional portable HTML
document. MCP drafts are unsaved by default; request save_to_history explicitly to save a signed-in version. No application is submitted.

Architecture and limits: [ADR-0007](../../architecture/decisions/0007-portable-resume-mcp.md).
Fixed-wording tailoring: [ADR-0008](../../architecture/decisions/0008-fixed-wording-resume-ranking.md).
The source of the input contract is
[`resume-assistant-input.ts`](../../../src/lib/resume-assistant-input.ts).

## Account connection

RolePatch provides **Connect your resume API** in account Settings.
Create it while signed in, copy it to your
client's secure configuration, and send `Authorization: Bearer <token>` to
`/api/resume` or `/api/mcp`. Do not put it in URLs, chat, logs or source control.
For the stdio bridge, set `ROLEPATCH_API_TOKEN`. Token authentication takes
precedence over the legacy session-cookie bridge; no cookie copying is needed.

The token can read owned master profiles, generate using existing credits and
save versions to Jobs History. With exactly one master, send only a JD; with
multiple masters, choose an ID from `rolepatch_resume_profiles`. Plain API
history defaults to saved; MCP keeps its explicit `save_to_history` opt-in.

Access expires within 24 hours, bounded by the linked session expiry. Sign-out
revokes tokens from that session. **Disconnect and sign out** revokes all its
tokens and ends that browser session, without changing other devices. The page
only keeps a newly issued token in React memory; copy it before leaving. There
is no individual-client revocation or persistent API-key list.

This finite bearer connection remains available alongside the assistant OAuth connection below. Local real Better Auth/SQLite tests cover the
session → issuance → bearer → owned master → exact saved History path, including
forged/expired/revoked access and concurrent guest isolation. They do not prove
signed-in production persistence. See [ADR-0013](../../architecture/decisions/0013-session-bound-resume-api-access.md).

## Assistant OAuth

OAuth-capable assistants connect through the standard provider; the finite
bearer API above stays compatible. See the [OAuth setup and qualification
runbook](resume-oauth.md) for discovery, scopes, consent, renewal and revocation.
Current production qualification remains in [project status](../../../PROJECT_STATUS.md).

## Local stdio clients

Start RolePatch with `pnpm dev`. Configure the assistant's MCP client:

```json
{
  "mcpServers": {
    "rolepatch": {
      "command": "node",
      "args": ["/absolute/path/to/rolepatch/scripts/resume-mcp.mjs"],
      "env": { "ROLEPATCH_BASE_URL": "http://localhost:3000" }
    }
  }
}
```

Launch Node directly in client configuration: `pnpm resume:mcp` is useful for
manual operation but package-manager banners should not appear on MCP stdout.
Set the origin to the port actually used by your local app. HTTPS is required
for non-local origins. Keep credentials in the client's secure configuration,
never in committed examples or chat.

For Codex, wait for server startup before tool discovery:

```toml
[mcp_servers.rolepatch]
command = "node"
args = ["/absolute/path/to/rolepatch/scripts/resume-mcp.mjs"]
required = true
startup_timeout_sec = 30
tool_timeout_sec = 120

[mcp_servers.rolepatch.env]
ROLEPATCH_BASE_URL = "https://rolepatch.com"
```

Optional-server startup can finish after the initial tool catalog is assembled.
The required-server setting qualified actual discovery and generation in Codex.
Keep tool approval enabled: `rolepatch_tailor_resume` is not read-only because
signed-in calls charge a token and can explicitly save History. A client using
approval policy `never` may reject it before dispatch; approve only the intended
call through the client's normal tool controls. Do not change annotations or
disable the sandbox to avoid approval.

Optional local extraction reuse:

```json
"ROLEPATCH_SLOW_SERP_ROOT": "/Users/sarthak/Desktop/fleet/slow-serp"
```

This imports the sibling's HTTP extraction module at runtime. It does not
start a service or Chrome and does not write a cache to disk. If the checkout
is absent, omit this option and use hosted extraction or `jd_text`.

## Remote HTTP clients

The deployed endpoint is `https://rolepatch.com/api/mcp`.
It accepts MCP POST requests with `Content-Type: application/json` and
`Accept: application/json, text/event-stream`; responses are JSON. GET streams
are unsupported. Account-dependent tools advertise OAuth resource discovery.

For a remote assistant, attach/provide your base resume to that assistant, then
have it send `resume_markdown` for every call. The endpoint cannot read browser
localStorage. Listing saved profiles or using saved RolePatch IDs requires a
signed-in session, scoped API token, or authorized OAuth connection.
`ROLEPATCH_SESSION_COOKIE` forwards an existing local session; obtain it through
your own authenticated browser and handle it as a secret. No cookie is needed
for explicit resume text.

The public endpoint has passed direct JSON-RPC generation probes. Codex has also
returned a complete synthetic resume through the stdio bridge with the setup
above and one owner-approved tool call. Actual ChatGPT connection and signed-in production persistence remain separate qualification steps; direct probes and local OAuth tests do not establish those integrations.

## Tools and examples

- `rolepatch_resume_profiles`: list owned cloud profile IDs/names when signed in.
- `rolepatch_resolve_job`: normalize a URL or board-qualified ID without fetching it.
- `rolepatch_tailor_resume`: prepare a reviewed, unsaved draft.

Example tool arguments (synthetic data):

```json
{
  "job_id": "1234567890",
  "source": "linkedin",
  "resume_markdown": "# Alex Morgan\n\n## Experience\n### Example Company\n- Built TypeScript services.\n- Improved API latency by 20%.\n\n## Projects\n### Reader\n- Released a reading queue.\n\n## Education\nBSc Computer Science, Example University, 2022.\n",
  "format": "markdown"
}
```

Other board IDs also need `company`, the board slug from the posting URL.
For other sources, use `job_url`. For blocked, expired, private or unusually
large pages, supply `jd_text` (100–15,000 characters) instead. Resume text is
limited to 20,000 characters. Do not send both `resume_id` and `resume_markdown`,
or both `job_id` and `job_url`.

Review `requires_review`, `persisted`, `markdown` and `changes` in the response.
Tailoring ranks original bullets within their employer/project lists; it does
not rewrite their wording or certify the original claims as true. Polish the
master resume in the editor first. Include actual project/product achievements
and education. A single project point can receive a generated summary;
multiple points/projects enable relevance reordering. Signed-in generation follows the
existing token debit/refund rules.
Missing ownership, ambiguous input, unavailable extraction and AI failures are
returned as tool errors rather than successful drafts.

## Complete the master first

In the dashboard, choose **New Resume** and fill the master form: identity and
contact details, all roles and achievements, products/projects, education and
actual skills. Add another role or project for each entry. One achievement per
line becomes one stored bullet; the form does not rewrite wording or call AI.
Save an unfinished draft if you need more time.

After import or draft creation, the editor explains missing projects, education
or name and offers fields to add them without rebuilding imported content.
Check all your history, mark any **Always include** points, and save. Readiness
checks confirm minimum sections, not that every career fact is present or true.
Education remains required, and the summary is generated for each JD even when
there is no summary in the master. Editing the master affects future drafts;
existing saved drafts keep their snapshots.

## Resume-for-JD request and response

Send the complete master inline for a stateless caller:

```json
{
  "jsonrpc": "2.0",
  "id": "frontend-resume",
  "method": "tools/call",
  "params": {
    "name": "rolepatch_tailor_resume",
    "arguments": {
      "resume_markdown": "<your complete Markdown master>",
      "jd_text": "<100–15,000 characters of the job description>",
      "format": "html"
    }
  }
}
```

The placeholders above describe the contract; use real source text to run it.
For an authenticated owned cloud master, replace `resume_markdown` with
`resume_id`. The caller can remember that ID and send it with each new JD.
With exactly one cloud profile, an authenticated call can omit the resume;
multiple profiles require an explicit choice. Guest browser storage is never
available to an external assistant.

```bash
curl https://rolepatch.com/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'mcp-protocol-version: 2025-06-18' \
  --data-binary @request.json > response.json
```

Read `response.result.structuredContent`. A successful result contains `ok`,
`draft_id`, `requires_review: true`, `persisted: false`, `markdown`, and
`changes`; HTML format also returns `html`. The JSON-RPC response includes a
text copy for MCP clients. Domain errors can still have HTTP 200: inspect `ok`
and `result.isError`, not the HTTP status alone. Generated summaries require
human review; bounded claim validation does not prove semantic entailment.

## Verification

```bash
pnpm test src/__tests__/resume-assistant.test.ts src/__tests__/resume-mcp-route.test.ts src/__tests__/resume-extraction.test.ts
pnpm typecheck
pnpm docs:check
pnpm cf:build
```

Then use an MCP client to initialize, list tools, resolve a reference, submit
a synthetic base resume and description, and inspect the returned draft.
Test a missing guest resume and an unavailable URL as errors. Never use a
real applicant's private resume for a diagnostic probe.

## Plain JSON API and dashboard History

Use `POST https://rolepatch.com/api/resume` with JSON, without a JSON-RPC wrapper:

```json
{
  "resume_id": "<owned saved master ID>",
  "jd_text": "<job description, 100–15,000 characters>",
  "company_name": "Example Co",
  "role_title": "Frontend Engineer",
  "format": "html"
}
```

Saved IDs use your existing signed-in RolePatch session; they are not credentials.
For a stateless guest, replace `resume_id` with `resume_markdown`. With exactly
one owned cloud master, an authenticated caller can omit the resume field.
Multiple profiles require a choice. Existing job URL/board-qualified ID fields
also work. Production accepts ordinary session authentication or the scoped bearer connection above. OAuth tokens must match the exact resource audience. A token for /api/mcp cannot be used for /api/resume unless both audiences were authorized.

```bash
curl https://rolepatch.com/api/resume \
  -H 'Content-Type: application/json' \
  --data-binary @request.json > response.json
```

This command is stateless unless the caller separately configures its existing
RolePatch session securely. Never paste a session cookie into chat or examples.
Read the result directly: `ok`, `markdown`, optional `html`, `changes`,
`requires_review`, `persisted`, and `history`. Input/auth/ownership errors have
HTTP 400/401/404; generation/extraction failures have HTTP 502. Private responses
are not cached. Cross-origin browser requests are rejected.

Authenticated plain API calls save a version to History by default. Use
`save_to_history: false` for an unsaved response. MCP stays unsaved by default;
explicitly add `save_to_history: true` to save an authenticated MCP output.
Successful saves return a `history.view_url` that opens the exact stored version.
If storage fails after generation, the resume is still returned with
`persisted: false` and `history.error`; do not discard it or blindly regenerate.

The dashboard History lists existing jobs and every saved tailored version.
Filter all jobs, applied/later stages, or jobs with resumes. Open or download an
older version directly; edits and later generations do not replace its stored
source. UI generations are automatically recorded; unchanged Save does not add
a duplicate. Guest history stays in that browser. Generation does not apply for
a job, and saving another draft preserves later application stages. The record
does not certify which exact version was submitted.

Past stateless unsaved API calls are not backfilled. See
[ADR-0012](../../architecture/decisions/0012-resume-api-history.md).

## Source fallback

When model generation or validation fails, RolePatch can return a
source-preserving text rerank and an extractive summary. It reports
`generation_method: "source_fallback"` and explains the method in `changes`.
Every original point/project, contact/date, pin and education remains present.
A charged AI credit is refunded; shared budget denials remain errors. Text
matching can miss synonyms or implicit requirements, and the summary can be
less fluent. Sparse evidence can still fail rather than inventing claims.
See [ADR-0014](../../architecture/decisions/0014-source-preserving-provider-fallback.md).
