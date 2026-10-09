---
title: ADR-0009 — Intact project ranking
---

# ADR-0009 — Intact project ranking

**Date:** 2026-10-07
**Status:** accepted (deployed 2026-10-08; qualification in [PROJECT_STATUS](../../../PROJECT_STATUS.md))

## Context

[ADR-0008](0008-fixed-wording-resume-ranking.md) preserves approved resume
wording by accepting only scoped bullet-ID permutations. The owner additionally
requested that projects participate in reranking. Reordering bullets alone
cannot surface a more relevant project, and excludes one-bullet project lists.

## Decision

Identify level-three project headings inside level-two Projects sections using
the existing Markdown lexer and original byte offsets. Assign IDs to complete
project blocks: heading, links, dates, technology lines, prose and all nested
content. Accept a complete project-ID permutation for each Projects section,
separately from within-role/project bullet permutations.

Assemble bullets first, then re-extract project offsets and move intact blocks.
Validate membership, uniqueness and completeness before returning a draft.
Projects cannot move across sections or into employer history. Employment
chronology and the rest of the resume remain fixed. Preserve exact separator
bytes at each destination, including CRLF and EOF without a newline.

No project is dropped, rewritten or shortened. Unsupported structures such as
bold project titles without Markdown headings remain unchanged. Sections with
one project need no permutation; multiple single-bullet projects can rank.
The shared app/MCP tailoring action uses this same assembly boundary.

## Consequences

- Project prominence can change without separating claims from their identity.
- Invalid or omitted project permutations fail with the existing signed-in
  refund behavior; guest requests remain stateless.
- Ranking quality remains separate from factual preservation. The local
  benchmark includes complete project documents, but its exploratory project
  labels are derived from earlier bullet judgments, not hiring outcomes.
- The current application still uses managed ID-only model ranking. Locally
  evaluated TF-IDF, BM25 and neural baselines are not application defaults.
- No UI, dependencies, persistence schema or production configuration changes.
  Hosted/provider relevance remains unqualified in
  [issue #11](https://github.com/Significant-Hobbies/rolepatch/issues/11).

Implementation: [ranking module](../../../src/lib/resume-bullet-ranking.ts)
and [tailoring action](../../../src/lib/actions/tailor-action.ts).
