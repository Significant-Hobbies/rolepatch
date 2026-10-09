# RolePatch design system

## Current app direction — 9 October

The owner selected **Official shadcn Inset workspace**, option 1: “One is fine.”
Resume Builder and Jobs use the official New York component styles, Zinc semantic
tokens and Geist. Preserve upstream control appearance, accessible Radix behavior,
responsive inset sidebar, section forms and the Jobs history table. Settings stay
inside the account menu; pricing is contextual. Master wording, Always include,
education, complete projects and exact saved resumes retain their existing meaning.

The Precision Studio landing and frozen footer remain unchanged. The shared Geist
font, RolePatch identity and resume/job vocabulary connect the surfaces. Workspace
tokens are scoped so app styling cannot recolor the footer. This selection replaces
older app framing and heading-font corrections below; those records remain
historical. Direction approval is not acceptance of the finished render.

Master details and achievements read as content until Edit is selected. Focused
edits stay local until Done, with Cancel preserving the original; Save persists
the complete master. New Resume asks for Personal, Experience, Projects, Education
and Skills separately, with individual achievement inputs and draft saving.

The top-right appearance control offers Light, Dark and System. The preference
persists in this browser, System follows device changes, and scoped official Zinc
tokens reach portaled controls. Resume paper, landing and footer keep their colors.

Receipt: `.fleet/design-review-shadcn-official-20261008.json`.

## Selected landing direction (historical approval)

**Precision Studio**, selected by the owner on 2026-10-07: “Let's go with two.”
The earlier Resume Studio implementation was rejected as insufficiently premium.
The new selection covers the entire Astro landing body and primary React resume
workspace. The existing footer is a frozen boundary, including its inherited
shared stylesheet and layout configuration.

Decision and paired previews: `.fleet/design-review-premium-20261007.json`.
The earlier `.fleet/design-review-resume-first-20261007.json` remains historical.

## Product purpose

RolePatch tailors a resume and supporting application material to the evidence
and language of a specific job. Lead with the resume, job and reviewable patch.
Do not turn the page into a generic career dashboard or claim hiring outcomes.

## Visual system

- Geist display and interface typography, already used by Next.js. The Astro
  page self-hosts the same Latin font with its SIL Open Font License. Resume
  specimens retain document typography; real previews use the existing formatter.
- Graphite actions and text, off-white page, neutral working canvas, fine gray
  dividers. Green marks mean source-grounded illustrative edits, not success.
- A 1232px landing/workspace boundary, 8px spacing rhythm, restrained 5px controls
  and a three-pane job/source/draft artifact anchor the system.
- The centered proposition leads into a substantive working canvas. A dark
  redline interlude changes the page rhythm; horizontal method rows, ruled file
  inventory and access ledger carry the direction through the full page.
- Keep the established arrow mark in landing/app navigation to match the frozen
  footer identity. The paper relationship belongs in the artifact itself.
- Scope styles to `.precision-surface`, `.precision-app` and `.precision-app-nav`.
  Do not change global footer tokens or styles to apply this direction.

## Behavior and responsive composition

Retain project-native links, disclosures, menus, import, job entry, resume
selection, generation, comparison/editing, explanation, persistence and export.
The React workspace shows the actual selected job and base resume; draft and
original labels must reflect real state. No successful AI result is fabricated.

At compact widths the landing specimen prioritizes the tailored document; the
actual workspace keeps source/job context behind an accessible toggle. Tablet
reviews put explanation notes below the paper. Desktop gives source context,
working paper and explanations distinct columns. All core actions remain usable.

## Product truth

- Every marketing job, source resume and patch is explicitly illustrative.
- Preserve supplied facts; review all proposed claims. Unsupported requirements
  stay gaps, never invented experience.
- Export Markdown, HTML or Word-compatible `.doc`; browser printing provides PDF.
- Guest records stay in this browser; account persistence and token-funded AI
  are distinct. Clearing browser storage removes guest records.
- Apply-agent remains review-first. MCP resume tools return drafts; they do not
  submit applications. See the [MCP runbook](docs/operations/runbooks/resume-mcp.md).

## Review evidence

Pinned slop scans are advisory. Centered software typography, document section
labels and numbered steps are deliberate choices, qualified by actual rendered
review. Direction approval is distinct from acceptance of the finished result.
The premium receipt records responsive, comprehension, continuity and check evidence.

## Owner acceptance and preservation

The owner approved the finished Precision Studio render, then confirmed:
“ok better quality, just ensure its as is”. Preserve the approved layout,
typography, colors, spacing, responsive composition and footer. Future functional
work should fit this system; visual redesign requires a new explicit direction.
Acceptance is recorded in `.fleet/design-review-premium-20261007.json`.


## Bounded readability pass — 7 October

Following the owner's correction ("why the hell are u redesigning?") and request
("just try to use it, and we need better colors and fonts"), preserve Precision
Studio's composition. The abandoned temporary directions are not product routes.

The app now uses self-hosted, SIL-licensed Space Grotesk for headings and Geist
for interface/reading text. Graphite actions, darker helper text, forest success,
slate-blue informational and ochre warning text replace faint legacy treatments.
Micro-labels have a 12px floor. Scope these corrections to app main content and
the editor toolbar; resume paper, Astro sources and footer remain untouched.
Keep document formatting controlled by the existing formatter.

Actual guest form use qualifies experience/evidence saves, resume edit/reload,
Markdown export, pasted-job creation and interview preparation navigation.
Plain Next preview generation fails at the unavailable AI runtime; this is an
explicit qualification limit, not a successful draft. Preserve the review-first
application boundary and never turn a keyword score into a hiring claim.

Receipt: `.fleet/design-review-readability-preserve-20261007.json`.
