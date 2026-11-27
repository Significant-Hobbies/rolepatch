---
title: App surfaces
---

# App surfaces

Every user-facing route and API route in the Next.js app. Source of truth
for what exists; do not duplicate route lists elsewhere. Update this page
when a route is added or removed.

## Public / marketing

| Route | Purpose |
| --- | --- |
| `/` | Landing page. Astro static HTML overlaid during `cf:build`; Worker edge-caches the result. See [landing-astro runbook](../operations/runbooks/landing-astro.md). |
| `/pricing` | Token packs + Dodo checkout. Edge-cached. |
| `/proof` | Public TrueHire project showcase; signed-in visitors open Resume Builder sources. |
| `/tools` | Free tools hub. Edge-cached. |
| `/tools/ats-check` | ATS-friendliness score (local heuristics, no network). |
| `/tools/bullet-check` | Resume bullet quality check. |
| `/tools/keywords` | Job keyword extraction. |
| `/tools/diff` | Side-by-side markdown diff. |
| `/tools/snippets` | Reusable resume snippets. |
| `/tools/word-count` | Resume word count. |
| `/blog` | Blog index. Edge-cached. |
| `/blog/[slug]` | Blog post. Edge-cached. |
| `/badge/[slug]` | Public share badge for a tailored resume. |
| `/privacy`, `/terms` | Legal pages. |
| `/sitemap.xml` (`src/app/sitemap.ts`), `/robots.txt` (`src/app/robots.ts`) | Crawler surfaces. |
| `/llms.txt`, `/llms-full.txt`, `/index.md`, `/api/ai` | Agent-indexing surfaces served by `agent-edge.mjs`. |
| `/.well-known/security.txt` | Static trust surface (`public/.well-known/security.txt`). |

## Web workspace

Workspace pages require a valid Google sign-in session. The `/sign-in` page
returns visitors to their requested workspace page after sign-in. Returning
visitors can import previously saved browser work after they sign in.

| Route | Purpose |
| --- | --- |
| `/resume-builder` | Master résumé outline for editing experience, projects, education, and points to include when tailoring. |
| `/resume-builder/evidence` | Achievements, sources, and extra experience. |
| `/resume-builder/profile` | Signed-in career records, application answers, and archived profiles. |
| `/resume-builder/generate` | Signed-in résumé generation for a general profile or specific job. |
| `/dashboard` | Compatibility alias for the Jobs workspace. |
| `/editor/[id]` | Markdown resume editor with live preview (CodeMirror). Autosaves drafts to localStorage. |
| `/tailor/[jobId]` | Job description → AI tailor → document preview, explained changes and editable diff. Signed-in generation: 1 token. |
| `/cover-letter/[jobId]` | Cover letter generation with company research. 1 token. |
| `/interview-prep/[jobId]` | STAR+R story generation. |
| `/evidence` | Compatibility redirect to `/resume-builder/evidence#sources`. |
| `/stash` | Compatibility redirect to `/resume-builder/evidence#extra-experience`. |
| `/jobs` | Job intake, application tracking, and analytics. |
| `/jobs/discover` | LinkedIn search, ATS search tips, and recent roles from the observed feed. |
| `/jobs/queue` | Review-first application preparation, follow-ups, and recruiter replies. |
| `/history` | Past job records and saved tailored résumé versions, with options to reopen or download the exact version. |
| `/settings` | Account-menu settings: AI provider config and apply-agent readiness. |

The primary app navigation contains **Resume Builder**, **Jobs**, and **History**.
Settings lives in the account menu. The credit balance is informational; purchase
links remain at an insufficient-credit/action cost state or explicit billing intent.
Public marketing and tool routes remain available.

## API routes

| Route | Purpose |
| --- | --- |
| `/api/auth/[...all]` | better-auth handler. |
| `/api/mcp` | Stateless resume MCP (POST JSON); explicit guest resume text or owned signed-in IDs. See [resume MCP runbook](../operations/runbooks/resume-mcp.md). |
| `/api/jobs/search` | Native in-Worker LinkedIn job search. |
| `/api/ai/models` | Available AI models. |
| `/api/checkout` | Dodo Payments checkout session creator. |
| `/api/webhook/dodo-payments` | Dodo webhook (HMAC-verified, atomic token credit). |
| `/api/render/[id]` | PDF export via Browser Rendering binding. |
| `/api/extension/tailor` | Chrome extension → tailoring flow. |
| `/api/extension/apply-packet` | Chrome extension → packet lookup for field fill. |
| `/api/extension/save-job` | Chrome extension → save a job to the queue. |
| `/api/extension/fill-receipt` | Chrome extension → record a field-fill receipt. |
| `/api/extension/submission-receipt` | Chrome extension → record a submission receipt. |
| `/api/apply-agent/queue`, `/api/apply-agent/queue/[id]` | Apply-agent queue CRUD. |
| `/api/apply-agent/packets` | Apply-agent packet read. |
| `/api/apply-agent/receipts` | Apply-agent receipt read/record. |
| `/api/apply-agent/browser-check` | Reviewed browser check (no submit). |
| `/api/apply-agent/browser-submit` | Guarded single submit attempt. |
| `/api/proof/truehire-preview` | TrueHire preview guard. |
| `/api/proof/truehire-role-fit` | TrueHire role-fit score. |
| `/api/internal/cron/company-watchlist` | Hourly cron — company watch sync. |
| `/api/internal/cron/weekly-digest` | Weekly cron — saved-search + apply-agent digest. |
| `/api/internal/email/recruiter-reply` | Inbound recruiter reply ingestion (Email Routing). |

## Chrome extension

Manifest V3 extension (`extension/`). Toolbar popup on any job page:
save-to-queue, tailor, fill application fields (reviewed), reviewed
submit, capture submitted receipt. Provider-aware selectors for
Greenhouse, Lever, LinkedIn, Workday, Ashby, Workable, Recruitee,
Personio, SmartRecruiters. See
[the extension README](https://github.com/sarthak-fleet/rolepatch/blob/main/extension/README.md)
and the [apply-agent CLI runbook](../operations/runbooks/apply-agent-cli.md).

## Worker entry

`worker.mjs` wraps the OpenNext-generated worker with edge caching for
cacheable document paths (`/`, `/pricing`, `/proof`, `/evidence`,
`/tools`, `/blog`, `/privacy`, `/terms`) and dispatches
`/api/internal/cron/*` scheduled tasks. See
[architecture overview](../architecture/overview.md).
