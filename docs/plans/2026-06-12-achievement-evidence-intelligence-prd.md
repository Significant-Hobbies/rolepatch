# Achievement Evidence Intelligence PRD

Date: 2026-06-12

## Problem

Users usually have more proof than fits on the resume: project wins, metrics, technical decisions, customer outcomes, and past accomplishments. The current stash/evidence surfaces store content, but they do not yet help users turn that material into high-signal resume bullets or interview stories on demand.

## Goal

Create an evidence intelligence layer that helps users collect proof once and reuse it across tailoring, interview prep, and cover letters with job-specific relevance.

## Non-Goals

- Do not auto-invent achievements.
- Do not scrape private data from connected accounts in v1.
- Do not replace the existing resume editor.

## Users

- Users with scattered accomplishment notes who struggle to remember proof points.
- Users preparing for interviews who want evidence mapped to likely questions.

## Proposed Experience

### Evidence bank

- Add structured evidence entries with:
  - title
  - category
  - metric/value
  - context
  - outcome
  - tags
  - source link or note
- Let users mark entries as:
  - resume-ready
  - interview-ready
  - cover-letter-ready

### Job-aware suggestions

- When tailoring for a JD, surface evidence entries that match:
  - the role title
  - keywords
  - seniority
  - responsibilities
- Let users inject selected evidence into tailoring prompts explicitly.

### Story generation

- Convert selected evidence into STAR+R story drafts.
- Show why each story was matched:
  - keyword overlap
  - skill overlap
  - metric relevance

### Quality controls

- Flag weak evidence that lacks a metric, outcome, or clear scope.
- Suggest stronger wording without fabricating claims.

## Data Model

Enhance `stash_entries` or keep a dedicated table for:

- `evidence_entries`
- `evidence_links` to jobs or resumes
- `evidence_tags`

Minimum viable fields:

- `id`
- `user_id`
- `category`
- `label`
- `content`
- `metrics_json`
- `tags_json`
- `created_at`
- `updated_at`

## Success Criteria

- Users can capture strong proof points in one place.
- Tailor and interview prep flows can reuse that evidence automatically.
- The system can explain why a given piece of evidence was selected.
- Users can see which items are too weak to trust in a job application.

## Risks

- Over-automation can create generic output if matching is too loose.
- Evidence quality scoring must stay simple enough to trust.
- If the UI is too dense, users will ignore the evidence bank entirely.

