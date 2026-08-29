# RolePatch

RolePatch is a web app for preparing a serious application to a specific job. It reads the job description, matches its requirements against evidence already supplied by the candidate, and proposes a resume patch for review.

## Evidence rule

The base resume, project stash, and achievement bank are the permitted sources for employer-facing claims. RolePatch may reorder, tighten, or reframe that evidence. It must not add an unsupported skill, tool, employer, metric, scope, role, or accomplishment. An unsupported requirement remains a visible gap.

## Workflow

1. Bring one job description and a base resume.
2. Compare the role's requirements with supplied evidence.
3. Inspect the proposed wording and its word-level diff.
4. Accept, edit, or omit each meaningful change.
5. Use the accepted evidence for a cover letter, fit analysis, interview stories, or a reviewed application packet.

## Application assistance

RolePatch can queue a job, prepare a packet, run reviewed browser checks, fill supported ATS fields after a user action, and save receipts. CAPTCHA, missing required answers, outstanding file selection, and ambiguous submit states stop the flow. It does not perform unattended bulk submission or bypass human verification.

## Access and storage

- Guest resumes, jobs, tailored drafts, evidence, and application metadata can stay in the current browser.
- Google sign-in adds user-scoped D1 persistence and three starting tokens.
- Signed-in tailoring, cover letters, fit scoring, interview prep, outreach drafts, and bulk fit scoring debit tokens.
- The reviewed queue, packet, fill, and receipt workflow does not debit tokens.
- Token packs are implemented at 10 for $5, 30 for $12, and 100 for $30, with no subscription.
- Public ATS, keyword, bullet, diff, snippet, and word-count tools work without sign-up.

## Current state

RolePatch is live and maintained. Its maker is not currently job hunting, so owner-led validation against new real applications is paused. The product and token checkout code are implemented; this brief does not claim an independently completed live purchase or broad outcome study.

## Public discovery

- https://rolepatch.com/llms.txt
- https://rolepatch.com/llms-full.txt
- https://rolepatch.com/api/ai
- https://rolepatch.com/openapi.json
- https://rolepatch.com/sitemap.xml

User-specific dashboard and API routes are not public agent surfaces.
