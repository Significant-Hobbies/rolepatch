# Changelog

## Unreleased

### Added

- Manage named career profiles, structured facts and reusable answers through Resume Builder or remote MCP.
- Track applications, follow-ups, status history and exact material revisions in Jobs. A reported submission creates a tracker event.
- Generate a general or targeted resume from saved career data and export a saved revision to PDF. Fixed wording and render-only retries are free. A successful AI rewrite costs one credit.
- Connect assistants through scoped OAuth. Existing resume clients retain their original grant. Apply migrations 0004–0006 before serving the expanded tool catalog.

- `/tools/ats-check` — paste resume markdown, get an ATS-friendliness score and per-finding callouts. Local heuristics; no network call.
- Autosave for CodeMirror resume edits — drafts persist in localStorage and restore on next mount.
- `/privacy`, `/terms` legal pages; `/.well-known/security.txt`.
- `sitemap.xml` (`src/app/sitemap.ts`), `robots.txt` (`src/app/robots.ts`), and agent-indexing surfaces (`llms.txt`, `llms-full.txt`, `/api/ai`, `/index.md`).

### Changed
- Apostrophes in JSX text are now `&apos;` so `react/no-unescaped-entities` doesn't trip CI.

### Fixed
- AI sidecar (JobSpy) failures map to user-readable 502 responses instead of crashing the job search route.
