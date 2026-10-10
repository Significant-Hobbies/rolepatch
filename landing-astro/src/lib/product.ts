export const PRODUCT_DESCRIPTION =
  'Tailor a resume to one job using claims supported by your experience, then review every proposed change before it becomes part of the application.';

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

export const productJsonLd = (siteUrl: string) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: 'RolePatch',
      alternateName: ['Role Patch', 'rolepatch.com'],
      url: siteUrl,
      description: PRODUCT_DESCRIPTION,
    },
    {
      '@type': 'SoftwareApplication',
      name: 'RolePatch',
      alternateName: ['Role Patch', 'rolepatch.com'],
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: siteUrl,
      description: PRODUCT_DESCRIPTION,
      audience: {
        '@type': 'Audience',
        audienceType: 'Job seekers preparing a serious application for a specific role',
      },
      offers: [
        {
          '@type': 'Offer',
          name: 'Browser-local resume tools',
          price: '0',
          priceCurrency: 'USD',
          description: 'ATS, keyword, bullet, diff, snippets, and word-count tools without sign-up.',
        },
        { '@type': 'Offer', name: '10 AI tokens', price: '5', priceCurrency: 'USD' },
        { '@type': 'Offer', name: '30 AI tokens', price: '12', priceCurrency: 'USD' },
        { '@type': 'Offer', name: '100 AI tokens', price: '30', priceCurrency: 'USD' },
      ],
      featureList: [
        'Evidence-bound resume tailoring',
        'Word-level change review',
        'Job fit analysis',
        'Cover letters and interview stories',
        'Review-first application packets and receipts',
      ],
    },
  ],
});

// Inline scripts shared by the Astro layout and the UI-library home page.
export const APP_HEALTH_CLICK_SCRIPT = `
document.addEventListener('click', function (event) {
  var target = event.target;
  var control = target && target.closest ? target.closest('[data-app-health-event]') : null;
  var name = control && control.getAttribute('data-app-health-event');
  if (name && window.appHealth && typeof window.appHealth.track === 'function') {
    window.appHealth.track(name);
  }
});
`;

export const REDIRECT_AUTHENTICATED_SCRIPT = `
(function () {
  var c = document.cookie;
  if (
    c.indexOf('better-auth.session_token') !== -1 ||
    c.indexOf('__Secure-better-auth.session_token') !== -1
  ) {
    location.replace('/dashboard');
  }
})();
`;
