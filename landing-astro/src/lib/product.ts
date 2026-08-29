export const PRODUCT_TITLE = 'RolePatch — Evidence-bound resume tailoring';

export const PRODUCT_DESCRIPTION =
  'Tailor a resume to one job using claims supported by your experience, then review every proposed change before it becomes part of the application.';

export const TOKEN_PACKS = [
  { tokens: 10, price: '$5' },
  { tokens: 30, price: '$12' },
  { tokens: 100, price: '$30' },
] as const;

export const PRODUCT_FAQS = [
  {
    q: 'What is RolePatch?',
    a: 'RolePatch is a web app for preparing a serious application to a specific job. It reads the job description, matches its requirements against your resume and saved evidence, proposes a tailored resume patch, and shows the changes for review. Cover letters, fit analysis, interview stories, and application packets stay tied to the same role.',
  },
  {
    q: 'Can RolePatch invent a stronger achievement for me?',
    a: 'No. The tailoring instruction explicitly forbids invented skills, tools, employers, scope, metrics, or accomplishments. RolePatch may reframe, reorder, and emphasize facts already present in the resume, project stash, or achievement evidence. If a job requirement is unsupported, the correct result is a visible gap—not a fabricated claim.',
  },
  {
    q: 'Can I use RolePatch without signing in?',
    a: 'Yes. Guest mode keeps resumes, jobs, tailored drafts, evidence, and application metadata in the current browser. The current guest tailoring path can call the configured AI route without debiting account tokens. Google sign-in adds D1-backed persistence and cross-device account use; clearing browser storage can remove guest data.',
  },
  {
    q: 'What is free, and what uses tokens?',
    a: 'The public ATS, keyword, bullet, diff, snippets, and word-count tools work without sign-up. Signed-in accounts start with three tokens. Tailoring, cover letters, fit scoring, interview prep, outreach drafts, and bulk fit scoring debit tokens; packs are implemented at 10 for $5, 30 for $12, and 100 for $30, with no subscription.',
  },
  {
    q: 'Does RolePatch automatically apply to jobs?',
    a: 'No. RolePatch is review-first by architecture. It can queue a job, prepare a packet, run reviewed browser checks, and fill supported ATS fields after a user action. CAPTCHA, missing required fields, outstanding file uploads, and ambiguous submit states stop the flow and create a blocked or failed receipt instead of an unattended submission.',
  },
  {
    q: 'What does the Chrome extension do?',
    a: 'On supported ATS pages, the extension can save a job, open its tailoring flow, retrieve a reviewed application packet, fill visible fields after a user click, and capture fill or submission receipts. A file is used only when the user explicitly selects it, and the extension does not bypass CAPTCHA.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Guest records stay in localStorage in the current browser except when a requested AI operation needs server processing. Signed-in records use the user-scoped Cloudflare D1 path. Payment checkout uses Dodo Payments when provider configuration is available, and product analytics uses PostHog under the published privacy policy.',
  },
  {
    q: 'What is the current product state?',
    a: 'RolePatch is a live, maintained web product. Its maker is not currently job hunting, so owner-led validation against new real applications is paused. The app and token-pack checkout code are implemented, but this landing audit does not claim an independently completed live purchase or broad outcome study.',
  },
] as const;
