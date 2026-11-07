---
title: ADR-0011 — Portable always-include points
---

# ADR-0011 — Portable always-include points

**Date:** 2026-10-08
**Status:** accepted

## Decision

The existing base-resume editor lets candidates mark supplied experience and
product/project bullets Always include. Education stays selected and required
by [ADR-0010](0010-required-coverage-generated-summary.md). Save selections with
the base resume; every future job draft from that base inherits them. Previously
saved drafts and independent base profiles are snapshots, not retroactively edited.

An inline `<!-- rolepatch:always-include -->` comment stores the policy next to
the exact original bullet block. Existing guest localStorage and owned resume
server actions persist it; no database/schema or dependency changes are needed.
The editor strips policy comments from document previews, and download paths
strip them from plain-text exports. HTML/Word/PDF never display comment metadata.

A deterministic shared assembly guard checks marked blocks and their original
section context. Missing, changed or transferred mandatory points fail rather
than returning a draft. Single-bullet projects, nested evidence and CRLF work.
Current ranking retains every unmarked bullet as well; marking is a preservation
policy, not a filter or rank boost. Page-budget selection remains out of scope.

## Tradeoff

This makes the policy portable with the source and avoids a schema migration.
Editing raw Markdown can remove a marker deliberately. A separate account-wide
bullet identity registry would be needed to synchronize unrelated base profiles;
this implementation does not claim that behavior.

Tracking: [issue #11](https://github.com/Significant-Hobbies/rolepatch/issues/11).
