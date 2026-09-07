import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPublicScoreBySlug } from '@/lib/actions/share-score-action';

export const dynamic = 'force-dynamic';

const SITE_URL = 'https://rolepatch.com';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicScoreBySlug(slug);
  if (!data) {
    return { title: 'Score not found', robots: { index: false, follow: false } };
  }

  const roleLabel = data.role || 'engineering';
  const title = `${data.score_original} → ${data.score_tailored} weighted keyword score for a ${roleLabel} role`;
  const description = `An engineer tailored their resume for a ${roleLabel} role and changed their weighted keyword score from ${data.score_original} to ${data.score_tailored}. Build yours free on RolePatch.`;
  const pageUrl = `${SITE_URL}/badge/${slug}`;
  const ogImage = `${pageUrl}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'article',
      url: pageUrl,
      siteName: 'RolePatch',
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

function scoreAccent(score: number) {
  if (score >= 70) return 'var(--accent)';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export default async function BadgePage({ params }: Params) {
  const { slug } = await params;
  const data = await getPublicScoreBySlug(slug);
  if (!data) notFound();

  const { score_original, score_tailored, role } = data;
  const delta = score_tailored - score_original;
  const roleLabel = role || 'engineering';
  const tailoredColor = scoreAccent(score_tailored);
  const originalColor = scoreAccent(score_original);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-[var(--background)]">
      <div className="w-full max-w-2xl">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 md:p-14 shadow-2xl text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            RolePatch Weighted Keyword Score
          </p>

          <div className="mt-8 flex items-end justify-center gap-3">
            <span
              className="text-7xl md:text-8xl font-bold leading-none tabular-nums"
              style={{ color: tailoredColor }}
            >
              {score_tailored}
            </span>
            <span className="text-2xl font-semibold text-[var(--muted-foreground)] pb-2">
              / 100
            </span>
          </div>

          <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--background)]/40">
            <span className="text-sm font-semibold tabular-nums" style={{ color: originalColor }}>
              {score_original}
            </span>
            <span className="text-[var(--muted-foreground)]">{'→'}</span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: tailoredColor }}>
              {score_tailored}
            </span>
            {delta !== 0 && (
              <span
                className="ml-1 text-xs font-medium"
                style={{ color: delta > 0 ? 'var(--accent)' : '#ef4444' }}
              >
                {delta > 0 ? `+${delta}` : delta}
              </span>
            )}
          </div>

          <p className="mt-8 text-lg text-foreground">
            An engineer tailored their resume for a{' '}
            <span className="font-semibold">{roleLabel}</span> role.
          </p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            They changed their weighted keyword score from {score_original} to {score_tailored}.
          </p>

          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            This is a RolePatch keyword heuristic, not an employer ATS result or a prediction of
            interview chances. Repeated terms contribute 70% and other terms 30%; when none repeat,
            terms count equally.
          </p>

          <Link
            href="/"
            className="mt-10 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:brightness-110 transition-all"
          >
            Tailor your resume free
          </Link>

          <p className="mt-6 text-xs text-[var(--muted-foreground)]">
            Powered by <span className="font-semibold text-foreground">RolePatch</span>
          </p>
        </div>
      </div>
    </main>
  );
}
