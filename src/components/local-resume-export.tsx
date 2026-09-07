'use client';

import { useState } from 'react';
import { exportLocalResume, type LocalResumeFormat } from '@/lib/resume-download';
import type { ResumeRenderConfig } from '@/lib/resume-templates';

interface Props {
  source: string;
  name: string;
  config?: Partial<ResumeRenderConfig>;
}
const formats: { format: LocalResumeFormat; label: string }[] = [
  { format: 'print', label: 'Print / Save PDF' },
  { format: 'doc', label: 'Word (.doc)' },
  { format: 'html', label: 'HTML' },
  { format: 'txt', label: 'Plain Text (Markdown)' },
];

export function LocalResumeExport({ source, name, config }: Props) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="w-52 max-w-full">
      <details className="relative">
        <summary className="cursor-pointer list-none min-h-[44px] px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-foreground">
          Export resume
        </summary>
        <div className="absolute inset-x-0 top-full mt-1 z-50 w-full p-1 rounded-lg border border-[var(--border)] bg-[var(--background)] text-foreground shadow-lg">
          {formats.map(({ format, label }) => (
            <button
              key={format}
              type="button"
              className="block w-full min-h-[44px] px-3 py-2 text-left text-sm rounded hover:bg-[var(--muted)]"
              onClick={(event) => {
                event.currentTarget.closest('details')?.removeAttribute('open');
                setError(null);
                try {
                  exportLocalResume(source, name, format, config);
                } catch (cause) {
                  setError(
                    cause instanceof Error ? cause.message : 'Could not export. Please try again.'
                  );
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </details>
      {error && (
        <p role="alert" className="mt-2 max-w-sm text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
