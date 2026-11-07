'use client';

import Link from 'next/link';
import { useState } from 'react';
import { exportLocalResume } from '@/lib/resume-download';
import type { TailoredResume } from '@/lib/types';

export function JobResumeHistory({
  role,
  company,
  versions,
}: {
  role: string;
  company: string;
  versions: TailoredResume[];
}) {
  const [error, setError] = useState('');
  if (!versions.length)
    return (
      <p className="w-[calc(100vw-3rem)] max-w-full sm:w-full px-6 pb-4 text-sm text-[var(--muted-foreground)] border-b border-[var(--border)]/40">
        No saved tailored resume yet · {role}
        {company ? ` · ${company}` : ''}
      </p>
    );
  return (
    <details className="w-[calc(100vw-3rem)] max-w-full sm:w-full px-6 pb-4 border-b border-[var(--border)]/40">
      <summary className="cursor-pointer min-h-11 py-2 text-sm font-bold">
        {versions.length} saved resume{versions.length === 1 ? '' : 's'} · {role}
        {company ? ` · ${company}` : ''}
      </summary>
      <ol className="space-y-2 mt-2" aria-label={`Saved resumes for ${role}`}>
        {versions.map((version, index) => (
          <li key={version.id} className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">
              {index === 0 ? 'Latest' : `Version ${versions.length - index}`}
            </span>
            <time
              dateTime={new Date(version.created_at * 1000).toISOString()}
              className="text-[var(--muted-foreground)]"
            >
              {new Date(version.created_at * 1000).toLocaleString()}
            </time>
            <Link
              href={`/tailor/${encodeURIComponent(version.job_id)}?version=${encodeURIComponent(version.id)}`}
              className="min-h-11 inline-flex items-center font-bold text-primary hover:underline"
            >
              View resume
            </Link>
            <button
              type="button"
              className="min-h-11 font-medium hover:underline"
              onClick={() => {
                setError('');
                try {
                  exportLocalResume(
                    version.source,
                    `${role}-version-${versions.length - index}`,
                    'txt'
                  );
                } catch {
                  setError(
                    'Could not download this resume. Open the version to try its export controls.'
                  );
                }
              }}
            >
              Download Markdown
            </button>
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </details>
  );
}
