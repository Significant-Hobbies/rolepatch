---
title: ADR-0008 — Fixed-wording resume ranking
---

# ADR-0008 — Fixed-wording resume ranking

**Date:** 2026-10-07
**Status:** accepted (deployed 2026-10-08; qualification in [PROJECT_STATUS](../../../PROJECT_STATUS.md))

## Context

Real managed-runtime tailoring tests changed a contact URL and introduced
unsupported employer-specific claims despite a factual-preservation prompt.
The owner chose to write strong points once, then rerank them for each job.
Whole-resume generation gives a model unnecessary authority over approved
wording, identity, dates and attribution.

## Decision

The saved base resume is the canonical wording, edited and reviewed using the
existing editor. Per-job tailoring asks the model only for ordered bullet IDs.
Code validates complete permutations and moves original Markdown bullet blocks
within their existing employer/project lists. No model-authored resume text
is accepted. Top-level unordered experience/project/achievement lists can be
ranked; nested content moves with its parent. Contact, summary, skills,
education, headings, dates and chronology remain intact. Unsupported Markdown
is preserved; a source with no safely rankable lists receives an explicit error.

Selected saved material keeps a separate section instead of being assigned
to an employer by the model. Existing signed-in implicit saved material follows
the same boundary. It remains user-provided, not externally verified.

Whole-project ordering is extended by [ADR-0009](0009-intact-project-ranking.md);
employment chronology remains fixed.

Summary-only generation and minimum coverage are extended by
[ADR-0010](0010-required-coverage-generated-summary.md), superseding the fixed-summary
portion of this decision. Achievement wording and identity remain fixed.

## Consequences

- Ranking cannot create new claims or corrupt fixed resume content. It does
  not establish whether the original claims are true.
- Every original bullet is retained in this first implementation. Ranking
  improves reading order; it does not shorten the document or guarantee
  better relevance. Unchanged orders have no claimed movement explanations.
- Missing, duplicate, foreign or cross-group IDs fail instead of returning
  a partial draft. Existing token refund and guest isolation rules apply.
- Oversized resume/saved inputs fail explicitly rather than being truncated.
- The existing editor supports polishing the master once. A dedicated
  polishing/approval flow, per-role bullet selection and page budgets are
  future work, not delivered capabilities.

Implementation: [ranking module](../../../src/lib/resume-bullet-ranking.ts)
and [shared tailoring action](../../../src/lib/actions/tailor-action.ts).
Qualification and remaining work: [issue #11](https://github.com/Significant-Hobbies/rolepatch/issues/11).

## Alternatives considered

- Stronger whole-document prompts: failed factual/contact preservation in
  actual tests; prompt compliance is insufficient for fixed identity.
- Keyword sorting alone: useful as a baseline but misses responsibility,
  impact and relevance when wording differs.
- Per-job rewriting with post-hoc claim checking: adds a second uncertain
  generative decision when fixed wording removes that decision entirely.
