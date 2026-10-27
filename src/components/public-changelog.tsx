const sourceUrl = 'https://github.com/Significant-Hobbies/rolepatch';
const roadmapUrl = `${sourceUrl}/issues`;

const entries = [
  {
    date: 'July 11, 2026',
    title: 'Guest workflows became more predictable',
    body: 'The test environment now resets browser-local state between runs. That protects the same boundary unsigned users rely on when they keep resumes, searches, and application drafts on one device.',
  },
  {
    date: 'July 4, 2026',
    title: 'Job discovery moved into the product',
    body: 'A LinkedIn-focused job browser added quick searches, posting signals, resume-aware ranking, visible match evidence, and reviewed batch queueing. Guests can search and prepare locally without being forced to sign in.',
  },
  {
    date: 'July 4, 2026',
    title: 'Application assistance became receipt-first',
    body: 'The reviewed queue added Chrome-assisted ATS fill, guarded submit attempts, provider-aware blockers, field-level details, retry timelines, and copyable audit summaries. Unattended bulk apply remains out of scope.',
  },
  {
    date: 'July 4, 2026',
    title: 'Proof and public release checks shipped',
    body: 'RolePatch added a source-backed Proof surface and a release preflight covering type safety, formatting, tests, the extension build, the Cloudflare build, public routes, and responsive browser journeys.',
  },
];
export function PublicChangelog() {
  'use no memo';
  return (
    <main>
      <section className="page-hero paper-grid">
        <div className="site-shell">
          <p className="section-label">Verified product history</p>
          <h1>What changed, and why it matters.</h1>
          <p>
            Shipped changes live here. Planned work stays in the public issue tracker, where it
            cannot be mistaken for a finished feature.
          </p>
        </div>
      </section>

      <section className="page-section" aria-label="RolePatch releases">
        <div className="site-shell">
          <div className="release-list">
            {entries.map((entry) => (
              <article key={entry.title} className="release-item">
                <time className="release-date">{entry.date}</time>
                <div>
                  <h2>{entry.title}</h2>
                  <p>{entry.body}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="page-cta">
            <div>
              <h2>Inspect the work behind the claims.</h2>
              <p>The canonical repository and its issue tracker are public.</p>
            </div>
            <div className="hero-actions">
              <a href={sourceUrl} className="primary-action">
                View source <span aria-hidden="true">↗</span>
              </a>
              <a href={roadmapUrl} className="secondary-action">
                Open roadmap <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
