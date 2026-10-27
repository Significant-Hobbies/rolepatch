const endpoints = [
  ['/api/ai', 'JSON catalog of every public HTML surface and same-origin Markdown alternate.'],
  [
    '/api/public/v1/surfaces/{id}',
    'Versioned JSON lookup for one catalog surface. This link uses the home surface as a working example; an unknown id returns a typed problem response.',
    '/api/public/v1/surfaces/home',
  ],
  [
    '/llms.txt',
    'Compact product guidance, best-fit use cases, boundaries, access, and discovery links.',
  ],
  ['/llms-full.txt', 'Expanded product brief for agents that need the full product contract.'],
  [
    '/index.md',
    'Canonical Markdown explanation of product purpose, evidence rules, access, and state.',
  ],
  ['/openapi.json', 'OpenAPI 3.1 description of these read-only discovery routes.'],
  ['/sitemap.xml', 'Canonical public route inventory for crawlers.'],
] as const;
export function PublicDocs() {
  'use no memo';
  return (
    <main>
      <section className="page-hero paper-grid">
        <div className="site-shell">
          <p className="section-label">Public discovery interface</p>
          <h1>Read the product contract. Do not automate the applicant.</h1>
          <p>
            RolePatch publishes a small, unauthenticated, read-only interface so agents can discover
            the product and understand its limits. Resume tailoring and application actions remain
            inside the reviewed user workflow.
          </p>
        </div>
      </section>

      <section className="page-section">
        <div className="site-shell docs-layout">
          <div className="docs-intro">
            <p className="section-label">Endpoints</p>
            <h2>Seven public routes. No mutation API.</h2>
            <p>
              Use GET or HEAD. These routes require no token or account. They describe RolePatch;
              they do not accept a resume, spend credits, fill an ATS, or submit an application.
            </p>
          </div>
          <div className="endpoint-list">
            {endpoints.map(([path, body, href = path]) => (
              <article key={path}>
                <a href={href}>
                  <code>{path}</code>
                </a>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section paper-grid">
        <div className="site-shell docs-notes">
          <article>
            <p className="section-label">Markdown negotiation</p>
            <h2>Ask for Markdown at the page URL.</h2>
            <p>
              Send <code>Accept: text/markdown</code> to any cataloged public page, or request its
              explicit <code>.md</code> alternate. Negotiated responses include{' '}
              <code>Vary: Accept</code> so HTML and Markdown cannot poison one another in a cache.
            </p>
          </article>
          <article>
            <p className="section-label">Error model</p>
            <h2>Discovery errors are structured.</h2>
            <p>
              Unsupported methods and missing discovery routes return{' '}
              <code>application/problem+json</code> with a stable code, status, detail, and
              resolution hint. Ordinary product routes keep their own application contracts.
            </p>
          </article>
          <article>
            <p className="section-label">Version policy</p>
            <h2>Breaking changes get a new major contract.</h2>
            <p>
              The OpenAPI <code>info.version</code> follows semantic versioning. A breaking change
              gets a new major version; the previous contract remains available for at least 90 days
              with <code>Deprecation</code> and <code>Sunset</code> response headers.
            </p>
          </article>
          <article>
            <p className="section-label">Non-goals</p>
            <h2>No public agent can apply on your behalf.</h2>
            <p>
              There is no public mutation API, MCP tool, payment-by-agent rail, CAPTCHA bypass, or
              unattended file upload. Those absences preserve the review-first product boundary.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
