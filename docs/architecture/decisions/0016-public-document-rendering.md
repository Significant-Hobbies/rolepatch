---
title: Public document rendering
---

# ADR-0016: Public document rendering

Date: 2026-10-13
Status: Accepted for the source candidate; no production release

## Context

Pricing and the tools catalog have server-rendered text, but their initial
document also carried the complete application stylesheet twice: in the HTML
and in Next's Flight payload. Guest navigation imported the authenticated
dropdown and sidebar primitives even when there was no signed-in account.
These costs compete with the public text rendering path tracked in
[issue #39](https://github.com/Significant-Hobbies/rolepatch/issues/39).

## Decision

Use Next's documented external-stylesheet mode. Keep the complete stylesheets
render-blocking, and retain the existing critical-CSS build step for
prerendered files. Import workspace-only styles from the already lazy workspace
interior. Their scoped rules and the public content remain unchanged.

Load the signed-in menu through `next/dynamic` after a session supplies a user.
Keep the existing guest sign-in path and all authenticated menu actions. A
disabled account placeholder reserves space while the account module loads;
it exposes neither settings nor sign-out until those actions are ready.

Retain Next's native async script scheduling, inline Flight data and Worker
cache/auth boundaries. There are no timers or interaction-based hydration gates.

## Consequences

The public document avoids duplicated inline CSS and guest-only visits avoid
account UI code. External CSS adds a request waterfall, so production-build
Lighthouse comparisons must verify the trade-off. Menu, tool and builder
readiness need interaction assertions, not just screenshots or static HTML.
Responsive geometry and workspace theme portals must remain consistent.

## Alternatives considered

- Global `inlineCss`: Next documents its initial Flight duplication; keeping
  the full stylesheet inline preserves the measured document overhead.
- Deferring every route or removing hydration: rejected because workspace,
  account and mutation flows need the existing Next runtime.
- Native `defer`: did not consistently meet the gate and makes hydration wait
  for stylesheets; keep the framework's original scheduling.
