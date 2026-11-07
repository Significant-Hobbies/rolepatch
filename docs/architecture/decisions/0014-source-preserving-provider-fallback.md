---
title: Source-preserving resume fallback
---

# ADR-0014: Source-preserving provider fallback

Date: 2026-10-08
Status: Accepted; deployed after local and public qualification

## Context

The model path sometimes fails upstream or produces a ranking/summary that
fails factual checks. The owner selected a master-first product: write all
points well once, then rank them for a JD. Availability must not depend entirely
on free-form text generation, and an outage must not invite invented claims.

## Decision

Keep the existing model path and lossless source assembly. If model preparation,
generation or output validation fails, use deterministic BM25 text relevance
to rank original bullets within their existing groups and whole projects within
their Projects section. Stable ties and zero overlap retain master order. Keep
every point, project, pin, date, contact and education section.

Compose a short extractive summary from complete master facts, prioritized by
the JD. Do not truncate facts, paraphrase achievements or write claims from the
JD. Existing summary validation and required-coverage checks still apply. If
source facts cannot form a valid summary, return a failure instead of invention.

Return `generation_method: source_fallback` through the JSON/MCP API and a
plain-language explanation in the review changes. Refund any signed-in AI
debit when fallback is used. Keep the failed-provider metadata bounded; never
log resume/provider payloads. Do not retry providers or override the gateway.

Shared AI budget denials remain failures. Authentication, insufficient credits,
input preparation and History/storage failures are outside the fallback boundary.

## Consequences

- Users can receive a source-grounded draft during an upstream failure, with
  truthful disclosure of its method.
- Text relevance is weaker than semantic model ranking for synonyms, implicit
  requirements and company boilerplate. This is an outage fallback, not a
  benchmark claim that BM25 is the best reranker.
- The extractive summary can be less fluent than a validated model summary.
  Sparse or overly long source facts can still fail safe synthesis.
- Successful fallback qualification does not establish that the shared
  provider's original root cause was repaired.

Tracking: [issue #11](https://github.com/Significant-Hobbies/rolepatch/issues/11).
