import Link from 'next/link';
import type { useWordCountPageSourceState } from './page-state';

function formatSeconds(s: number): string {
  'use no memo';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (rem === 0) return `${m}m`;
  return `${m}m ${rem}s`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  'use no memo';
  return (
    <div className="rounded-md border border-stone-200 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{value}</p>
      {hint && <p className="text-[10px] text-stone-400">{hint}</p>}
    </div>
  );
}

export function WordCountPageView(view: ReturnType<typeof useWordCountPageSourceState>) {
  'use no memo';
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-xs text-stone-500 hover:underline">
        ← RolePatch
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Word count</h1>
      <p className="mt-3 text-sm text-stone-600">
        Paste anything — resume, cover letter, bio — to get word / line / sentence / paragraph
        counts and an estimated recruiter-skim time. Local only; no network call.
      </p>

      <textarea
        value={view.text}
        onChange={(e) => view.setText(e.target.value)}
        placeholder="Paste text here…"
        className="mt-6 h-64 w-full resize-y rounded-md border border-stone-300 p-3 font-mono text-xs"
      />

      {view.stats && (
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Words" value={view.stats.words.toLocaleString()} />
          <Stat label="Characters" value={view.stats.characters.toLocaleString()} />
          <Stat label="No-space chars" value={view.stats.charactersNoSpace.toLocaleString()} />
          <Stat label="Lines" value={view.stats.lines.toLocaleString()} />
          <Stat label="Sentences" value={view.stats.sentences.toLocaleString()} />
          <Stat label="Paragraphs" value={view.stats.paragraphs.toLocaleString()} />
          <Stat label="Bullet rows" value={view.stats.bullets.toLocaleString()} />
          <Stat
            label="Skim time"
            value={formatSeconds(view.stats.readingSeconds)}
            hint="@ 230 wpm"
          />
        </section>
      )}
    </main>
  );
}
