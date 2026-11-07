'use client';

import { useMemo } from 'react';
import { markdownToHtml } from '@/lib/resume-html';
import { stripResumePins } from '@/lib/resume-pins';
import type { TailorChange } from '@/lib/types';

export function ResumeStudioPreview({
  source,
  changes,
  hasDraft = false,
}: {
  source: string;
  changes: TailorChange[];
  hasDraft?: boolean;
}) {
  const html = useMemo(
    () =>
      markdownToHtml(source, 'Resume preview', { fontSize: 11, margin: 0.5 }).replace(
        '</style>',
        '@media screen { body { padding: clamp(20px, 4vw, 48px); box-sizing: border-box; } } </style>'
      ),
    [source]
  );
  return (
    <div className="precision-document-canvas">
      <div className="precision-review-grid">
        <div className="precision-paper-wrap">
          <p className="precision-document-label">
            <span>{hasDraft ? 'Tailored resume' : 'Base resume'}</span>
            <span>{hasDraft ? 'Review draft' : 'Original'}</span>
          </p>
          <iframe
            title="Resume document preview"
            srcDoc={html}
            sandbox=""
            className="resume-studio-preview"
          />
        </div>
        <aside className="precision-inspector">
          <h3 className="font-semibold text-base">The patch, explained.</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Your base resume stays preserved. Review the draft before using it.
          </p>
          {changes.length ? (
            <ul className="mt-5 space-y-5">
              {changes.map((change, index) => (
                <li
                  key={`${index}-${change.snippet}`}
                  className="border-t border-[var(--border)] pt-4 text-sm"
                >
                  <p className="font-medium">{stripResumePins(change.snippet)}</p>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{change.reason}</p>
                  {change.jd_match && (
                    <p className="mt-3 rounded bg-secondary p-2 text-xs">
                      Job requirement: {change.jd_match}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 border-t border-[var(--border)] pt-4 text-sm text-muted-foreground">
              {hasDraft
                ? 'No wording changes were explained. Review the full draft against your base resume before using it.'
                : 'Generate a tailored draft to see the proposed changes and their explanations here.'}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
