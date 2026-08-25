---
title: Working on docs
---

# Working on docs

The committed Markdown under `docs/` is the **source of truth** for
product knowledge, architecture, decisions, workflows, operations, and
durable learnings.

## Rules

1. **One fact, one home.** If a fact lives in code or config, link to
   it; do not restate it. If a fact lives in `docs/`, do not duplicate
   it in `README.md` or `PROJECT_STATUS.md`.
2. **Markdown is the source of truth.** Code/config stays authoritative
   for implementation details and schedules.
3. **Don't duplicate code-discoverable facts.** Link to the file or
   command.
4. **Mark unresolved questions explicitly** in
   [`STATUS.md`](../../STATUS.md) — do not invent information.
5. **New non-obvious decision → new ADR** under
   [`architecture/decisions/`](../architecture/decisions/) (use the
   [ADR template](../architecture/decisions/_template.md)). Never
   renumber; supersede with a new ADR that points back.
6. **Durable learnings** → `knowledge/learnings/`. **Abandoned
   approaches** → `knowledge/failed-approaches/` with the reason.
7. **Prefer `docs/archive/<name>.md` over deletion** so git rename
   history survives. Use `git mv` when reorganizing.
8. **Keep pages short** (150–300 lines). Split rather than grow.
9. **Every docs Markdown file needs a `title` in frontmatter.** The validator
   enforces this.
10. **Archive pages** under `docs/archive/**` are preserved for git history.

## Validate

```bash
pnpm docs:check    # link check + frontmatter + structure validation
```

CI runs `pnpm docs:check` on every push / PR via
[the docs workflow](../../.github/workflows/docs.yml).

The validator (`scripts/check-docs.mjs`) enforces:

1. Every docs Markdown file has a `title` in frontmatter. Archive files are exempt.
2. Every relative Markdown link resolves to a file that exists.
3. `docs/index.md` exists.
4. No empty `docs/` subdirectories.

## When to update what

| Change | Update |
| --- | --- |
| New route added/removed | [`product/surfaces.md`](../product/surfaces.md) |
| New D1 table | [`architecture/data-model.md`](../architecture/data-model.md) + `src/lib/db-schema.sql` |
| Non-obvious decision | New ADR under [`architecture/decisions/`](../architecture/decisions/) |
| New cron / scheduled job | [`operations/jobs/`](../operations/jobs/) |
| New runbook | [`operations/runbooks/`](../operations/runbooks/) |
| Durable learning | [`knowledge/learnings/`](../knowledge/learnings/) |
| Abandoned approach | [`knowledge/failed-approaches.md`](../knowledge/failed-approaches.md) |
| PR-sized work completed | [`PROJECT_STATUS.md`](../../PROJECT_STATUS.md) (durable) + [`STATUS.md`](../../STATUS.md) (short view) |
| Superseded doc | Move to `docs/archive/` with a `stale-` prefix and a one-line supersession note |

Do **not** update docs for minor edits or bug fixes that don't change
documented architecture or conventions.
