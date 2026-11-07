# resume-tailor — PROJECT STATUS

Last updated: 2026-10-09

## Readable master inputs and dark mode — 9 October (current release)

Resume details and achievements are readable content with focused Edit controls.
Done applies a local edit; Cancel preserves the original and Save persists the
master. Temporarily empty points cannot disappear while typing. New Resume asks
for one of five sections at a time, with individual achievements, Back/Next and
Save draft. Original ranges preserve links, CRLF, pins and untouched source bytes.

The top-right appearance control offers Light, Dark and System. Preferences
persist in this browser; System follows device changes. Sidebar, cards, native
inputs, Radix portals and editor controls use scoped official Zinc dark tokens.
Resume paper, landing bytes and footer stay unchanged. No new dependencies.

Worker `c9ee0967-f593-4fc9-974a-c7712d0a0727` serves 100% traffic, tagged
`rolepatch-inputs-dark-20261009`. 682 unit tests, 34 built desktop/mobile E2E,
full production and extension builds, typecheck/lint, 18 route checks, seven
local smoke checks and seven public production checks pass. Light/dark forms
were reviewed at phone, tablet and desktop widths; real browser tests qualify
persistence, System updates, portal colors and exact footer preservation.

Fresh signed-in Chrome confirms the complete owner master with 34 editable points,
two pins, existing jobs/history and the released dark theme. This review made no
cloud resume edits, spent no credits and submitted no applications. Own verified
source was copied back after baseline conflict checks; existing staged work is
preserved. The owner no-commit/no-push boundary remains in force. This is a
verified uncommitted artifact based on `d22cd94`, without a main/CI parity claim.
No migrations, secrets or production configuration changes. External OAuth-client
and fresh authenticated API-write qualification remain separate in
[#12](https://github.com/Significant-Hobbies/rolepatch/issues/12).

## Official shadcn Inset workspace — 9 October (previous release)

Owner-selected option 1 (“One is fine.”) is live. Resume Builder and Jobs are
still the only primary destinations. The app uses official MIT shadcn New York
components, Zinc tokens and Geist, with accessible Sidebar, Sheet, Tabs, Table,
Checkbox and form controls. Master editing, Always include, education, projects,
JD intake, saved versions and application stages retain their existing behavior.
The Astro landing bytes and footer markup are unchanged.

Worker `7d3080ea-4917-42c0-b24b-54d881780f1f` serves 100% traffic with tag
`rolepatch-shadcn-20261009`. This is a verified uncommitted artifact based on
`d22cd94`; no main/CI parity claim. The isolated integration source was copied
back after checking every changed file against its preserved baseline. Existing
staged work remains intact. No commit/push, migration, secret or production
configuration changes were made in this UI release.

677 unit tests, 32 built desktop/mobile E2E, full Worker/Astro and extension
builds, typecheck/lint, 18 route checks, seven local smoke checks, docs, Wrangler
dry-run and the design completion gate pass. All seven public production smoke
checks pass. The release verifier CLI was corrected to execute in paths with
spaces; a failing-command regression proves it cannot silently skip the gates.

Fresh regular-Chrome landing-to-app navigation uses the signed-in owner session.
The owned master shows 34 points, two Always include pins and saved state. Jobs
shows two existing jobs with one and three saved resumes; the existing Glean
version exposes its exact-version link and Markdown export. These checks were
read-only: no production resume edits, credit spending or application submission.
Fresh authenticated API writes and an external ChatGPT OAuth exchange remain
unqualified in [#12](https://github.com/Significant-Hobbies/rolepatch/issues/12).
This supersedes earlier browser-access/master-transfer qualification limits.

Design: `.fleet/design-review-shadcn-official-20261008.json`;
tracking: [#15](https://github.com/Significant-Hobbies/rolepatch/issues/15).
Dated sections below are historical release checkpoints, not the current Worker.

## Assistant OAuth — 8 October (deployed)

Standard assistant OAuth is deployed at `https://rolepatch.com/api/mcp`, with a
separate REST audience at `/api/resume`. The owner-approved Better Auth/MCP
1.7.7 provider supplies registration, PKCE S256, signed consent, refresh and
revocation. Existing Settings contains explicit allow/cancel consent naming the
client callback host, owned master access, credits and History. Access JWTs last
five minutes and renewal is bounded by seven days plus the active session.
Disconnect invalidates the linked session immediately. Existing scoped bearer,
inline guest requests and opt-in MCP History remain compatible.

Worker `54bf7f32-2254-4540-a1e5-bf9535e384e0` serves 100% traffic; tag
`d22cd94-local-2303f21c791f` identifies the verified uncommitted artifact based on
`d22cd94`. The eight approved additive provider tables were applied and all
fields read back against the published schema. No existing resume rows were
modified by the migration. Remote variables, landing bytes and footer are
preserved; no commit/push, secrets or production configuration changes, and no
main/CI parity claim.

676 unit tests, 32 built desktop/mobile E2E, full Worker/Astro and extension
builds, typecheck/lint, 18 route checks, local smoke, docs and the fresh preserve
receipt pass. Actual isolated Worker/D1/provider checks pass signed consent
allow/deny, owned masters, JD-only MCP and REST generation, exact Jobs History,
refresh and disconnect/old-token 401. Negative and concurrent code-replay tests
use the real provider and SQLite. These synthetic local sessions do not qualify
actual Google login or an external ChatGPT OAuth client.

Fresh live checks use ordinary public DNS: seven unchanged smoke assertions,
public resource/issuer metadata and public-only JWKS, disconnected-tool challenge,
invalid bearer rejection, and the complete landing/CTA/master onboarding/JD path
at 390/768/1440 pass. Three synthetic live resume outputs preserve every point,
project, identity and education and include summaries. Frontend uses the disclosed
source fallback; backend and agent cases use AI. No applications are submitted.
The ordinary Chrome Builder exposes the prepared owner master and its pins from
browser-local data. Transfer of that master into account storage and signed-in
generation/persistence qualification are still being completed.

The dependency audit is not clean: 21 advisories remain. Runtime applicability
was checked for the critical/high findings; unused Express, Astro cache tooling,
source-map tooling and native Sharp package markers are absent from the Worker
handler, and Next image optimization is disabled with no remote patterns. Patch
work is [#14](https://github.com/Significant-Hobbies/rolepatch/issues/14).
Shared provider root cause remains [#11](https://github.com/Significant-Hobbies/rolepatch/issues/11).
External OAuth-client and signed-in production qualification remain
[#12](https://github.com/Significant-Hobbies/rolepatch/issues/12).
Setup: [OAuth runbook](docs/operations/runbooks/resume-oauth.md);
[ADR-0015](docs/architecture/decisions/0015-assistant-resume-oauth.md).

## Resume availability and scoped API access — 8 October (deployed)

RolePatch now returns a source-preserving fallback if model generation or factual
validation fails. It ranks intact points and complete projects by text relevance
and composes a summary from complete master achievements, excluding stack/date
metadata from achievement selection. Every source point, project, pin, date,
contact and education remains intact. The API discloses source_fallback and a
failed AI debit is refunded. Shared-budget/auth/input/credit/storage failures
still fail explicitly; upstream provider reliability is not certified.

Account Settings now has an optional **Connect your resume API** disclosure.
An explicitly issued bearer capability connects API/stdio clients to owned cloud
masters and History; with one master, JD-only calls can omit the master ID. It
is bound to a live Better Auth session, expires within 24 hours and is revoked
by ending that session. Disconnect signs out only the linked session. Tokens
are masked and never stored in browser storage. MCP saves remain opt-in.
ChatGPT OAuth is separate and unimplemented. The two primary workspaces,
approved fonts/colors and frozen landing/footer remain unchanged.

Fresh qualification: 670 unit tests, 32 built desktop/mobile E2E, full
Cloudflare/Astro and extension builds, typecheck/lint, 17 route checks, seven
local smoke checks, docs and final preserve design receipt pass. Real local
Cloudflare Worker, isolated D1 and Better Auth verify issuance, owner isolation,
JD-only/default API History, exact stored output, actual stdio bridge, and
disconnect/old-token 401. Local SQL tests also qualify forgery/expiry/scope,
concurrent guest isolation and credit/refund. This is synthetic local account
evidence, not Google OAuth or signed-in production qualification.

Worker `42423168-40da-44d3-82d7-59de945e18e0` serves 100% traffic; tag
`d22cd94-local-92bd037e7916` identifies the verified uncommitted artifact. Seven
public smoke assertions using native HTTP, four live guest Builder/History E2E and three live
synthetic JD resume calls pass. All preserve complete points, education and
identity; no cloud data or applications were written by live probes. Original
owner master produced three re-inspected local outage-path samples for frontend,
backend and agents roles; those are not provider-quality benchmarks.

No commit/push, migration, new production dependency, secret or production-config
change. Remote vars preserved; no main/CI parity claim. Landing hash is unchanged. Default Node public checks had connection/body timeouts;
actual Chromium UI and native curl HTTP/1.1 qualification use unchanged assertions
through a freshly verified public DNS IPv6 address, selected only in test clients.
The failed transport checkpoints remain recorded, without a global availability claim.
Fresh post-deploy landing browser navigation still timed out before entry controls;
that handoff is unqualified. The pre-release public-to-candidate handoff passed.
Shared AI reliability remains [#11](https://github.com/Significant-Hobbies/rolepatch/issues/11).
Signed-in production History/API persistence remains unqualified because normal
browser control is unavailable; accessible isolated sessions are guests. The
owner's Google authorization remains granted. Track this and external assistant
qualification in [#12](https://github.com/Significant-Hobbies/rolepatch/issues/12).
Decisions: [ADR-0013](docs/architecture/decisions/0013-session-bound-resume-api-access.md),
[ADR-0014](docs/architecture/decisions/0014-source-preserving-provider-fallback.md).

## Two-workspace Outline — 8 October (deployed)

The owner-selected Outline is released: **Resume Builder** holds the complete
master, projects, education, editable points/pins, sources and extra experience;
**Jobs** holds intake, status, application preparation and exact-resume History.
Settings is in the account menu; the credit badge is informational and purchase
links remain contextual. Existing links, approved fonts/colors and the frozen
Astro landing/footer are preserved. See [app surfaces](docs/product/surfaces.md)
and [issue #13](https://github.com/Significant-Hobbies/rolepatch/issues/13).

Fresh qualification passes 655 unit tests, 32 built-server desktop/mobile tests,
full Cloudflare/Astro and extension builds, typecheck/lint, 17 route checks,
seven local and seven public smoke checks, docs and the final design receipt.
Four additional live guest Builder/History tests pass. The actual public CTA,
complete onboarding, second-master selection, pasted JD handoff and responsive
navigation pass live; no application was submitted and no cloud data was saved.
The duplicate discovery form/tips found during verification was removed.

Worker `7a853237-54c9-4b6e-8dfc-13f85600e6d9` serves 100% traffic;
tag `d22cd94-local-7c7e29250d77` identifies the verified uncommitted artifact.
Landing SHA256 remains identical to the preceding release. No commit/push,
migration, new production dependency, secret or production-config change;
no main/CI parity claim. Shared AI reliability remains [#11](https://github.com/Significant-Hobbies/rolepatch/issues/11);
authenticated production History/API persistence and account-linked assistant
integration remain unqualified in [#12](https://github.com/Significant-Hobbies/rolepatch/issues/12).

## Direct resume API and dashboard History — 8 October (deployed; generation limited)

Plain JSON `POST /api/resume` returns a resume for a JD through the existing
assistant action. Authenticated calls use owned cloud masters and save immutable
versions to History by default; guests supply source and remain stateless.
Explicit save_to_history opts authenticated MCP callers in while preserving
existing unsaved MCP defaults. Authentication remains the existing session;
API keys and external account-linked OAuth are not implemented.

The existing dashboard Applications section now exposes History filters and all
saved versions. Exact-version links reload the stored source and allow export.
UI generation records a version automatically; unchanged Save avoids duplicates,
and storage failure retains generated output with a retry-save warning. D1 batch
writes validate both job/master ownership and preserve later application status.
Original masters are untouched. Existing saved versions appear; past stateless
unsaved requests are not invented as history or application activity.

The approved design and footer are preserved. Real SQL, action/API and guest
browser checks cover owner isolation, rollback, status preservation, failed-save
recovery, old-version reload and filters. The original History release verification passed: 643 unit
tests, 30 desktop/mobile E2E, full Cloudflare/Astro build, typecheck/lint, extension
build, route parity, six local smoke checks, docs and the fresh design receipt.

The original History Worker `f467fa78-60c9-4e44-80bb-ea655f11f686` served 100% traffic; tag
`d22cd94-local-f87d90ef1107` identifies the verified uncommitted snapshot. No
commit/push, migration, secret or production-config change. Remote vars preserved;
no main/CI parity claim. Landing hash remains identical. Six public smoke checks
pass on recheck after an initial timeout, and two live desktop/mobile History
tests pass using synthetic guest jobs, exact-version reload and Markdown export.

Live REST input/auth guards pass. All three fresh public JD generation probes
(frontend, fullstack, agents) return truthful 502 generation_failed responses from
the shared AI service; local Worker generation also failed upstream. A separate
remote-binding diagnostic reports provider_fatal with two attempts, including a
malformed mistral/codestral-latest completion. Failed calls
are retained in `output/history-api-20261008`, not represented as resumes. Prior
selected successful MCP samples remain historical evidence, not current REST
reliability. Authenticated production API persistence and external assistant
connection remain unqualified; real SQLite ownership/rollback and action-level
persistence tests pass. No account tokens/cookies were used for these live tests.
Shared gateway reliability remains open in issue #11. Decision and tracking:
[ADR-0012](docs/architecture/decisions/0012-resume-api-history.md),
[issue #12](https://github.com/Significant-Hobbies/rolepatch/issues/12).

Owner closeout rechecked the deployed artifact on 8 October at 06:40 UTC:
208/208 release-manifest files still match. Three fresh synthetic REST calls
returned two 502 failures and one successful grounded draft retaining all
12 points, three projects, two pinned points, education and contact identity.
A read-only production D1 check found no master containing the synthetic marker.
This selected success does not establish reliable contrasting-JD generation.
The initial Codex generation was blocked before dispatch by its tool-approval
policy. After the owner approved one synthetic call, an actual Codex client
returned a complete frontend resume through MCP. Two additional current REST
calls for backend and unsupported-role JDs also succeeded. All three preserve
12 exact points, three projects, two pins, education and contact identity.
Backend requirements move supported API evidence up; the unsupported role keeps
the original order and adds no blockchain claims. Earlier failures remain
recorded; three successes do not establish a service reliability guarantee.
Codex guest interoperability is qualified, while ChatGPT/account-linked OAuth
and authenticated production API persistence remain unqualified. Google rejected
the automated sign-in browser as insecure; no authenticated write was dispatched.

Follow-up at 11:04–11:06 UTC: all three hosted synthetic REST requests failed
with `generation_failed`. The same frontend contract succeeded through the
current remote Free AI binding and passed exact-wording/coverage assertions.
This separates a working gateway-binding sample from the failing hosted path;
it does not establish a repaired service or the precise upstream failure cause.
The local real-SQL History suite now passes nine tests, explicitly preserving
applied, interview, offer and rejected status across multiple immutable versions
without changing the master. These are local tests, not signed-in production
persistence. Browser control still exposes no regular Chrome connection after
refresh. Issues #11 and #12 remain open; no new runtime deployment was made.

At 12:09 UTC, a request-filtered live trace and stateless synthetic REST call
connected successfully and returned HTTP 200. Manual comparison preserves all
12 original points, three projects, two pins, education and contact/date identity.
The generated summary overstates tested error states as implemented error recovery.
An explicit cited-recovery guard, matching prompt constraint and regression now
reject this overclaim. The two focused policy/action suites pass 29 tests. Full
release verification passes 647 unit tests, 30 desktop/mobile E2E, typecheck/lint,
extension build, Cloudflare/Astro build, route parity, local smoke and docs.

The correction is deployed as Worker `9460f64f-91bb-451e-89c1-28b9fcfda770` at
100% traffic, superseding the original History release. Tag
`d22cd94-local-87e03c0338e9` identifies the verified uncommitted artifact; no
commit/push or main/CI parity claim. The landing overlay hash remains unchanged.
All six public smoke checks and three contrasting stateless REST cases pass.
Each preserves 12 original points, three projects, two pins, education and identity;
manual summary review finds the recovery overclaim corrected. Backend requirements
move the API project first. The unsupported case adds no unsupported domain claim,
keeps project order, and moves some existing backend bullets; it is not a full no-op.
These are bounded checks, not general semantic entailment or a reliability guarantee.
Prior upstream failures and authenticated History qualification remain open.

The owner now specifies two signed-in pages: Resume Builder for master details,
projects, education, pinned points and supporting sources; Jobs for tailoring,
applications, status and exact resume history. Pricing is contextual and account
settings remain in the account menu. This consolidation is tracked in issue #13;
three existing rendered builder layouts await explicit selection. Production
navigation has not changed. Approved fonts/colors and the footer are preserved.

## Complete-master onboarding — 8 October (deployed)

The existing New Resume dialog now collects identity/contact details, repeated
roles and achievements, repeated projects/products, education and actual skills.
A deterministic builder stores supplied wording without an AI call or fictitious
applicant facts. Unfinished drafts are allowed. Imported masters get safe fields
to append missing name/project/education facts without rebuilding original text.
The approved Precision Studio system, landing and footer stay unchanged; the
landing overlay hash remains identical to the preceding production artifact.

Worker version `61867a56-97e3-4e7a-91fd-b6d5bbfe450b` served 100% at this release
and is superseded by the History/API release above;
tag `d22cd94-local-068cff9f9a15` identifies a verified **uncommitted local
snapshot** based on `d22cd94b3b2dd0dc1882ac1d7905394221769079`. No commit,
push, migration, secret or production configuration change occurred. Remote
variables were preserved. This is not a main/CI parity claim.

Release verification passes: 623 unit tests, 28 desktop/mobile E2E, typecheck,
lint, extension, full Cloudflare/Astro build, route parity and six local smoke
checks. Six production public smoke checks pass; authenticated apply-agent smoke
is skipped without a session. Two subsequent live desktop/mobile runs each pass
all four new master creation/import completion/reload/pasted-JD scenarios. The
initial run had a transient disabled fresh session and imports bypassing the
auth-pending upload guard; the import test now waits for the visible control.
No authentication timeout or guest fallback was added.

Guest creation remains browser-local; signed-in creation uses the existing
owner-scoped action with the same source. Failed creation retains entered data.
The current public master has 34 approved points, five projects, education and
two Always include selections. Actual successful post-release API responses
retain exact achievement wording and coverage. A bounded frontend-summary
regression now rejects unsupported responsive/browser-rendering claims; broader
semantic grounding and relevance still require review.

**Generation reliability is not qualified.** Repeated post-release batches failed
at the shared managed AI gateway, interspersed with successful unchanged inputs.
Safe gateway logs show provider HTTP 400/403, including a 400 classified as
non-retriable that stops fallback. No gateway credentials, routing or sibling
production configuration were changed. Issue #11 remains open for this failure
and broader semantic quality; actual ChatGPT/OAuth client connection is also
untested. Successful examples and preserved failed attempts are in
`output/master-onboarding-20261008/`; local release, deployed version, safe
provider diagnostics and live browser logs are under
`.fleet-local/master-onboarding-20261008/`.

## Production release — 8 October

The approved Precision Studio landing/app, MCP resume workflow, fixed-wording
bullet and whole-project ranking, required education/product coverage, generated
summaries and Always include controls are deployed at <https://rolepatch.com>.
Worker version `f880d627-d96b-4f51-8fd6-fd0c4947e791` served 100% at this release
and is superseded by the History/API release above;
tag `d22cd94-local-e9ba4a2123e6` identifies a validated **uncommitted local
snapshot**, based on `d22cd94b3b2dd0dc1882ac1d7905394221769079`. No commit or
push occurred; this is not a main/CI parity claim. Existing remote variables were
preserved; no migration, secret or production configuration change occurred.

Release verification passed: 613 unit tests, 24 desktop/mobile browser tests,
typecheck, lint, extension and full Cloudflare/Astro build, route parity and
six local public smoke checks. Final illustration changes were copy only and
passed another full build. All six production smoke checks pass. Public landing
bytes exactly match the built overlay. Two actual public MCP generations for
Glean Fullstack and Agents preserve all 32 points, five complete projects, two
mandatory points and education, with fresh summaries. Missing education fails
before generation. Signed-in browser import, mandatory-point save/reload,
pasted-JD generation, draft save and direct reload pass live (one account token
used). Production review caught escaped pin markers in previews/exports and a
guest hydration race during session loading; both have reproduced regression
tests and verified live fixes. Actual signed-in HTML export hides metadata.

Evidence: `.fleet-local/release-20261008-hydration-manifest.json`,
`.fleet-local/release-20261008-hydration-qualified-final.log`,
`.fleet-local/release-20261008-hydration-production-smoke.log` and
`.fleet-local/pinned-points-20261008/production-managed-verification.json`.
Broader semantic relevance, additional provider qualification, ChatGPT connection
and authenticated apply-agent smoke remain open in
[issue #11](https://github.com/Significant-Hobbies/rolepatch/issues/11).

Earlier entries below are historical local qualification checkpoints; their
unreleased/pending wording describes the state at those checkpoints.

## Complete owner master and frontend wording — 8 October

The owner's reusable source bank now has 34 manually written points, mapping
all 32 previous points and retaining their numeric claims, five projects and
unchanged education. Storybook/component consistency, React styling migration,
RTL, real-time web interaction and web/mobile tooling are stated separately.
The authenticated base resume is updated; save/reload and a 34-point HTML
export pass. Both existing mandatory selections are preserved. Saved drafts
remain snapshots, while new requests use the edited base.

Three live MCP runs with this master retain all exact wording and complete
projects. The synthetic frontend JD promotes RTL, Storybook and Tailwind;
published Fullstack and Agents JD snapshots produce different ordering.
An unsupported responsive-layout/rendering claim in the generated frontend
summary was manually corrected in the delivered artifacts; these reviewed
summaries are not untouched automatic outputs. Product summary generation still
requires user review. Evidence and files: `output/editorial-20261008/README.md`.

## Always-include points — 8 October (released)

The existing resume editor saves mandatory experience/product/project bullets
with the base resume; future drafts inherit selections. Education stays selected
and required. Current ranking also retains unmarked points. No schema migration
or dependency added; existing saved drafts are unchanged. See
[ADR-0011](docs/architecture/decisions/0011-portable-always-include-points.md).
Actual local Worker Fullstack/Agents drafts each preserve 32 points, five projects,
two pins, education and fixed wording, with a new summary. Guest editor save/reload
and focused policy/export tests pass. Release and public MCP qualification pass
as recorded above. Selections apply to new drafts from the saved base resume.

## Minimum coverage and generated summaries — 8 October (local, unreleased)

Successful tailored resumes now require supplied product/project achievements
and education. Missing or empty sections and duplicate summaries fail before
billing; no profile facts are invented. Products headings and a single project
point are supported. All achievement wording, project identity and education
are retained. A new concise summary is required on every successful request,
including unchanged rankings and resumes without an old summary.

Only summary text is generated, with source evidence references, plain-paragraph
bounds, numeric/experience-duration checks and injection rejection. Invalid or
missing generation fails and refunds signed-in charges once. These mechanical
checks are not semantic proof. App and MCP share the policy; no UI redesign or
new dependency. Decision: [ADR-0010](docs/architecture/decisions/0010-required-coverage-generated-summary.md).

Six relevant suites (75 tests), typecheck, scoped Biome and full Cloudflare
build pass. The actual local Worker rejects missing education before generation.
Final actual Agents and Fullstack Worker drafts each retained all 32 points,
five complete projects and original education, with fresh summaries. An observed
unsupported collaboration claim is covered by a new rejection regression.
Evidence: `output/resume-policy/REPORT.md`. Broader semantic quality is not proved. Hosted/account qualification remains open in
[issue #11](https://github.com/Significant-Hobbies/rolepatch/issues/11).
No commit, push or deployment.

## Complete master and reranker comparison — 7 October (local, unreleased)

The owner's three published resume variants are consolidated into 32 polished
achievement bullets: 23 employer points and 9 points across five projects.
All 71 source occurrences map to stable point IDs with source references and
numeric-token checks. The complete master was imported, saved and reloaded in
an actual local Worker browser guest profile. Markdown imports now retain exact
source wording without a model call; other document structuring is unchanged.

Local CPU benchmarks compare BM25, TF-IDF, MiniLM embeddings, two MiniLM
cross-encoders and Mixedbread xsmall with unchanged source order across three
real JD snapshots and five synthetic roles. TF-IDF leads the full-requirements
bullet development comparison; BM25 leads the exploratory short-brief version.
Whole-project comparison finds different strengths: TF-IDF leads development,
while embeddings perform best on four scorable synthetic cases. Labels are
agent-authored and the project extension is exploratory. Agents/frontend
false positives remain; this is no ATS or hiring-quality qualification.

The shared tailoring action now accepts separately validated whole-project
permutations. Titles, links, technologies, dates and all project content move
together within the original Projects section, including single-bullet
projects. Employment order stays fixed. The tested local algorithms are
comparison artifacts, not new application defaults. Decision:
[ADR-0009](docs/architecture/decisions/0009-intact-project-ranking.md).

Four focused suites (56 tests), typecheck, scoped Biome, docs check and full
Cloudflare build pass. Artifacts:
`output/reranking/`. Managed-provider relevance and hosted/account checks remain
open in [issue #11](https://github.com/Significant-Hobbies/rolepatch/issues/11).
No UI change, dependency, commit, push or deployment.

## Fixed-wording tailoring — 7 October (local, unreleased)

Per owner direction, saved resume wording is now preserved and existing
experience/project bullets are ranked within their original roles. Model
output contains IDs only; code rejects incomplete, duplicate or foreign
permutations and reconstructs original blocks. Contacts, dates, summary,
skills, education and chronology remain fixed. Selected saved material stays
separately attributed. The existing editor supports polishing once; this pass
adds no dedicated polishing UI, bullet selection or page budget.

Seven relevant suites (71 tests), scoped Biome and full Cloudflare build pass.
Five intermediate real managed-runtime drafts preserved every original bullet
and fixed text; one invalid permutation was rejected. Review found fullstack
ranking overweighted company AI boilerplate. The final prompt addresses this,
but final live checks hit HTTP 429/502 and returned no drafts. Final relevance
qualification remains open in [issue #11](https://github.com/Significant-Hobbies/rolepatch/issues/11).
Evidence: `.fleet-local/resume-examples-20261007/ranking-report.md`.
Decision: [ADR-0008](docs/architecture/decisions/0008-fixed-wording-resume-ranking.md).
No UI change, commit, push or deployment. Hosted/account flows remain unqualified.

## Real personal-resume generation — 7 October (local Worker qualification)

The owner's published AI infrastructure and full-stack resumes were exercised
against real Glean Agents, Gemini Money and Glean Fullstack descriptions. A
separate local Worker config connected the existing managed FREE_AI gateway
without account records or production app bindings. Four of five generation
attempts returned actual drafts; one upstream HTTP 400 remains unexplained.

Output-quality review found unchanged drafts, a corrupted website URL and
unsupported ledger/accounting and RAG-evaluation claims. These are unresolved
product defects tracked in [issue #11](https://github.com/Significant-Hobbies/rolepatch/issues/11), not a ready automatic tailoring flow. Three reviewed,
source-checked one-page PDF/Markdown resumes were delivered after editorial
correction and curation; they are not untouched automatic outputs. Local
qualification evidence: `.fleet-local/resume-examples-20261007/report.md`.
Hosted deployment, ChatGPT connection and saved-profile account flow remain
unqualified. No application-code change or deployment.

## Hands-on real-job QA — 7 October (local, unreleased)

Actual built-browser import passed for Twilio engineering (Greenhouse), Skio
product design (Lever), and Ready data engineering (Ashby). A synthetic
accountant mismatch, invalid/internal URLs, short pasted descriptions,
HTML/Word-compatible exports and local MCP requests were exercised.

Observed defects are fixed locally: reader metadata and company/role labels,
expired job IDs importing entire directories, guest cover-letter authentication
rejection, minified React errors in cover-letter/interview generation, and
silently discarded fit-score failures, and cover-letter controls overflowing
phone widths. Guests never write cover letters to D1;
signed-in cover-letter ownership is checked before charging.

Fifteen relevant suites (130 tests), typecheck, scoped Biome and the full
Cloudflare build pass. Actual rebuilt AI actions now display readable failure
messages and allow retry. The plain Next preview used for this checkpoint lacked the managed Worker AI
binding; real local Worker generation was subsequently qualified above. Public
browser navigation was client-blocked; hosted behavior and account flows remain
unqualified. The approved landing/footer/styles are preserved. Qualification
limits remain tracked in [issue #10](https://github.com/Significant-Hobbies/rolepatch/issues/10).
No commit, push or deployment. Detailed local evidence:
`.fleet-local/qa-jobs-20261007/report.md`.

## App readability and guest interview prep — 7 October (local, unreleased)

The approved Precision Studio layouts are preserved. App headings use Space
Grotesk, interface text uses Geist, helper/status colors have stronger contrast,
and primary actions are graphite. Forms and common labels are clearer. Styling
is scoped to app main content and the editor toolbar; Astro landing and both
footers are unchanged during this pass.

Actual isolated-browser use covered saving/reloading experience and achievement
records, creating/editing/reloading a resume, downloading its Markdown, adding
a pasted job description, and opening tailoring, cover-letter and interview
preparation routes. Guest interview prep previously queried server records and
could not open browser-local jobs; it now reads guest browser records while
signed-in requests retain owner-scoped server lookup. Five regression tests
cover guest loading, missing job/resume and authenticated isolation.

Six focused suites (70 tests), typecheck, scoped Biome and the full Cloudflare
build pipeline pass. Rendered review covers 390/768/1440px; narrow evidence-card
intrinsic overflow and action wrapping are corrected. Qualification receipt:
`.fleet/design-review-readability-preserve-20261007.json`.

Local managed resume generation reached an honest AI-service error. Turnstile
and Workers D1/AI-backed paths remain unqualified in this plain Next preview;
no live AI draft, account flow or hosted MCP connection is claimed. Existing
full-suite baseline failures remain separate. No commit, push or deployment.

## Precision Studio — 7 October (local, unreleased)

After rejecting Resume Studio as insufficiently premium, the owner selected
**2 — Precision Studio** from three new paired full-page previews. The actual
Astro landing body now uses the job/source/draft workbench, dark redline section,
horizontal method rows and ruled export/access inventory. The primary React
workspace carries the same Geist, graphite controls and paper treatment. The
existing landing footer, layout and shared stylesheet remain byte-identical to
the start of this redesign; app footer tokens remain unchanged.

The local built preview is `/` plus `/dashboard` and `/tailor/[jobId]`, not the
standalone HTML direction probes. Guest persistence, CTA handoff, job-context
and menu disclosures, keyboard FAQ and responsive 390/768/1440px layouts were
checked. Keyword scores show their 100-point scale; the explanation panel stays
inside the phone viewport. The 47 focused tests, typecheck, source Biome checks,
Astro build and full Cloudflare pipeline pass. Qualification is recorded in
`.fleet/design-review-premium-20261007.json`. The owner subsequently approved
the finished render (“approved”); acceptance is recorded in the receipt.
No publication was requested or performed.

MCP source/protocol/extraction qualification below remains current. At this design checkpoint, live AI output and a hosted assistant connection
were unqualified; later local Worker generation is recorded above. No OAuth
connection is inferred from this design work.

## Resume Studio and portable resume MCP — 7 October (local, unreleased)

The owner initially selected Resume Studio from three rendered landing/workspace pairs;
its visual direction is superseded by Precision Studio above.
The Astro landing and primary resume workspace now share that system, with a
document preview, editable comparison, clearer keyword labels and a direct
paste-description path. Local guest resume/job persistence and the landing CTA
handoff were verified. Responsive renders passed at 390, 768 and 1440 pixels;
the recorded design-workflow completion check passed.

The new `/api/mcp` endpoint and local stdio bridge expose profile listing,
qualified job-reference resolution and unsaved Markdown/HTML drafting. Guests
provide the base resume on each call; saved IDs remain ownership-scoped. Public
URLs and LinkedIn, Greenhouse, Lever and Ashby IDs are supported with the
required board context. Optional local extraction reuses Fleet slow-serp.
See [setup and limits](docs/operations/runbooks/resume-mcp.md),
[ADR-0007](docs/architecture/decisions/0007-portable-resume-mcp.md) and
[issue #10](https://github.com/Significant-Hobbies/rolepatch/issues/10).

The 47 focused tests, typecheck, changed-file Biome checks, docs validation and
full Cloudflare build passed. Real local MCP handshake/tool discovery and a
public Lever extraction passed. Live synthetic generation reached the existing
AI adapter but failed because the local managed AI service was unavailable;
generated-output behavior is covered by mocked tests, not a successful live
draft. The full suite had two unrelated baseline failures: unresolved existing
app-health package and the existing footer CSP expectation.

No commit, deployment, migration or production configuration change was made.
Hosted generation, a real remote assistant connection and account/OAuth
qualification remain open; the endpoint does not implement OAuth discovery.

## Free AI gateway source update — 2 October

Managed AI requests now use the Fleet gateway with canonical `rolepatch`
attribution. Explicit BYOK remains first; production fails closed when the
service binding is missing, and managed calls leave retries to the gateway.
Privacy copy now describes gateway and BYOK provider routing accurately. The
SDK adapter tests and full local `pnpm quality` pass (496 tests), and the
Cloudflare build plus Wrangler dry-run pass. Pending PR review and production
release; no deployment was performed. Tracked in [Free AI issue #83](https://github.com/sass-maker/free-ai/issues/83).

## Import release — 9 September

PR #69 is merged. Source `985dfd1f11a3c617482c49f05bf59708b9d7fd6b`
passed exact main CI34353340640 and all six deploy gates. Deployment34353678503
and its production smoke passed. Worker `667026d3-f9c7-4630-a709-cf2f3f0239cf`
serves the exact source tag at 100% traffic.

Real hosted guest PDF and DOCX imports completed in 9.2 and 9.1 seconds,
opened the editor and survived reload byte-exactly. Dates and the 240/160 ms
metric were preserved. The mobile PDF editor was visually inspected; its browser
reported no errors. Both generated outputs added an unnecessary missing-contact
placeholder, so these samples do not prove perfect source fidelity. Signed-in
persistence remains unqualified because the browser bridge cannot start.
Evidence: `docs/operations/evidence/resume-hosted-import-2026-09-09.json` and
its PNG. The checkpoints below are historical; this release supersedes their
unreleased status. Local temporary artifacts and disposable browsers are cleaned.

## Import repair validation — 9 September

The file-import action now uses literal dynamic imports instead of a module-level
`new Function()` loader. Six focused tests cover module loading with string code
generation blocked, real synthetic PDF/DOCX extraction, guest isolation, signed-in
ownership, failed generation and empty input. AI calls are mocked in these tests.
All 479 tests passed, and the full Cloudflare build completed. Its bundle metadata
includes Mammoth and pdf-parse; tracing exclusions alone did not establish absence
from the final bundle. No dependency or production configuration changed.
Full quality is not green: the dependency gate reports 15 unexpected critical/high
advisories (3 critical findings overall). Later quality stages did not run.

The subsequent targeted Next.js 16.3.4 and Mammoth 1.12.2 updates reduce that gate
to 5 unexpected findings and 1 critical finding. All 479 tests and the full
Cloudflare build pass after the updates. Remaining findings concern Astro,
extract-zip, sharp, js-yaml and SVGO; the gate remains failed and no release ran.

Narrow same-major js-yaml 4.3.2 and SVGO 4.1.0 overrides subsequently reduced the
unexpected findings to 3 (Astro, extract-zip and sharp), with 1 critical remaining.
All 479 tests and the complete Cloudflare build still pass. No acceptance baseline
was relaxed. This supersedes the five-finding checkpoint above.

Astro 7.2.8 removes the remaining critical finding. The dependency gate now has
2 unexpected high findings (extract-zip and sharp); it is still failed. The full
Cloudflare build passed. Chromium comparisons of all four static pages at 390px
and 1440px found two lost spaces before inline code on the docs page; explicit
spaces restore exact rendering. All eight final screenshots are pixel-identical
to Astro 5 output, with matching rendered text and links and no horizontal
overflow. These local checks disabled JavaScript and external requests; they do
not qualify hosted interactions. Receipts: `docs/operations/evidence/astro-7-2026-09-09/`.

This repair is not yet released or qualified on Workers. A local built-Worker
dashboard probe stopped at a BetterAuth default-secret configuration error, before
file import could be exercised; the local server was stopped. Existing issue68
retains hosted import and account acceptance. The fixtures contain synthetic data.

## Current qualification

The browser-manager override to @puppeteer/browsers 3.2.2 removes extract-zip
without adding an audit exception. Both Puppeteer imports, a real local Chrome
launch/PDF render and a Cloudflare-fork connection to that browser pass. Full
quality (479 tests) and the complete Cloudflare build pass. The security gate has
0 critical and 0 unexpected findings; 7 previously accepted high advisory IDs
across 8 paths remain. No claim of a vulnerability-free dependency tree is made.

Built-Worker import probes used only synthetic documents, an ephemeral local auth
value and an intentionally unreachable synthetic AI endpoint. The dashboard
returned HTTP200. PDF import fails in pdfjs with `DOMMatrix is not defined`.
DOCX reaches the expected AI-service failure, proving extraction got past the
parser, but the browser sees minified React error441 instead of the safe message.
The local browser and Worker are stopped. Hosted import acceptance remains open;
no release has run. This supersedes the earlier local auth-only blocker.

Expected import errors now return structured action results instead of throwing
through React's production transport. Built-Worker PDF and DOCX probes both
returned HTTP 200 with readable error text, retained the dashboard and re-enabled
retry. PDF still fails extraction; DOCX reaches the deliberately unavailable AI
endpoint. This verifies recovery, not successful import. Eight focused tests pass,
including empty model output and failed-save handling; full quality passed 481
tests and the full Cloudflare build completed. Evidence:
`docs/operations/evidence/resume-import-errors-2026-09-09.json`.

PDF extraction now runs in the browser using the existing pdf-parse browser
build and a same-origin, content-hashed worker asset. The full Cloudflare build
passes with the worker URL excluded from the server bundle. A 390px Chromium
probe against the built local Worker uploaded the real synthetic PDF, preserved
its facts in the AI request, opened the editor and retained the generated resume
after reload. That successful probe used a local AI stub; it does not establish
hosted AI quality or account persistence. The unavailable-provider probe also
retains readable retry behavior. Both local servers and the browser were stopped.
Evidence: `docs/operations/evidence/resume-browser-pdf-2026-09-09.json`.
This supersedes the PDF runtime failure above for the browser import flow;
direct server-side PDF parsing still requires browser APIs and is not qualified.
Full quality passes after the browser PDF change (481 tests, no unexpected security findings).
The import picker no longer advertises legacy .doc support; direct legacy uploads
receive a DOCX/PDF conversion message. Empty or generic browser MIME types fall
back to supported filename extensions. Ten focused import tests pass.

Both workspaces use Wrangler 4.114.0 and Miniflare resolves sharp 0.35.4 through a
patch-only override. Native PNG encoding/decoding passed. The browser-manager
change above subsequently removed the final unexpected extract-zip finding.

Production source `18c041f4c795af5281d6c82ef96e75c775acac3b` is deployed at
100% traffic (Worker `fe163417-64ed-462a-80c5-a4b8d7cf99f5`,
[run 34143940332](https://github.com/Significant-Hobbies/rolepatch/actions/runs/34143940332)).
All 467 tests, full local quality and exact-source CI passed. Replacing the
retired Workers AI default and bounding generation recovered hosted tailoring:
a synthetic guest resume completed in 6.4 seconds, preserving candidate facts,
dates, education and 240/160 ms metrics without adding AWS/Kubernetes experience.
Accept & Save retained byte-exact output after reload. This is sample evidence,
not a guarantee of general factual correctness or model reliability.

Fresh guest resume creation, manual job-description entry and the repaired guest
cover-letter route also pass. Expected AI errors reach the UI safely and original
content survives failures. The mobile diff clipped lower content because its
flex child could not shrink; the subsequent source fix allows internal scrolling.

Correction to the earlier export diagnosis: the guest editor already provides
browser Print. The protected `/api/render/<id>` 404 is expected authorization
behavior; the guest UI does not request it. The actual missing capability was
exporting the tailored result.

Source now adds browser-local Print / Save PDF, HTML, Markdown text and
Word-compatible .doc export to tailored results and the guest editor, preserving
signed-in server export. It exports current edited source, rejects executable
HTML/unsafe links/external images, bounds render configuration and explains
blocked pop-ups. Focused tests and the full 473-test quality pipeline pass.
The approved export release `d28b05a34766aced89c11d138a2d5654c9b568c2`
([deployment 34146632823](https://github.com/Significant-Hobbies/rolepatch/actions/runs/34146632823))
serves Worker `faaa3a1f-da95-4009-967c-0f3c3091dda1` at 100%, exact tag verified.
A fresh UI-created guest workflow generated in 5.229 seconds, preserved reviewed
synthetic facts, saved/reloaded exact output, and downloaded text/HTML/.doc.
The real print popup produced readable one- and two-page documents through the
browser print engine, with all 36 long-fixture items and final section retained.
The native OS print dialog and Microsoft Word itself were not automated.
Current unsaved edits export without replacing the saved original. Desktop/mobile
controls pass with no horizontal overflow or page errors in the final session.

The guest workflow is now shareable as an experiment, with medium confidence.
Optional file import, URL scraping, broader AI behavior and signed-in account
qualification remain in [#68](https://github.com/Significant-Hobbies/rolepatch/issues/68).
The regular signed-in browser bridge could not start. An initial disposable
Chrome process crashed; the successful pass used a fresh browser with GPU disabled.
Local Turbopack could not decode the existing favicon; local validation used
Webpack, matching the production pipeline.

## Why / What

RolePatch is an AI resume and job-application assistant. It helps users tailor resumes, generate cover letters, research companies, score role fit, prepare STAR stories, and run guest or signed-in application workflows with a campaign CRM, achievement evidence bank, job-discovery alerts, recruiter reply routing, and a review-first apply-agent command center.

**Users:** Job seekers in guest mode (localStorage) or signed-in via Google OAuth; operators on `rolepatch.com` Cloudflare Workers deploy.

**Constraints:** General job search is LinkedIn-only (no Python JobSpy sidecar on Workers); company watches can use supported career URLs; job URL scraping has a lightweight app-level limiter; Astro landing overlay for fleet perf on `/`.

**IN scope:** Resume editor, tailoring, cover letters, interview prep, tools hub, campaign CRM, evidence bank, saved-search/company-watch alerts, recruiter reply routing, Dodo token checkout, PDF export via Browser Rendering, and review-first apply-agent queue/packet/receipt workflows.

**OUT of scope:** Git history purge (Option A), broad ATS/recruiter CRM, multi-board crawlers, unattended bulk apply, unattended file upload automation, captcha bypass, production Email Routing rule setup, and aggressive scraping without endpoint evidence.

Live on `rolepatch.com` via Cloudflare Workers (OpenNext).

## Dependencies

### External

- **Ultracite 7.10.2:** Exact development-only shared Biome presets; RolePatch
  keeps explicit local compatibility exceptions and does not ship Ultracite at
  runtime.
- **Cloudflare D1:** Signed-in persistence: jobs, applications, evidence, saved searches, alerts.
- **Dodo Payments:** Token purchases; webhook + success verification hardened in audit.
- **LinkedIn (guest API):** In-Worker job search — no API key; datacenter IP rate limits possible.
- **Cloudflare Browser Rendering:** PDF resume export (replaces broken puppeteer-core path).
- **Cloudflare Email Routing:** Inbound recruiter replies to per-user forwarding addresses; Worker `email()` handler routes to internal ingestion.
- **Resend:** Optional weekly digest sending path; fails closed when `RESEND_API_KEY` is unset.
- **PostHog:** Product analytics.
- **Env files:** `.env.example` — `AI_*`, `BETTER_AUTH_*`, `GOOGLE_*`, optional `DODO_*`, `RESEND_*`, and RAG settings.

### Internal (fleet)

| Service | Role |
| --- | --- |
| **free-ai** | All AI traffic via Workers AI chokepoint (`https://ai-gateway.sassmaker.com/v1`) |
| **knowledge-base** | Optional semantic job/resume similarity via the shared RAG service (`RAG_SERVICE_KEY` + `ROLEPATCH_RAG_INDEX_ID`) |
| **SaaS Maker feedback** | Optional `NEXT_PUBLIC_SAASMAKER_API_KEY` |
| **Local astro landing scripts** | Astro static hero overlaid during `cf:build` via `scripts/run-overlay-astro-landing.mjs` (fleet perf / psi-swarm TTFB-LCP on `/`) |

### Stack & commands

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind v4 · CodeMirror · Vitest · Playwright · Cloudflare Workers via `@opennextjs/cloudflare` · Cloudflare D1 · better-auth Google OAuth · Wrangler D1 migrations · Vercel AI SDK · free-ai-gateway · Cloudflare Browser Rendering · Dodo Payments · PostHog · `@saas-maker/feedback` · local astro overlay scripts.

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install deps |
| `cp .env.example .env.local` | Local env |
| `pnpm dev` | next dev → http://localhost:3000 |
| `pnpm build` | next build --webpack |
| `pnpm cf:build` | next + astro-landing inline + opennext + overlay |
| `pnpm deploy` | cf:build + wrangler deploy |
| `pnpm start` | next start (Node preview only) |
| `pnpm typecheck` / `pnpm test` / `pnpm test:e2e` | TS + vitest + playwright |
| `pnpm lint` / `pnpm check` | lint + biome check |
| `pnpm verify:deploy-routes` | Verifies built Next app manifest contains parity-critical routes before deploy |
| `pnpm smoke:prod` / `pnpm smoke:local` | Public production/local smoke plus optional authenticated apply-agent read checks |

CI: GitHub Actions runs CI on pushes/PRs; production deploy is a manual,
SHA-tagged `workflow_dispatch`.

**Entrypoints:** `worker.mjs` · server actions `src/lib/actions/*` · API routes `/api/jobs` · job search `src/lib/job-search.ts` · PDF `src/lib/pdf.ts` · guest layer `src/lib/local-storage.ts`.

## Timeline

- **2026-08-09 — Adopted the verified Fleet lint baseline:** Extended the
  exact Ultracite core, React, Next.js, and Vitest Biome presets while retaining
  RolePatch's existing formatter contract, generated-file exclusions, and
  explicit compatibility exceptions. No source rewrite, production dependency,
  runtime, route, deploy, secret, or production configuration changed.
- **2026-08-05 — ATS metrics guide aligned to live search evidence:** The
  public ATS score guide now distinguishes third-party resume-match scores from
  employer recruiting metrics, removes unsupported universal threshold claims,
  and explains parsing, requirement coverage, and evidence quality before
  directing readers to the free keyword checker.

- **2026-07-31 — Receipt-first landing evidence clarified:** The Astro hero now
  shows a truthful illustrative packet/fill/submit receipt rail, routes its
  receipt CTA to the matching section, exposes visible keyboard focus, honors
  reduced motion, and keeps header targets at least 44px without overflow at
  390px, 768px, or 1440px.
- **2026-07-29 — First-party changelog shipped:** The Astro public surface now
  owns a same-origin `/changelog` with verified editorial release entries,
  while Roadmap and Source link to the canonical GitHub issues and repository.
- **2026-07-26 — Deploy provenance hardened locally:** Production deployment
  is manual-only again, both local and Actions deploy paths attach the full Git
  SHA to the Cloudflare version, and current deploy/CI/smoke docs match the
  workflow. Pending commit/push and the next operator-owned production deploy.
- **2026-07-11 — Test isolation:** Vitest now installs and resets a deterministic `localStorage` implementation before each test, preventing guest-mode state leakage between suites.

- **2026-07-04 — Guest live job discovery shipped:** Dashboard discovery no longer dead-ends guests; unsigned users can run the native Cloudflare-safe LinkedIn search, save local shortlists/searches, and create local tailoring drafts from discovered jobs while recurring company watches stay signed-in-only.
- **2026-07-04 — Standalone jobs browser shipped:** `/jobs` now exposes the live job browser outside the dashboard, hydrates guest local resumes for queue/tailor actions, and is linked from app navigation plus the Astro landing page.
- **2026-07-04 — Job browser quick searches shipped:** Discovery now includes one-click searches for remote AI, product engineering, new-grad software, and visa-sponsorship roles using the existing Cloudflare-safe search path.
- **2026-07-04 — Job card signals shipped:** Discovered job cards now show scan-friendly posting signals for remote, visa, new-grad, senior, lead, and contract hints inferred from available job text.
- **2026-07-04 — Job signal filters shipped:** Discovery results can now be filtered by inferred posting signals before batch queueing, so visible-match queueing respects the selected review subset.
- **2026-07-04 — Resume-aware discovery ranking shipped:** Search results can now be reordered by Knowledgebase semantic similarity against the selected resume before filtering or queueing.
- **2026-07-04 — Discovery semantic match scores shipped:** Resume-aware ranking now returns normalized Knowledgebase scores and surfaces semantic match percentages on ranked job cards.
- **2026-07-04 — Semantic match filters shipped:** Ranked discovery results can now be filtered to 90%+, 80%+, or 70%+ resume matches before visible-match batch queueing.
- **2026-07-04 — Discovery match evidence shipped:** Ranked job cards now show lightweight overlapping resume/job terms so users can inspect why a semantic match ranked highly before queueing.
- **2026-07-04 — Strong-match queue shipped:** Resume-ranked discovery can now queue all unqueued 80%+ semantic matches for reviewed apply prep in one action.
- **2026-07-04 — Semantic queue context shipped:** Jobs queued from resume-ranked discovery now preserve semantic score/evidence in job notes and surface it in the apply-agent queue review row.
- **2026-07-04 — Semantic queue badges shipped:** Apply-agent queue rows parse RolePatch semantic notes into a resume-match badge and evidence line instead of burying them as plain text.
- **2026-07-04 — Discovery alert queue context shipped:** Jobs queued from saved-search/company-watch alerts preserve source/location context and display it as a discovery badge in the apply-agent queue.
- **2026-07-04 — Multi-source queue context shipped:** Apply-agent queue rows can display semantic match and discovery alert context together for jobs touched by both discovery flows.
- **2026-07-04 — Batch alert-to-queue import shipped:** The command center can queue all visible saved-search/company-watch alerts with job URLs in one reviewed action while skipping already queued URLs.
- **2026-07-04 — Weekly apply-agent recap shipped:** Weekly digest emails now include apply-agent queue and receipt activity, so users see ready, blocked, filled, submitted, and recent ATS progress alongside new matches.
- **2026-07-04 — Discovery-to-apply queue shipped:** Search result cards can now create or reuse tracked jobs and add them directly to the reviewed apply-agent queue, with guest localStorage parity and signed-in queue refresh.
- **2026-07-04 — Batch discovery queue shipped:** Dashboard search results can now queue all visible unqueued matches for reviewed apply-agent preparation without submitting applications, deduping duplicate tracking URLs and showing a queued count.
- **2026-07-04 — Extension save-to-queue shipped:** Chrome extension can save the current ATS job into RolePatch, reuse existing tracked jobs, and queue it in the review-first apply-agent command center.
- **2026-07-04 — Canonical ATS URL matching shipped:** Extension save, tailor, packet, and fill receipt routes match exact and no-query/no-hash job URLs so ATS tracking params do not break workflows.
- **2026-07-04 — Submission field snapshots shipped:** Reviewed submit and manual submitted-receipt capture now store final visible ATS field labels/values in application receipts.
- **2026-07-04 — Submitted-answer learning shipped:** Successful submitted receipts now learn reusable sensitive profile answers from final ATS field snapshots while ignoring file/upload fields.
- **2026-07-04 — Batch reviewed browser checks shipped:** Dashboard, HTTP API, CLI, and MCP can run sequential reviewed browser checks over selected/recent queue entries without submitting applications.
- **2026-07-04 — Reviewed browser ATS coverage expanded:** Browser-check provider support now aligns with extension-assisted fill for Greenhouse, Lever, Workday, Ashby, Workable, Recruitee, and Personio.
- **2026-07-04 — Guarded browser submit pilot shipped:** Dashboard, HTTP API, CLI, and MCP can run a single Browser Rendering submit attempt that fills from saved answers/materials, refuses CAPTCHA/upload/required-field blockers, and records submitted/failed receipts.
- **2026-07-04 — Batch guarded browser submit shipped:** Dashboard, HTTP API, CLI, and MCP can run capped sequential guarded submits for selected/recent `ready_to_submit` queue entries with per-entry results/errors.
- **2026-07-04 — Browser failure-code triage shipped:** Reviewed checks and guarded submits now return machine-readable failure codes, persist them in receipt fields, and surface next-step remediation in the dashboard.
- **2026-07-04 — Automation health dashboard shipped:** The apply-agent command center now summarizes browser receipts, guarded-submit success ratio, provider-level outcomes, and top blockers before broader ATS claims.
- **2026-07-04 — Provider reliability evidence shipped:** Automation health now shows per-provider success/block rates and conservative expand/fix/collect recommendations from real receipts.
- **2026-07-04 — Similar-product research recorded:** Durable apply-agent competitor research now captures Tsenta, Simplify, Teal, Huntr, Massive, AIApply, Kickresume, and related lessons with an ROI order for future automation work.
- **2026-07-04 — Production smoke harness shipped:** `pnpm smoke:prod` now checks public production pages and optional authenticated apply-agent read APIs without mutating user data or storing secrets.
- **2026-07-04 — Production smoke drift recorded:** Public smoke against `https://rolepatch.com` passed landing/pricing but found `/jobs` returning 404 and `/settings` missing current readiness/extension content, so production needs a fresh deploy before the new parity surfaces are live.
- **2026-07-04 — Production smoke drift still open:** Latest public smoke against `https://rolepatch.com` passed landing/pricing only; `/jobs`, `/proof`, the TrueHire preview guard, and current settings readiness still require a fresh deploy before the local apply-agent/proof slice is live. Rechecked after the standalone release preflight on 2026-07-04 23:32 IST and smoke remained 2/6. Symphony task `4847b8bf` tracks the deploy follow-up.
- **2026-07-04 — Apply-agent/proof slice deployed:** Commit `5f5151c` deployed to Cloudflare Worker `resume-tailor` through GitHub Actions run `28715037108`; companion CI run `28715037109` passed. Post-deploy `pnpm smoke:prod` passed 6/6 against `https://rolepatch.com` at 2026-07-04 23:38 IST for landing, jobs, pricing, proof, TrueHire preview guard, and settings readiness. Authenticated read-only smoke was skipped because no `ROLEPATCH_SESSION_COOKIE` was provided.
- **2026-07-04 — Deploy build route evidence recorded:** `pnpm build` succeeds locally and the Next route manifest includes dynamic `/jobs`, `/proof`, and `/settings`, confirming the smoke failures are stale production deploy drift rather than missing current-repo routes.
- **2026-07-04 — Deploy route verifier shipped:** `pnpm verify:deploy-routes` now checks the built Next app manifest for parity-critical pages and APIs before deploy.
- **2026-07-04 — Cloudflare build route gate shipped:** `pnpm cf:build` now runs the deploy route verifier immediately after `next build --webpack`, before OpenNext and `wrangler deploy` can proceed.
- **2026-07-04 — Release preflight command shipped:** `pnpm release:verify` now runs the non-deploy release gates in one command: typecheck, lint, Vitest, extension build, Cloudflare build, standalone local public smoke, and focused desktop/mobile Playwright.
- **2026-07-04 — Release preflight passed:** `pnpm release:verify` passed end to end against the standalone artifact with copied `.next/static`/`public` assets on 2026-07-04 23:32 IST: typecheck, Biome, 405 Vitest tests, extension build, Cloudflare build, 13/13 deploy-route verification, 6/6 local public smoke, and 22 focused desktop/mobile Playwright tests.
- **2026-07-04 — Deploy handoff documented:** `docs/deploy-handoff.md` now captures the approved publish checklist, post-deploy smoke commands, task ids, and completion evidence needed once deploy approval is granted.
- **2026-07-04 — GitHub deploy workflow repaired:** At that time,
  `.github/workflows/deploy.yml` was changed to listen for `main` pushes, pull
  requests, and manual dispatch, removing an unreachable `push` condition.
  The push-to-production behavior was superseded by the manual-only fleet
  standard on 2026-07-26.
- **2026-07-04 — Deploy handoff path repaired:** SaaS Maker's fleet registry now maps `resume-tailor` to `/Users/sarthak/Desktop/fleet/rolepatch`, and the Symphony dispatcher resolves configured project paths before falling back to slug-derived directories.
- **2026-07-04 — Local production smoke verified:** Built app served with `next start -p 3005` passed the then-current public smoke 4/4 for landing, jobs browser, pricing, and settings readiness, using only a throwaway local auth secret. The current public smoke harness now checks 6 public routes, including `/proof` and the TrueHire preview guard.
- **2026-07-04 — Missing answer prompt loop shipped:** Failed guarded browser receipts with missing required fields now surface answer-gap prompts in the command center and can prefill the Profile answers form for the next retry.
- **2026-07-04 — Answer bank review shipped:** The apply-agent command center now summarizes profile-answer coverage, flags review-required learned answers, and shows missing work-auth/sponsorship/location/link coverage before guarded submit.
- **2026-07-04 — Receipt transparency summary shipped:** Apply-agent receipts now show answered, skipped, uploaded, manual-upload, blocker, and confirmation metrics in the command center so users can audit what automation actually did.
- **2026-07-04 — Field-level receipt details shipped:** Queue receipts can now expand to show captured field labels, values, and sources for exact application auditability.
- **2026-07-04 — Copyable receipt audit shipped:** Queue receipts can now copy a portable audit summary with job context, provider/status, confirmation evidence, and captured fields.
- **2026-07-04 — Receipt timeline shipped:** Queue entries with repeated fill/check/submit attempts now show a newest-first receipt timeline so retry history is visible during review.
- **2026-07-04 — Guarded submit copy hardened:** Dashboard controls now say `Guarded submit` instead of `Auto submit` so the reviewed-submit boundary stays clear.
- **2026-07-04 — Guarded submit API boundary shipped:** Browser-submit API success responses include machine-readable guardrail metadata declaring `unattended: false` and the refusal conditions.
- **2026-07-04 — Queue safety review shipped:** Apply-agent queue rows now block guarded submit for saved excluded companies, duplicate normalized ATS URLs, and low fit scores, surfacing the exact safety reason before review.
- **2026-07-04 — Required answer safety shipped:** Queue rows now block guarded submit until work-authorization and sponsorship profile answers exist.
- **2026-07-04 — Required answer prompt buttons shipped:** Missing work-authorization/sponsorship queue blockers can now prefill the profile-answer form directly from the safety review row.
- **2026-07-04 — Queue safety summary shipped:** The command center now summarizes blocked, warning, and clean queue entries before row-level review.
- **2026-07-04 — Company-history safety review shipped:** Queue rows now warn when another submitted-stage role already exists at the same company, without blocking legitimate multi-role applications.
- **2026-07-04 — Discovery alerts to apply-agent shipped:** Saved-search and company-watch alerts now preserve job URL metadata and can be imported directly into the apply-agent queue from the command center.
- **2026-07-04 — Provider remediation playbooks shipped:** Browser failure codes now resolve to provider-aware next steps for Greenhouse, Lever, Workday, Ashby, Workable, Recruitee, and Personio in queue receipts and automation health.
- **2026-07-04 — Cloudflare Worker runtime hooks wired:** `worker.mjs` now exposes scheduled cron handlers for company watches/weekly digest, an Email Routing `email()` handler for recruiter reply ingest, and a 404 guard for external `/api/internal/*` requests.
- **2026-07-04 — Operational readiness panel shipped:** `/settings` now shows safe Cloudflare-first runtime status for Browser Rendering, Resend, sender identity, AI gateway, auth/OAuth, and Worker hooks without exposing secret values.
- **2026-07-04 — Operational readiness e2e shipped:** Playwright now covers `/settings` readiness rendering on desktop and mobile Chromium with configured placeholder runtime env, verifying Cloudflare/email/auth/AI readiness labels render and secret values stay hidden.
- **2026-07-04 — Payment readiness visibility shipped:** `/settings` now reports Dodo checkout and webhook configuration readiness without exposing API keys, webhook secrets, or product IDs; desktop/mobile readiness e2e covers the payment items.
- **2026-07-04 — Apply-agent pricing boundary shipped:** `/pricing` now states that reviewed queue, packets, extension fill, and receipts are included while tokens fund AI work, with no subscription or unattended bulk-apply claim.
- **2026-07-04 — Receipt-first landing positioning shipped:** The Astro landing page now leads with reviewed apply, Chrome-assisted fill, packet/receipt transparency, and explicit no-unattended-bulk-apply boundaries instead of only resume-tailoring copy.
- **2026-07-04 — Discovery source decision shipped:** Dashboard discovery now summarizes active searches/watchlists, unseen alerts, latest company-watch yield, fallback/source health, and a setup/collecting/fix-current-sources/keep-current-sources recommendation before broader job-board or ATS-scale claims.
- **2026-07-04 — Queue materials checklist shipped:** Apply-agent queue entries now show explicit base resume, tailored resume, cover letter, profile answers, and receipt readiness instead of opaque readiness keys.
- **2026-07-04 — Safe AI failure copy shipped:** Resume import, tailoring, cover letters, fit score, interview prep, outreach, skills roadmap, and bulk rating now normalize provider failures into retryable/settings-focused user errors while preserving token/auth errors.
- **2026-07-04 — Safe job-search failure copy shipped:** Native LinkedIn job search now maps upstream rate limits, timeouts, and outages to actionable retry/company-watch/paste-URL guidance instead of exposing provider internals.
- **2026-07-04 — Add Job scrape fallback shipped:** The Add Job modal now switches to a manual job-description paste path when scraping cannot read a posting, preserving the tailor workflow instead of dead-ending on scrape failure.
- **2026-07-04 — Scrape rate limiter shipped:** Job URL scraping now has an app-level fixed-window limiter with typed rate-limit fallback copy that keeps users on the manual JD paste path.
- **2026-07-04 — Payment route coverage added:** Dodo checkout and webhook tests now cover auth rejection, invalid packs, checkout payloads, signature rejection, idempotent token grants, and refund transaction rollback.
- **2026-07-04 — Safe checkout failure copy shipped:** Dodo checkout now fails closed for missing config and maps provider outages to retryable user copy; pricing UI coverage verifies raw provider details are not shown.
- **2026-07-04 — Webhook fail-closed handling shipped:** Dodo webhooks now return explicit not-configured and invalid-payload responses before touching payment/token storage, while preserving signature verification and transactional grant/refund behavior.
- **2026-07-04 — Payment edge-case hardening shipped:** Checkout now rejects malformed/non-string pack payloads before calling Dodo, and refund webhooks write a negative token ledger row in the same transaction as the balance deduction and payment status update.
- **2026-07-04 — Browser-runner API input hardening shipped:** Reviewed browser-check and guarded-submit routes now reject non-object payloads and invalid batch limits before invoking Browser Rendering work.
- **2026-07-04 — Apply-agent API input hardening shipped:** Queue create/status/retry and manual receipt routes now reject malformed bodies and invalid queue statuses before queue mutations.
- **2026-07-04 — Extension API input hardening shipped:** Extension save-job, tailor, packet, fill-receipt, and submission-receipt routes now reject malformed bodies and sanitize receipt fields before database work.
- **2026-07-04 — Extension CORS hardening shipped:** Extension API routes now share a single CORS helper that grants credentialed browser access only to `chrome-extension://` origins instead of combining wildcard origins with credentials.
- **2026-07-04 — Extension manifest provider coverage aligned:** The MV3 manifest host permissions now cover the shipped assisted-fill providers (Greenhouse, Lever, Workday, Ashby, Workable, Recruitee, Personio, SmartRecruiters) without broad all-site permissions, and tests lock the package boundary.
- **2026-07-04 — Extension setup surfaced in settings:** `/settings` now shows the Chrome extension package command, unpacked load path, production API base, supported ATS providers, and permission boundary so extension-first onboarding is visible without claiming Chrome Web Store distribution.
- **2026-07-04 — Internal Worker route guard shipped:** Cron and Email Routing internal routes now require the Worker-only internal header before database, email, or watch-runner work, so route handlers fail closed even outside the custom Worker fetch guard.
- **2026-07-04 — Discovery/settings body hardening shipped:** AI model discovery, job search, and recruiter reply ingest now reject invalid/non-object JSON before provider calls or database work.
- **2026-07-04 — Knowledgebase semantic fit shipped:** Signed-in fit scoring can ingest jobs into the shared Knowledgebase RAG service, show a zero-weight Semantic Similarity evidence dimension on individual fit-score cards, and use semantic resume-to-job similarity to order bulk scoring before AI scoring; if the service is unconfigured or unavailable, scoring falls back to the existing AI-only path.
- **2026-07-04 — Knowledgebase similarity contract verified:** The RolePatch client now targets the actual `knowledge-base` Worker legacy index API (`/v1/indexes/:id/ingest` + `/query`), caps semantic queries to the service top-k ceiling, widens single-job lookup to tolerate repeated ingests, and surfaces whether settings will use the `RAG_SERVICE` binding or HTTPS fallback.
- **2026-07-04 — Guest apply-agent coverage added:** localStorage tests now cover guest queue readiness, manual receipt recording, applied status updates, and retry blocking after submission.
- **2026-07-04 — Apply-agent auth boundary coverage added:** API route tests now prove signed-out queue, packet, and receipt reads/mutations return 401 before DB access.
- **2026-07-04 — Guest Add Job fallback e2e shipped:** Playwright now covers guest scrape failure → manual JD paste → saved local job → tailor page on desktop and mobile Chromium, with configurable e2e base URL/server command for isolated smoke runs.
- **2026-07-04 — Guest receipt e2e shipped:** Playwright now covers a ready guest apply-agent queue entry being marked submitted, producing a Lever receipt, updating local job/queue state, and surfacing the receipt in the command center on desktop and mobile Chromium.
- **2026-07-04 — Bulk queue management shipped:** Dashboard, HTTP API, CLI, and MCP can bulk-update queue statuses for reviewed workflow management without submitting applications.
- **2026-07-04 — Apply-agent retry recovery shipped:** Dashboard, HTTP API, CLI, and MCP can retry non-submitted queue entries by recomputing readiness while preserving failed/skipped receipt history.
- **2026-07-04 — Company watch run observability shipped:** Watch runs now persist and display source, found-count, and fallback/error metadata for career-page adapters and LinkedIn fallback.
- **2026-07-04 — Career-page watch adapters shipped:** Company watches now use career URLs first with Greenhouse, Lever, Ashby, Workable, Recruitee, Personio, and generic page parsing before falling back to LinkedIn search.
- **2026-07-04 — SmartRecruiters watch adapter shipped:** Company watches now use the public SmartRecruiters company postings API before falling back to generic page parsing or LinkedIn.
- **2026-07-04 — SmartRecruiters apply coverage shipped:** Extension host permissions, scrape/provider detection, settings coverage, and reviewed Browser Rendering checks now include SmartRecruiters without adding all-site access.
- **2026-07-04 — Campaign contact hints shipped:** Campaign next actions now extract recruiter/contact hints from job notes and show them on follow-up/interview actions.
- **2026-07-04 — Campaign action timing shipped:** Campaign next actions now show due-today, overdue, upcoming-interview, and inactive-duration timing labels.
- **2026-07-04 — Campaign contact search shipped:** Campaign next actions now include recruiter and hiring-manager search links for user-controlled contact discovery.
- **2026-07-04 — Apply mode gates shipped:** The command center now derives Review, Assisted Fill, Guarded Submit, and Unattended Apply gate states from queue safety, saved answers, and browser receipt evidence, keeping unattended apply visibly locked even when provider evidence is promising.
- **2026-07-04 — Safety preferences shipped:** The command center now exposes excluded-company preferences as a first-class safety control backed by profile answers, with edit/update support and guest localStorage parity.
- **2026-07-04 — Fit-threshold safety shipped:** The command center now exposes a configurable minimum fit score backed by profile answers, and guarded submit blockers use that saved threshold instead of a hidden fixed cutoff.
- **2026-07-04 — Daily guarded-submit cap shipped:** Safety preferences now expose a daily guarded-submit cap backed by profile answers; single submits stop when the cap is reached and batch guarded submit trims to the remaining daily allowance.
- **2026-07-04 — Server guarded-submit cap shipped:** The shared guarded-submit runner now enforces the daily cap for dashboard, HTTP API, CLI, and MCP entrypoints, and the submit API advertises the cap in guardrail metadata.
- **2026-07-04 — Server queue-safety guard shipped:** The shared guarded-submit runner now enforces required answers, excluded companies, duplicate ATS URLs, and minimum fit score before provider or browser work, so API/CLI/MCP cannot bypass dashboard safety review.
- **2026-07-04 — Proof project surface shipped:** `/proof` now frames TrueHire as a separate proof/credibility project under RolePatch, preserving the proof-first landing direction while connecting artifacts to evidence, packets, receipts, and recruiter replies.
- **2026-07-04 — TrueHire-style proof landing shipped:** `/proof` now uses the stronger TrueHire landing thesis: tailored resumes are cheap, source-backed work is harder to fake, and proof remains user-controlled until attached.
- **2026-07-04 — Proof UI polish shipped:** `/proof` now uses a product-grade proof-profile hero, cleaner app typography, and responsive first-viewport proof visuals; dashboard/jobs operational headings now use the app sans typography.
- **2026-07-04 — Product UI e2e verified:** Focused Playwright desktop/mobile coverage passed for dashboard job-search tips, Add Job, manual JD fallback, tailor page, manual receipts, and settings readiness after the UI polish pass.
- **2026-07-04 — Proof readiness shipped:** Achievement evidence now derives proof-packet readiness without new schema, flags missing claim/support fields, and keeps external verification explicitly unshipped while the TrueHire proof lane matures.
- **2026-07-04 — Proof packet preview shipped:** `/proof` now previews shareable and needs-cleanup proof items from existing achievement evidence with signed-in persistence and guest localStorage parity, keeping all artifacts private/user-provided until attached later.
- **2026-07-04 — Proof items in apply packets shipped:** Prepared application packets now include optional user-provided proof items from achievement evidence across dashboard, HTTP API, extension packet API, and guest localStorage packets.
- **2026-07-04 — Job-matched proof packets shipped:** Application packet proof items are now selected per job from role/JD overlap, so the TrueHire-style proof bridge favors relevant evidence instead of a generic global proof list.
- **2026-07-04 — TrueHire contract audit shipped:** The TrueHire repo, landing position, public profile/export routes, schema contracts, verification artifacts, and privacy boundaries are inventoried in the RolePatch proof pipeline.
- **2026-07-04 — TrueHire read-only proof preview shipped:** `/proof` can preview public TrueHire profile exports as RolePatch proof candidates through a no-persistence API/UI bridge, preserving the separate-project boundary.
- **2026-07-04 — TrueHire opt-in evidence import shipped:** `/proof` can import previewed TrueHire public-work and confirmed-work proof into RolePatch achievement evidence with guest localStorage and signed-in Cloudflare D1 paths, deduped by source and still private until reviewed.
- **2026-07-04 — TrueHire pipeline task recorded:** Symphony task `2d15f69c` now tracks the next non-destructive TrueHire proof-project milestone decision under the `resume-tailor` project.
- **2026-07-04 — Proof-aware receipts shipped:** Manual submission receipts now snapshot job-matched proof candidates available at review time across signed-in and guest flows, making proof context auditable without claiming automatic employer sharing.
- **2026-07-04 — Copyable proof packets shipped:** Apply-agent packets now expose a manual copy/export control for job-matched proof points with explicit no-auto-share boundary text, giving users an opt-in proof sharing path.
- **2026-07-04 — Proof source links shipped:** Packet proof items now preserve source URLs from imported evidence and include them in manual proof exports plus receipt snapshots.
- **2026-07-04 — Copyable proof profile shipped:** `/proof` can now copy a standalone proof-profile summary from shareable evidence, including source URLs and explicit no-auto-share boundary text.
- **2026-07-04 — Proof-aware recruiter drafts shipped:** Routed recruiter replies that explicitly ask for portfolio, proof, GitHub, examples, or references now add matched proof candidates to the editable suggested reply draft.
- **2026-07-10 — TrueHire role-fit JSON preview shipped:** The next proof-project milestone is role-fit JSON consumption. `/proof` can now read TrueHire's public `role-fit/report.json` for a pasted job description and render fit score, verified strengths, and gaps without importing, attaching, publishing, or sharing the report; TrueHire stays separate and the no-auto-share boundary remains explicit.
- **2026-07-04 — Proof deploy gates shipped:** The deploy route verifier and production smoke harness now include `/proof`, preventing the separate proof surface from drifting out of Cloudflare builds.
- **2026-07-04 — Final local verification passed:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, extension typecheck/build, `pnpm build`, `pnpm cf:build`, deploy-route verification, local public smoke, and focused desktop/mobile Playwright coverage passed for the current apply-agent/proof/UI slice.
- **2026-07-04 — Outbound recruiter reply send shipped:** Dashboard recruiter reply threads now have editable send controls backed by the fail-closed Resend adapter and durable sent/error metadata.
- **2026-07-04 — Reviewed extension submit shipped:** The Chrome extension can click the ATS submit button after explicit user confirmation, blocks CAPTCHA/upload/required-field risks, and records submitted or failed receipts.
- **2026-07-04 — User-selected file upload assist shipped:** Extension fill can attach popup-selected resume/CV and cover-letter files to matching ATS file inputs and record uploaded files in receipts.
- **2026-07-04 — Reviewed browser check shipped:** Signed-in queue entries can run a Cloudflare Browser Rendering backed form check that records an audit receipt and updates queue readiness without submitting.
- **2026-07-04 — Expanded extension ATS coverage shipped:** Extension scraping/fill context now covers Ashby, Workable, Recruitee, and Personio in addition to Greenhouse, Lever, Workday, LinkedIn, and generic pages.
- **2026-07-04 — Recruiter reply threading and drafts shipped:** Routed recruiter replies now store thread keys and suggested reply drafts, and the dashboard groups reply threads with copyable draft responses.
- **2026-07-04 — Extension failed-fill receipts shipped:** Failed assisted-fill attempts now create failed receipts with a retryable failure reason and mark the queue failed instead of disappearing.
- **2026-07-04 — Apply-agent MCP server shipped:** `pnpm apply-agent:mcp` exposes review-first queue, packet, status, and receipt tools over MCP stdio using the existing RolePatch session.
- **2026-07-04 — Apply-agent CLI shipped:** `pnpm apply-agent -- ...` wraps queue, packet, receipt, and status APIs for local agent/CLI workflows.
- **2026-07-04 — Apply-agent HTTP API shipped:** Session-authenticated queue, packet, receipt, and queue-status routes are available for local CLI/MCP adapters.
- **2026-07-04 — Provider-aware apply fill shipped:** Extension autofill uses provider-aware field context for Greenhouse, Lever, and Workday, handles radio/checkbox answers, fills cover-letter textareas, detects submit buttons, records file-upload checklist items, and captures user-triggered submitted confirmation receipts.
- **2026-07-03 — Recruiter reply routing shipped:** Dashboard exposes a per-user forwarding address; Cloudflare Email Routing ingest logs recruiter replies, creates alerts, and conservatively updates application status.
- **2026-07-03 — Company watchlists shipped:** Dashboard can save target-company watches, manually check them, and run active watches daily through Workers cron.
- **2026-07-03 — Apply-agent command center shipped:** Dashboard queue, readiness summary, packet drawer, profile-answer bank, manual receipts, extension packet API, and Chrome-assisted fill foundation shipped with guest parity.
- **2026-07-02** — Added global try/catch error handler to OpenNext worker (`worker.mjs`).
- **2026-06-12 — Application campaign CRM shipped:** Dashboard pipeline tracker with status funnel; inline status changes; follow-up/interview/offer metadata; `ApplicationCampaignTracker` + `JobDetailsModal`; `buildCampaignSummary()` metrics; overdue follow-up alerts; guest parity via localStorage; SQL migrations for campaign fields.
- **2026-06-12 — Achievement evidence intelligence shipped:** Structured evidence bank at `/evidence`; quality scoring (strong/usable/weak); job-aware ranking injected into tailor prompts; Cloudflare D1 table `achievement_evidence`; guest localStorage key `rt-achievement-evidence`; unit tests in `achievement-evidence.test.ts`.
- **2026-06-12 — Job discovery alerts shipped:** Saved job searches with pause/delete/re-run; shortlist with duplicate URL detection; in-dashboard alerts; Cloudflare D1 + guest parity; UI in `job-discovery.tsx`. Email notifications explicitly deferred.
- **Privacy PRD (Option B):** `get-a-job/` and `research/` paths untracked from repo; repository set private. Git history purge (Option A) explicitly parked.
- **Security audit:** Critical/high closed — guest data isolation, SSRF on scrape, payment webhook atomicity, success verification, AI model allowlist.

## Products

| Surface | URL |
| --- | --- |
| Primary app | `https://rolepatch.com` |
| WWW redirect route | `https://www.rolepatch.com/*` |
| Auth callback base | `BETTER_AUTH_URL=https://rolepatch.com` |
| AI gateway | `https://ai-gateway.sassmaker.com/v1` |

## Features (shipped)

### Architecture

- Browser (Next.js 16 App Router, React 19) → OpenNext → `worker.mjs` + ASSETS (`.open-next/assets`); signed-in persistence uses the D1 `DB` binding.
- Cloudflare Worker `resume-tailor`: server actions, `/api/jobs` routes, Browser Rendering binding (`BROWSER`) for PDF export.
- Cloudflare D1 + better-auth Google OAuth for signed-in users; guest flows use localStorage with signed-in sync.
- AI via `AI_BASE_URL` → free-ai-gateway; Dodo Payments for token checkout.
- Landing: Astro static hero and first-party `/changelog` via local
  `scripts/run-overlay-astro-landing.mjs`, overlaid during `cf:build` for fleet
  performance while keeping verified release history on the product domain.
- Job search runs natively in Worker — `src/lib/job-search.ts` queries LinkedIn public guest endpoint; `src/app/api/jobs/search/route.ts` exposes it to UI.

### Core product surfaces

- **Landing & marketing**: `/` Astro overlay hero; `/pricing`, `/blog`, `/badge/[slug]`, legal pages.
- **Resume editor**: `/editor/[id]` CodeMirror markdown editing with autosave.
- **Tailoring**: `/tailor/[jobId]` AI rewrite to match JD; fit scoring.
- **Cover letters**: `/cover-letter/[jobId]` with company research.
- **Interview prep**: `/interview-prep/[jobId]` STAR story generation.
- **Stash & settings**: `/stash`, `/settings`; settings includes safe operational readiness checks for Cloudflare/browser automation, email, payments, auth, and AI setup.
- **Tools hub**: `/tools/*` — ATS check, keywords, word count, bullet check, diff, snippets.
- **Dashboard**: `/dashboard` — campaign CRM + job discovery hub.
- **Proof project**: `/proof` — TrueHire-inspired credibility surface for evidence, packets, receipts, and recruiter replies.

### Auth & guest mode

- Guest mode via localStorage for full core flows; Google sign-in persists to Cloudflare D1.
- Guest data isolation fixes from security audit.
- Live production on `rolepatch.com`.

### AI & document handling

- AI via free-ai/OpenAI-compatible gateway with model allowlist (audit fix).
- AI provider, timeout, rate-limit, auth, and malformed-output failures are normalized into user-facing retry/settings messages across generation actions.
- AI model discovery validates request bodies before contacting configured OpenAI-compatible endpoints.
- Job URL scrape with SSRF validation, retry/fallback fetching, lightweight app-level rate limiting, and manual JD paste fallback from Add Job when a posting is unreadable or temporarily rate-limited.
- PDF export via Browser Rendering binding.
- Mammoth/marked/pdf-parse for document ingest paths.

### Payments

- Dodo checkout flow; webhook handled in transaction; success page verification (audit fixes).

### Job search (LinkedIn-only)

- Native Worker implementation in `src/lib/job-search.ts`.
- Public guest endpoint — former Python JobSpy sidecar removed (no Python on Workers).
- Guests can run live job search from dashboard discovery and save found roles into local tailoring drafts without signing in.
- `/jobs` is a standalone browse surface for search, shortlist, tailoring drafts, and reviewed apply-agent queueing.
- Quick-search presets help users start common searches without learning query syntax; they reuse the same LinkedIn-only Worker search endpoint.
- Job cards show lightweight, heuristic posting signals such as remote, visa, new-grad, senior, lead, and contract to support faster review before queueing.
- Signal filters narrow visible results and batch queueing to selected posting hints.
- Signed-in users can rank discovered jobs by Knowledgebase semantic similarity against the selected resume before queueing.
- Ranked cards show normalized semantic match percentages from Knowledgebase so users can see why the order changed.
- Semantic match thresholds narrow visible results and batch queueing to stronger resume matches after ranking.
- Ranked cards include lightweight overlapping resume/job terms as explainable match evidence.
- The semantic match panel can queue all unqueued 80%+ matches for reviewed apply prep without submitting applications.
- Apply-agent queue rows preserve and display semantic discovery context when jobs are queued from resume-ranked discovery.
- Apply-agent queue rows render semantic discovery context as a score badge plus evidence terms for faster review.
- Jobs queued from discovery alerts preserve source/location context and render it as a queue badge for review.
- Queue notes merge semantic and alert context without dropping either source when the same tracked job is touched by multiple discovery flows.
- Apply-agent discovery alerts can be imported to the reviewed queue in a single batch action; duplicate/already queued URLs are skipped before queueing.
- Weekly digest emails include apply-agent progress recaps from queue and receipt activity, not only fresh saved-search matches.
- Search result cards can queue found jobs for reviewed apply-agent preparation without first opening the tailor flow.
- Discovery includes a visible-results batch queue action for reviewed packet prep; duplicate tracking URLs are deduped, queued matches are marked locally to prevent repeat clicks, and users get a queued-count confirmation.
- API search failures return user-safe guidance for rate limits, timeouts, and temporary upstream outages.
- Job-search requests validate object-shaped request bodies before LinkedIn guest-endpoint calls.
- Scope intentionally LinkedIn-only; no multi-board crawler.

### Application campaign CRM (2026-06-12)

- Dashboard pipeline tracker with status funnel: draft → tailored → applied → interview → offer → rejected.
- Inline status changes; follow-up/interview/offer metadata on applications.
- `ApplicationCampaignTracker` + `JobDetailsModal` for notes and reminders.
- `buildCampaignSummary()` metrics: weekly target progress, follow-ups due, stale drafts, response rate, next actions.
- Next actions extract recruiter/contact hints from notes, including email, LinkedIn URL, or labeled recruiter/contact/interviewer fields.
- Next actions show timing context for due follow-ups, overdue follow-ups, upcoming interviews, and inactive draft/tailored roles.
- Next actions include user-controlled recruiter and hiring-manager search links scoped to the company/role.
- Overdue follow-up alerts in dashboard.
- **Guest parity**: CRM fields stored in localStorage for unsigned users.
- Tables/migrations for application campaign fields in Cloudflare D1.

### Achievement evidence intelligence (2026-06-12)

- Structured evidence bank at `/evidence` (`AchievementEvidenceBank` component).
- Quality scoring: **strong / usable / weak** via `scoreEvidenceQuality()` (metrics, outcomes, scope).
- Job-aware ranking via `rankEvidenceForRole()` / `rankEvidenceForJob()` injected into tailor prompts (`tailor-action.ts`).
- Reusable formatted bullets for resume and interview prep surfaces.
- `/proof` frames TrueHire as a separate proof/credibility project under RolePatch, preserving the landing-page direction while tying verified artifacts to evidence, apply packets, receipts, and recruiter replies.
- Evidence cards derive proof-packet readiness from existing fields, showing proof-ready, packet-ready, needs-support, and needs-claim states without claiming external verification.
- `/proof` previews shareable proof packet items and needs-cleanup items from signed-in evidence or guest localStorage evidence without publishing them.
- Prepared application packets include optional proof items derived from proof-ready evidence, and the dashboard packet drawer links back to `/proof` for review before any employer sharing.
- Cloudflare D1 table `achievement_evidence`; guest localStorage key `rt-achievement-evidence`.
- Unit tests in `achievement-evidence.test.ts`.

### Job discovery alerts (2026-06-12, expanded 2026-07-03)

- Saved job searches with pause, delete, and manual re-run.
- Guest saved searches, shortlists, and discovered-job tailoring drafts persist locally; signed-in users get synced persistence.
- Company watchlists with pause, delete, manual check, and hourly Worker cron.
- Career URL watches prefer Greenhouse, Lever, Ashby, Workable, Recruitee, Personio, and SmartRecruiters public feeds/APIs, then a generic HTML parser for custom career pages, and fall back to LinkedIn search when no career jobs are found.
- Each company watch records and displays the last run source (`greenhouse`, `lever`, `ashby`, `workable`, `recruitee`, `personio`, `smartrecruiters`, `career_page`, `linkedin`, or `linkedin_fallback`), found count, and adapter error when fallback is needed.
- Dashboard discovery summarizes active saved searches and company watches, unseen alert volume, latest watch yield, fallback/source health, and a source-decision recommendation so expansion decisions can use product evidence.
- Shortlist with duplicate URL detection.
- In-dashboard alerts for new saved-search and company-watch matches.
- Persistence: `saved_job_searches`, `company_watches`, `saved_job_shortlist`, `job_discovery_alerts` (Cloudflare D1 + guest parity). `company_watches` includes `last_source`, `last_found_count`, and `last_error`.
- UI: `job-discovery.tsx` component on dashboard.
- Weekly digest scaffolding exists through Workers cron and Resend; it fails closed when `RESEND_API_KEY` is unset.
- `worker.mjs` dispatches scheduled company-watch and weekly-digest runs to internal routes when production cron triggers are provisioned.
- `/settings` surfaces whether email sending and Dodo payment config are present, whether the Browser Rendering binding is visible at runtime, and which Cloudflare setup steps remain.
- **Not shipped**: broad/scaled career-page crawling claims, deep ATS-specific company adapters beyond Greenhouse/Lever/Ashby/Workable/Recruitee/Personio/generic parsing, production Email Routing/Resend setup.

### Apply agent foundation (2026-07-03/04)

- Persisted `application_queue`, `application_receipts`, and `profile_answers` tables.
- Shared TypeScript contracts for queue entries, readiness, receipts, profile answers, and prepared application packets.
- Dashboard command center includes match feed, queue filters, readiness refresh, packet drawer, profile-answer form, manual receipt capture, and bulk queue status updates.
- Prepared application packets can include optional user-provided proof items from the evidence bank for review alongside resume, cover letter, profile answers, and receipts.
- Dashboard discovery cards can add found jobs directly to the reviewed apply-agent queue while preserving duplicate URL reuse.
- Queue rows show an explicit materials checklist for base resume, tailored resume, cover letter, profile answers, and receipt readiness.
- Saved-search and company-watch alerts with job URLs surface in the command center and can create tracked draft applications plus queue entries.
- Dashboard automation health summarizes browser-runner receipts, guarded-submit success, provider outcomes, and top failure-code blockers.
- Provider evidence summarizes success/block rates and recommends whether to collect more receipts, fix blockers, or consider deeper provider automation.
- Apply mode gates summarize which workflow modes are live, ready, blocked, collecting evidence, or locked based on queue safety, saved profile answers, and browser receipts; unattended apply remains locked even when a provider has candidate evidence for deeper design.
- Safety preferences surface excluded-company controls directly in the command center; edits update the underlying profile answer in signed-in and guest modes, and matching queued companies remain blocked from guarded submit.
- Minimum fit score is a visible safety preference; queue rows block guarded submit below the saved threshold, defaulting to 70 when no threshold answer exists.
- Daily guarded-submit cap is a visible safety preference; the command center counts same-day guarded-submit receipts, blocks single submit at the cap, and limits batch guarded submit to the remaining allowance.
- The shared guarded-submit runner enforces the daily cap server-side across dashboard actions, HTTP API, CLI, and MCP. Batch selection is trimmed before browser work starts, and cap-reached calls fail before queue lookup.
- The shared guarded-submit runner also enforces queue safety server-side: required work-auth/sponsorship answers, excluded-company preferences, duplicate normalized ATS URLs, and minimum fit score all stop guarded submit before provider or browser work.
- Missing required field blockers from guarded browser receipts become profile-answer prompts that can prefill the answer form before retry.
- Queue and packet receipts summarize answered/skipped fields, uploaded files, outstanding manual uploads, blockers, and confirmation capture.
- Queue receipts can expand to show exact captured field labels, values, and sources, giving users a Tsenta-style audit trail for submitted or attempted applications.
- Queue receipts can copy a portable audit summary containing job context, provider/status, confirmation evidence, and captured fields.
- Repeated receipt attempts render as a newest-first queue timeline for reviewable retry history.
- Queue rows surface safety review blockers for excluded companies saved in profile answers, duplicate normalized ATS URLs, and fit scores below 70; guarded submit refuses those entries until reviewed.
- Queue rows also block guarded submit until work-authorization and sponsorship answer categories are present, so sensitive eligibility fields are not guessed.
- Required-answer safety blockers include action buttons that prefill the profile-answer form for the missing category.
- Command center queue safety summary shows blocked entries, warning count, and clean entries before row-level review.
- Queue rows also warn when another submitted-stage role already exists at the same company, so users can review company history before submitting another application.
- Guest parity for queue, packets, profile answers, manual receipts, and bulk queue status updates through localStorage.
- Extension packet API at `/api/extension/apply-packet` returns the current user's prepared packet for a tracked ATS URL.
- Extension API routes validate object-shaped request bodies and normalize receipt fields before creating jobs, returning packets, or writing application receipts.
- Extension API CORS reflects Chrome extension origins only; arbitrary web origins are not granted credentialed browser access.
- Chrome extension assisted fill can fill matched empty fields from saved profile answers/materials after explicit user action.
- Chrome extension assisted fill can attach user-selected resume/CV and cover-letter files to matching file inputs; receipts record uploaded files separately from remaining manual upload fields.
- Provider-aware scrape/fill context for Greenhouse, Lever, Workday, Ashby, Workable, Recruitee, Personio, SmartRecruiters, LinkedIn scrape, and generic fallback for other ATS pages.
- Fill receipts capture exact field labels/answers, detected provider, submit-button presence, and manual file-upload checklist items, then leave queued items ready for review/submission.
- Failed extension fills create `failed` receipts with failure reasons and mark the queue failed for retry/review.
- User-triggered confirmation capture records a `submitted` receipt after the user manually submits the ATS form.
- Reviewed extension submit can click the detected ATS submit button only after explicit user confirmation and preflight checks for CAPTCHA/human verification, unfilled required fields, outstanding file uploads, and submit-button presence.
- Reviewed submit records a `submitted` receipt only when confirmation text/URL is detected; ambiguous submit attempts create `failed` receipts and do not mark the job applied.
- HTTP API routes under `/api/apply-agent/*` expose queue, packet, receipt, single-status, and bulk-status contracts.
- Apply-agent HTTP mutations validate object-shaped request bodies, queue statuses, retry actions, and receipt inputs before invoking queue or receipt writes.
- Local CLI wrapper `pnpm apply-agent -- ...` and MCP stdio server `pnpm apply-agent:mcp` expose the same review-first contracts.
- Reviewed browser check uses Cloudflare Browser Rendering when available, falls back to HTML inspection locally, records an audit receipt, and updates the queue to `ready_to_submit`, `needs_user`, or `failed`.
- **Not shipped**: unattended submit, unattended file upload automation, captcha bypass, provider-specific headless submit runners, bulk unattended apply.

### Recruiter reply routing (2026-07-03)

- Dashboard exposes a per-user `reply+...@rolepatch.com` forwarding address.
- Cloudflare Worker `email()` ingests inbound recruiter replies and routes them to `/api/internal/email/recruiter-reply`.
- `worker.mjs` blocks ordinary external requests to `/api/internal/*`; scheduled/email handlers call those routes through OpenNext with an internal Worker header.
- Internal cron and recruiter-reply routes also require the Worker-only internal header at the route handler before doing database, email, or watch-runner work.
- Recruiter reply ingest validates object-shaped payloads before routing messages or writing events.
- `/settings` lists Worker hooks as code-ready and keeps production cron/Email Routing activation as an explicit operator step.
- Ingest logs routed events, creates dashboard alerts, and updates interview/offer/rejection status only on confident tracked-application matches.
- Routed replies store thread keys and deterministic suggested reply drafts; dashboard groups threads and exposes copyable replies.
- Dashboard reply threads can send editable suggested replies through the existing Resend adapter. Sends fail closed when `RESEND_API_KEY` is unset and persist sent/error metadata on the routed reply event.
- Suggested reply drafts include matched proof candidates only when the recruiter explicitly asks for proof, examples, GitHub, portfolio, references, or verification; the draft remains editable and is not sent automatically.
- **Not shipped**: mailbox sync and production Email Routing/Resend rule setup.

## Work queue

Open work is tracked only in [GitHub Issues](https://github.com/sarthakagrawal927/rolepatch/issues).
An open issue is a to-do, a linked pull request is in progress, and merge plus
issue closure makes the work done.


## 2026-09-07 — Transparent keyword feedback

The public keyword checker now displays the rounded matched/extracted keyword
fraction, with an explicit empty-extraction state, literal-substring limitations
and no claim to predict employer decisions. Its explanatory FAQ matches this
unweighted calculation. Editing either input clears stale results.

Existing account/dashboard and shared scores retain their stored weighted
calculation, but the score detail and public share page identify the RolePatch
heuristic and its 70/30 repeated/other-term weighting. This avoids rewriting
historical scores as coverage percentages. Suggested edits must reflect actual
experience; automatic gap-fixing promises were removed from the checker.

The first validation pass completed 448 tests, lint and typecheck; final checks
cover the additional badge copy as well. Deployment and guest/account runtime
qualification remain outstanding. No account data or production settings changed.
