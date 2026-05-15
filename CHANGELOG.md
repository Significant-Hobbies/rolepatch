# Changelog

## Unreleased

### Added
- `/tools/ats-check` — paste resume markdown, get an ATS-friendliness score and per-finding callouts. Local heuristics; no network call.
- Autosave for CodeMirror resume edits — drafts persist in localStorage and restore on next mount.
- `/about`, `/privacy`, `/terms`, `/api-docs`, `/humans.txt`, `/.well-known/security.txt`.
- `sitemap.xml`, `robots.txt`, PWA manifest.

### Changed
- Apostrophes in JSX text are now `&apos;` so `react/no-unescaped-entities` doesn't trip CI.

### Fixed
- AI sidecar (JobSpy) failures map to user-readable 502 responses instead of crashing the job search route.
