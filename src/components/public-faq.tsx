import { PRODUCT_FAQS } from '../../landing-astro/src/lib/product';

export function PublicFaq() {
  'use no memo';
  return (
    <main>
      <section className="page-hero paper-grid">
        <div className="site-shell">
          <p className="section-label">RolePatch FAQ</p>
          <h1>Straight answers before you trust it with a real application.</h1>
          <p>
            What RolePatch may change, what it must leave alone, where your records live, what costs
            money, and where application assistance stops.
          </p>
        </div>
      </section>

      <section className="page-section">
        <div className="site-shell">
          <div className="faq-page-list">
            {PRODUCT_FAQS.map((faq) => (
              <article key={faq.q}>
                <h2>{faq.q}</h2>
                <p>{faq.a}</p>
              </article>
            ))}
          </div>
          <div className="page-cta">
            <div>
              <h2>Bring the job. Keep the claims yours.</h2>
              <p>
                Start with a guest workspace, then decide whether account-backed persistence belongs
                in your search.
              </p>
            </div>
            <a href="/resume-builder" className="primary-action">
              Open RolePatch <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
