# Project Status

Last updated: 2026-06-20

## Current Scope

RolePatch is an AI resume and job-application assistant. It helps users tailor resumes, generate cover letters, research companies, score role fit, prepare STAR stories, and run guest or signed-in application workflows.

## Done

- Guest mode works through localStorage, and Google sign-in persists user data through Turso.
- The app deploys to Cloudflare Workers through OpenNext and serves the custom domain `rolepatch.com`.
- Core product surfaces include resume tailoring, cover letters, company research, fit scoring, STAR interview stories, ATS checking, autosave editing, and supporting public/legal/docs pages.
- Live job search runs inside the Worker through a LinkedIn public guest endpoint; the previous Python sidecar path has been removed.
- AI requests use the documented free-ai/OpenAI-compatible gateway path.
- Dodo Payments, Browser Rendering binding, and production deployment expectations are documented.
- Critical and high audit findings around guest data, SSRF, payments, success verification, and AI allowlisting have been fixed.
- **Privacy PRD (Option B):** `get-a-job/` and `research/` untracked, repo set private, pushed `135ba24` to `main`. PRD closed.

## Planned Next

1. Improve scrape and job-search reliability without broadening unsupported providers.
2. Add targeted integration tests for the highest-risk guest, auth, payment, and AI failure paths.
3. Tighten user-facing AI error handling so provider failures are clear without exposing internals.
4. Keep resume, cover-letter, and role-fit flows aligned with current job-search behavior.

## Deferred / Parked

- **Git history purge (Option A):** parked — user chose untrack-only (Option B). Blobs remain in commits before `135ba24`; acceptable while repo stays private. Re-open with `git filter-repo` if needed.
- Broad ATS replacement or recruiter CRM scope is deferred.
- Aggressive scraping and strict rate limits are deferred pending endpoint-specific evidence.
- Additional payment/provider expansion is parked until the current checkout and entitlement paths are repeatedly verified.
