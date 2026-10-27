import Link from 'next/link';
import type { useAtsCheckPageSourceState } from './page-state';

export function AtsCheckPageView(view: ReturnType<typeof useAtsCheckPageSourceState>) {
  'use no memo';
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-xs text-stone-500 hover:underline">
        ← RolePatch
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Free ATS Resume Checker</h1>
      <p className="mt-3 text-sm text-stone-600">
        Paste the text of your resume for an immediate, browser-local check of seven visible
        structure and formatting signals. No sign-up, file upload, or network request is required.
        The result is a transparent heuristic report, not a prediction that a particular employer or
        applicant-tracking system will accept your resume.
      </p>

      <textarea
        value={view.text}
        onChange={(e) => view.setText(e.target.value)}
        placeholder="# Jane Doe&#10;jane@example.com · +1 555 123 4567 · linkedin.com/in/jane&#10;&#10;## Experience&#10;### Staff Engineer · Acme · 2022 – present&#10;- Led migration cutting p99 latency by 40%..."
        className="mt-6 h-64 w-full resize-y rounded-md border border-stone-300 p-3 font-mono text-xs"
      />

      {view.result && (
        <section className="mt-6 space-y-3">
          <div className="rounded-md border border-stone-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">Score</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-stone-900">
              {view.result.score}
              <span className="text-base font-normal text-stone-400"> / 100</span>
            </p>
          </div>
          <ul className="space-y-2">
            {view.result.findings.map((f, i) => (
              <li
                key={i}
                className={`rounded-md border p-3 text-sm ${
                  f.severity === 'good'
                    ? 'border-emerald-200 bg-emerald-50'
                    : f.severity === 'warn'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-rose-200 bg-rose-50'
                }`}
              >
                <p className="font-medium">
                  <span className="mr-2">
                    {f.severity === 'good' ? '✓' : f.severity === 'warn' ? '!' : '✗'}
                  </span>
                  {f.label}
                </p>
                <p className="mt-1 text-xs text-stone-700">{f.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
