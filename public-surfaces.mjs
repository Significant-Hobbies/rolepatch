/**
 * Public RolePatch pages that belong in both the HTML sitemap and the
 * agent-readable catalog. Keep private, authenticated, and user-specific
 * routes out of this list.
 */
export const PUBLIC_SURFACES = [
  {
    id: 'home',
    path: '/',
    title: 'RolePatch',
    description:
      'AI-assisted resume tailoring and a review-first job application workflow with visible diffs, fit evidence, and submission receipts.',
    details: [
      'Tailor a base resume to a specific job description.',
      'Review proposed resume changes in a word-level diff before accepting them.',
      'Prepare cover letters, interview stories, and reviewed application packets.',
    ],
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    id: 'jobs',
    path: '/jobs',
    title: 'Browse jobs',
    description:
      'Browse observed job openings, search for live roles, save promising matches, and queue jobs for reviewed application preparation.',
    details: [
      'The public feed shows recently observed roles and their source links.',
      'Guest users can search, shortlist, and queue jobs using browser storage.',
      'Queueing prepares a job for review; it does not submit an application.',
    ],
    changeFrequency: 'hourly',
    priority: 0.95,
  },
  {
    id: 'pricing',
    path: '/pricing',
    title: 'RolePatch pricing',
    description:
      'Review RolePatch token options and the product capabilities available before purchasing AI-assisted work.',
    details: [
      'Free tools do not require a token purchase.',
      'Paid tokens are used for AI-assisted generation such as resume tailoring.',
      'Application review and user approval remain part of the workflow.',
    ],
    changeFrequency: 'monthly',
    priority: 0.95,
  },
  {
    id: 'proof',
    path: '/proof',
    title: 'Proof project',
    description:
      'Build a user-controlled proof packet from quantified achievements and source-backed work for a specific application.',
    details: [
      'Proof candidates come from achievement evidence the user provides or imports.',
      'RolePatch can match proof items to a job and include them in a reviewed packet.',
      'Proof is not attached, published, or shared automatically.',
    ],
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    id: 'evidence',
    path: '/evidence',
    title: 'Achievement evidence bank',
    description:
      'Store reusable, quantified achievement evidence for resumes, cover letters, interview stories, and recruiter replies.',
    details: [
      'Evidence records capture a situation, action, result, metric, scope, and relevant skills.',
      'Guest records stay in the browser; signed-in records use the user account.',
      'Readiness checks distinguish reusable claims from proof that still needs support.',
    ],
    changeFrequency: 'monthly',
    priority: 0.85,
  },
  {
    id: 'tools',
    path: '/tools',
    title: 'Free resume tools',
    description:
      'Use RolePatch resume utilities for keyword matching, text comparison, ATS formatting, bullet quality, word counts, and reusable snippets.',
    details: [
      'The public tools work without creating an account.',
      'Text analysis and snippet storage run in the browser.',
      'Each tool explains what it measures and the limits of its result.',
    ],
    changeFrequency: 'weekly',
    priority: 0.95,
  },
  {
    id: 'resume-diff',
    path: '/tools/diff',
    title: 'Resume diff tool',
    description:
      'Compare two resume drafts word by word in split or inline views without uploading the text.',
    details: [
      'Paste an original draft and a revised draft.',
      'See additions and removals highlighted at word level.',
      'The comparison runs locally in the browser.',
    ],
    changeFrequency: 'monthly',
    priority: 0.85,
  },
  {
    id: 'keyword-checker',
    path: '/tools/keywords',
    title: 'ATS keyword checker',
    description:
      'Compare a resume with a job description to see a keyword match score, matched terms, and missing terms.',
    details: [
      'The checker extracts useful single-word and two-word terms from the job description.',
      'Repeated job-description terms receive more weight in the score.',
      'Both texts are processed locally in the browser.',
    ],
    changeFrequency: 'monthly',
    priority: 0.85,
  },
  {
    id: 'ats-checker',
    path: '/tools/ats-check',
    title: 'Free ATS resume checker',
    description:
      'Check seven resume structure and formatting signals for free in your browser with no sign-up, upload, or network request.',
    details: [
      'The documented heuristics cover length, sections, contact details, bullets, dates, quantified outcomes, and table-like rows.',
      'Every warning and failure is visible; the score is not a prediction from a particular employer ATS.',
      'The check runs locally and does not upload the resume or require an account.',
    ],
    changeFrequency: 'monthly',
    priority: 0.85,
  },
  {
    id: 'bullet-checker',
    path: '/tools/bullet-check',
    title: 'Resume bullet strength checker',
    description:
      'Grade resume bullets for action verbs, quantified outcomes, readable length, tense, and first-person wording.',
    details: [
      'Each bullet receives a score from five documented checks.',
      'The page reports both per-bullet findings and an overall average.',
      'The analysis runs locally in the browser.',
    ],
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    id: 'word-count',
    path: '/tools/word-count',
    title: 'Resume word count',
    description:
      'Count words, characters, lines, sentences, paragraphs, and bullets, then estimate recruiter skim time.',
    details: [
      'The tool accepts resumes, cover letters, and other plain text.',
      'Skim time uses a documented words-per-minute estimate.',
      'The analysis runs locally in the browser.',
    ],
    changeFrequency: 'monthly',
    priority: 0.75,
  },
  {
    id: 'snippets',
    path: '/tools/snippets',
    title: 'Resume snippet library',
    description:
      'Save reusable accomplishment bullets and cover-letter paragraphs in the current browser.',
    details: [
      'Create, edit, copy, and delete titled text snippets.',
      'Snippets use browser localStorage and do not sync between devices.',
      'Clearing browser storage removes the saved snippets.',
    ],
    changeFrequency: 'monthly',
    priority: 0.75,
  },
  {
    id: 'blog',
    path: '/blog',
    title: 'RolePatch blog',
    description:
      'Read RolePatch guides about resume tailoring, ATS scores, resume keywords, and job-search preparation.',
    details: [
      'Articles are available as public HTML without an account.',
      'The blog also publishes an RSS feed.',
      'Product claims remain subject to the review-first workflow described on the main site.',
    ],
    changeFrequency: 'weekly',
    priority: 0.85,
  },
  {
    id: 'tailored-resumes-article',
    path: '/blog/why-tailoring-resume-matters',
    title: 'Why tailoring a resume matters',
    description:
      'A practical guide to keyword alignment, resume prioritization, bullet tuning, and reviewing AI-assisted changes.',
    details: [
      'Explains how applicant tracking systems use job-description terms.',
      'Separates useful tailoring from rewriting an entire resume.',
      'Recommends reviewing every AI-assisted change before using it.',
    ],
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    id: 'ats-score-article',
    path: '/blog/ats-score-explained',
    title: 'ATS scores and metrics explained',
    description:
      'A practical guide to resume match scores, parsing and coverage metrics, and the limits of universal ATS thresholds.',
    details: [
      'Separates candidate resume-match scores from employer recruiting metrics.',
      'Explains that there is no universal ATS score or pass threshold.',
      'Links to the free RolePatch keyword checker.',
    ],
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    id: 'resume-keywords-article',
    path: '/blog/resume-keywords-guide',
    title: 'Guide to resume keywords',
    description:
      'A guide to hard skills, action verbs, filler language, and finding relevant terms in a job description.',
    details: [
      'Distinguishes hard skills, soft skills, and action verbs.',
      'Explains how to identify repeated and role-specific terms.',
      'Recommends using only keywords supported by real experience.',
    ],
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    id: 'faq',
    path: '/faq',
    title: 'RolePatch frequently asked questions',
    description:
      'Answers about resume tailoring, fit scores, cover letters, interview preparation, editing, and the reviewed apply workflow.',
    details: [
      'Answers describe what RolePatch does and how each workflow starts.',
      'The page covers guest use, saved resume versions, and review controls.',
      'The answers do not claim unattended application submission.',
    ],
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    id: 'changelog',
    path: '/changelog',
    title: 'RolePatch changelog',
    description:
      'Read verified RolePatch product updates and follow planned work through the public GitHub issue tracker.',
    details: [
      'Entries describe shipped changes and why they matter.',
      'The roadmap links to open GitHub issues.',
      'The source link points to the canonical RolePatch repository.',
    ],
    changeFrequency: 'weekly',
    priority: 0.75,
  },
  {
    id: 'privacy',
    path: '/privacy',
    title: 'RolePatch privacy policy',
    description:
      'Read how RolePatch handles account data, resume content, job descriptions, payments, guest storage, and deletion requests.',
    details: [
      'Guest data is stored in the current browser except when a requested AI operation needs processing.',
      'Signed-in product data uses the services named in the policy.',
      'The policy provides a contact for privacy questions.',
    ],
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    id: 'terms',
    path: '/terms',
    title: 'RolePatch terms of service',
    description:
      'Read the service, payment, content ownership, AI-output, acceptable-use, availability, and contact terms for RolePatch.',
    details: [
      'Users remain responsible for reviewing AI-assisted output.',
      'Users retain ownership of their resume content.',
      'The terms prohibit fraudulent or misleading applications.',
    ],
    changeFrequency: 'yearly',
    priority: 0.3,
  },
];

export function markdownPathForSurface(path) {
  return path === '/' ? '/index.md' : `${path}.md`;
}

export function renderSurfaceMarkdown(surface, origin = 'https://rolepatch.com') {
  const pageUrl = new URL(surface.path, origin).toString();
  const details = surface.details.map((detail) => `- ${detail}`).join('\n');
  return `# ${surface.title}

${surface.description}

## What this page provides

${details}

## Public page

- ${pageUrl}
`;
}
