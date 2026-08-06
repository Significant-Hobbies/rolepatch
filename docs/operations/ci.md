---
title: CI
---

# CI

GitHub Actions workflows live in `.github/workflows/`. Source of truth
for what runs — do not duplicate workflow YAML here.

## Workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| [`ci.yml`](../../.github/workflows/ci.yml) | push, PR | `pnpm lint` + `pnpm test` + `pnpm cf:build` |
| [`deploy.yml`](../../.github/workflows/deploy.yml) | PR, `workflow_dispatch` | `cf:build` preview gate on PR; manual SHA-tagged production deploy + `pnpm smoke:prod` |
| [`docs.yml`](../../.github/workflows/docs.yml) | push, PR | `pnpm docs:check` (link + frontmatter + structure) |

## CI gates (`ci.yml`)

Runs on every push and PR. Steps:

1. `pnpm install --frozen-lockfile --ignore-scripts`
2. `pnpm lint` (Biome)
3. `pnpm test` (Vitest)
4. `pnpm cf:build` (full production build pipeline — see
   [development workflow](../development/workflow.md))

A failed `cf:build` blocks merge. The route verifier inside `cf:build`
catches missing parity-critical routes before deploy.

## Deploy workflow (`deploy.yml`)

- **Production:** `workflow_dispatch` only. Runs `cf:build` →
  `wrangler deploy --tag ${{ github.sha }}` → `pnpm smoke:prod`.
- **Preview:** on PR. Runs `cf:build` only (no deploy, no smoke).

See [deploy](deploy.md) for the full publish path.

## Docs (`docs.yml`)

Runs `pnpm docs:check` (link check + frontmatter + structure
validation). See [working on docs](../development/docs.md).
