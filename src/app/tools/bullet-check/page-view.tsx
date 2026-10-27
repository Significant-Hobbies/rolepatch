import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import type { useBulletCheckPageSourceState } from './page-state';

function scoreColor(score: number): string {
  'use no memo';
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
}

export function BulletCheckPageView(view: ReturnType<typeof useBulletCheckPageSourceState>) {
  'use no memo';
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> All tools
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="font-serif text-3xl font-bold text-foreground">Bullet Strength Checker</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Paste your resume bullets one per line. Each line gets graded on verb strength, quantified
          outcome, length, tense, and first-person leakage. Everything runs in your browser.
        </p>
      </header>

      <textarea
        value={view.text}
        onChange={(e) => view.setText(e.target.value)}
        rows={6}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-sm focus:border-[var(--accent)] focus:outline-none"
        placeholder="Paste bullets, one per line…"
      />

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-[var(--muted-foreground)]">
          {view.bullets.length} bullet{view.bullets.length === 1 ? '' : 's'} analyzed
        </span>
        <span className={`text-2xl font-bold tabular-nums ${scoreColor(view.avg)}`}>
          {view.avg}/100
        </span>
      </div>

      <ul className="mt-6 space-y-4">
        {view.bullets.map((b, idx) => (
          <li
            key={`${idx}-${b.raw}`}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{b.raw}</p>
              <span className={`text-lg font-bold tabular-nums ${scoreColor(b.score)}`}>
                {b.score}
              </span>
            </div>
            <ul className="mt-3 space-y-1">
              {b.checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-xs">
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  )}
                  <span className={c.ok ? 'text-[var(--muted-foreground)]' : 'text-foreground'}>
                    <span className="font-medium">{c.label}.</span> {c.detail}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  );
}
