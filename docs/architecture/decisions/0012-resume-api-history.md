---
title: Plain resume API and immutable job history
---

# ADR-0012: Plain resume API and immutable job history

Status: Accepted
Date: 2026-10-08

## Context

The owner wants to send a JD to an API, receive its tailored resume, and later
find jobs and generated versions in the dashboard. Existing job applications
and tailored resumes already represent owned jobs and saved output versions.
The MCP contract intentionally returns unsaved drafts by default.

## Decision

Add `POST /api/resume` as a plain JSON facade over the existing resume assistant
action. It accepts the same reference/master/JD fields without JSON-RPC and
returns complete Markdown, optional HTML, changes and explicit persistence state.
No separate generation engine, provider, dependency or schema is introduced.

Authenticated plain API calls save output to History by default. Saved IDs
remain owner scoped. If exactly one cloud master exists, the caller can provide
only the JD; otherwise choose `resume_id` or supply explicit source. Explicit
inline master source reuses an identical owned master or stores an API master
alongside its new target job. Provided company/role labels are optional; missing
metadata is not invented from the JD.

Guest calls must send their master and remain stateless. Explicit cloud-history
saving requires authentication. `save_to_history: false` opts out. Existing MCP
calls stay unsaved by default and support an explicit `save_to_history: true`.
Authentication uses the existing session; this does not implement API keys or
account-linked OAuth for external clients.

History uses immutable `tailored_resumes` rows and the existing job target. Cloud
master/job/output writes use one D1 batch, with owner checks both before writing
and in insert selections. Reusing a job requires its description to match;
a different JD creates a separate target record. Generation never marks a job
applied and another version never regresses applied/interview/offer/rejected.

Successful UI generations are automatically recorded in guest browser storage
or owned cloud history. Saving changed wording creates another version; an
unchanged Save does not duplicate it. The existing dashboard becomes History
with filters and links to exact versions. URL-selected versions remain selected
on reload; each stored source can be exported without rerunning generation.

If generation fails, no successful version is stored. If history storage fails
after generation, return/retain the generated resume and an explicit unsaved
warning. There is no automatic second AI call. Original masters are unchanged.

## Consequences and limits

History labels application status and generated versions separately. A generated
version is not proof of submission or proof that that exact version was sent.
Existing submission receipts remain the evidence for recorded submissions.
The applied/later filter includes user-recorded later stages and submission
receipts; ordinary tailored drafts are excluded.

Existing saved output rows appear in History. Past unsaved stateless MCP calls
cannot be reconstructed from the database and are not retroactively presented
as application activity. Failed AI requests do not appear as successful resumes.
Shared gateway reliability and broad summary/relevance qualification remain
open in [issue #11](https://github.com/Significant-Hobbies/rolepatch/issues/11).
External assistant connection still needs separate authentication/client tests.

Setup and request examples: [MCP/API runbook](../../operations/runbooks/resume-mcp.md).
Tracking: [issue #12](https://github.com/Significant-Hobbies/rolepatch/issues/12).
