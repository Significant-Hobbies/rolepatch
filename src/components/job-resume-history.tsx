'use client';

import { NativeDisclosure, NativeSummary } from '@saas-maker/ui/components/native-controls';
import { Button } from '@saas-maker/ui/components/button';
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
    return <p className="px-3 pb-3 text-sm text-muted-foreground">No tailored resume saved yet.</p>;
  const label = `${versions.length} saved resume${versions.length === 1 ? '' : 's'}`;
  return (
    <NativeDisclosure className="min-w-0 whitespace-normal">
      <NativeSummary
        aria-label={`${label} for ${role}${company ? ` at ${company}` : ''}`}
        className="min-h-11 py-2.5 text-sm font-semibold"
      >
        {label}
      </NativeSummary>
      <ol className="space-y-2 px-3 pb-3" aria-label={`Saved resumes for ${role}`}>
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
            <Button
              variant="ghost"
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
            </Button>
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </NativeDisclosure>
  );
}
