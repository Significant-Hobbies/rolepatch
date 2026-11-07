---
title: ADR-0010 — Required coverage and generated summary
---

# ADR-0010 — Required coverage and generated summary

**Date:** 2026-10-08
**Status:** accepted (deployed 2026-10-08; qualification in [PROJECT_STATUS](../../../PROJECT_STATUS.md))

## Context

The owner requires product/project achievements and education in every tailored
resume, and a fresh summary even if ranking does not change. [ADR-0008](0008-fixed-wording-resume-ranking.md)
fixed every word, including the summary; [ADR-0009](0009-intact-project-ranking.md)
adds intact project ordering. This decision supersedes only the fixed-summary
portion of ADR-0008. Achievement wording, identity and education stay fixed.

## Decision

Require at least one supplied product/project achievement and nonempty
education in level-two Markdown sections before billing or provider calls.
Recognize Products alongside Projects; a single achievement is valid even
when there are no rankable permutations. Never invent missing profile facts.
Return a clear input error requesting the missing information.

Generate only a concise summary in the same structured request as ranking.
Give the model source evidence IDs and context. Require a plain-text paragraph
and valid, unique evidence references. Validate length and reject structural
or contact injection, unknown references, unsupported numbers and unsupported
experience-duration phrases. Reject known unsupported collaboration, team
leadership, ledger/accounting and certification claims against cited evidence. JD requirements guide emphasis, not source facts.
References and numeric checks are bounded validation, not semantic proof.

Assemble exact original bullet/project blocks, then replace only the existing
Summary/Profile body or insert a Summary before the first resume section.
Require a summary even on unchanged orders; missing or invalid generation
fails/refunds rather than returning a stale-summary success. Preserve CRLF and
all non-summary content. Duplicate summary sections are an explicit input error.

Assert education content and every product/project point survive assembly.
Only separator whitespace at a section boundary may differ when saved material
is appended. No automatic project/point trimming or page-budget selection.

## Consequences

- Every successful draft includes the required coverage and a generated summary.
- Incomplete base resumes need source information before tailoring; this adds
  an intentional input requirement for the app and shared MCP action.
- Summary generation reintroduces bounded semantic risk. Provider compliance
  and source-grounded meaning require separate actual-output review; valid IDs
  alone do not verify claims or attribution.
- One signed-in token covers the combined request. Invalid generation refunds
  once; guest results remain stateless and unsaved.
- No UI redesign, new dependency, database/schema or production config changes.
  Relevance and hosted qualification remain tracked in
  [issue #11](https://github.com/Significant-Hobbies/rolepatch/issues/11).

## Alternatives considered

- Keep the old summary: does not meet the explicit per-job generation requirement.
- Generate the whole resume: previously introduced unsupported claims/contact
  corruption and defeats fixed approved achievement wording.
- Invent placeholders for missing education/projects: would create false facts
  and conceal incomplete profile data.

Implementation: [policy](../../../src/lib/resume-tailoring-policy.ts) and
[shared tailoring action](../../../src/lib/actions/tailor-action.ts).
