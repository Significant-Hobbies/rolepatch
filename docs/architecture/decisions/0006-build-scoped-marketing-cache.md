---
title: ADR-0006 — Build-scoped marketing HTML cache
---

# ADR-0006 — Build-scoped marketing HTML cache

**Date:** 2026-10-02
**Status:** accepted

## Context

The Worker cached marketing documents by public URL across deployments. On
2 October, canonical pricing and tools pages referenced removed Next.js chunks,
while fresh query URLs rendered healthy current-build assets. A cached document
must not outlive the asset build it references.

## Decision

Namespace document cache keys with the existing assets binding's public
`BUILD_ID`. Unavailable or invalid metadata bypasses caching. Keep one-day edge
storage within each build, but require browser and intermediary revalidation.
Auth/session, RSC and router-prefetch requests bypass document caching; responses
that set cookies are not stored. The Astro homepage policy is unchanged.

## Consequences

Each cache lookup reads build metadata and a new build starts cold. Old cache
entries expire without needing a zone purge. Missing metadata sacrifices cache
hits rather than mixing document and script builds. Live release checks must
verify every referenced script and both document HIT and request bypass behavior.

## Alternatives considered

- URL-only caching with a shorter TTL still permits cross-build broken assets.
- Purging on release couples correctness to an additional provider operation.
- Disabling all marketing caching removes useful same-build edge reuse.
- A new deployment binding adds configuration drift when build metadata exists.
