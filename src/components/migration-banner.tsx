'use client';

import { Button } from '@saas-maker/ui/components/button';
import { useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { LocalResumeCorrection } from '@/components/local-resume-correction';
import { guestMasterProblem } from '@/lib/guest-migration-validation';
import { migrateGuestData } from '@/lib/actions/migration-actions';
import type { CoverLetter, JobApplication, Resume, StashEntry, TailoredResume } from '@/lib/types';

function getLocalItems<T>(key: string): T[] {
  try {
    const items = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function getLocalData() {
  return {
    resumes: getLocalItems<Resume>('rt-resumes'),
    jobs: getLocalItems<JobApplication>('rt-jobs'),
    tailoredResumes: getLocalItems<TailoredResume>('rt-tailored'),
    coverLetters: getLocalItems<CoverLetter>('rt-cover-letters'),
    stashEntries: getLocalItems<StashEntry>('rt-stash'),
  };
}

function describeLocalData(local: ReturnType<typeof getLocalData>) {
  const collections = [
    [local.resumes.length, 'base résumé'],
    [local.jobs.length, 'job'],
    [local.tailoredResumes.length, 'tailored résumé'],
    [local.coverLetters.length, 'cover letter'],
    [local.stashEntries.length, 'extra experience entry', 'extra experience entries'],
  ] as const;
  return collections
    .filter(([count]) => count > 0)
    .map(([count, label, plural]) => `${count} ${count === 1 ? label : (plural ?? `${label}s`)}`);
}

function hasImported(key: string) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function firstCorrection(resumes: Resume[]) {
  const issue = guestMasterProblem(resumes);
  return issue ? { ...issue, resume: resumes[issue.index] } : null;
}

async function importLocalData(userId: string) {
  const data = getLocalData();
  const correction = firstCorrection(data.resumes);
  if (correction) return { success: false, error: correction.error, correction };
  const result = await migrateGuestData(data, userId);
  return { ...result, correction: null };
}

export function MigrationBanner() {
  const { userId } = useAuth();
  const importedKey = `rt-migrated:${userId}`;
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correction, setCorrection] = useState<ReturnType<typeof firstCorrection>>(null);
  const [localStatus, setLocalStatus] = useState('');
  const [editingCorrection, setEditingCorrection] = useState(false);
  function refreshCorrection(saved: boolean) {
    setEditingCorrection(false);
    const next = firstCorrection(getLocalItems<Resume>('rt-resumes'));
    setCorrection(next);
    setError(next?.error ?? null);
    setLocalStatus(
      saved
        ? next
          ? 'Local correction saved.'
          : 'Local correction saved. Retry the import when ready.'
        : 'Local resumes refreshed.'
    );
  }

  if (!userId || dismissed || hasImported(importedKey)) return null;
  const parts = describeLocalData(getLocalData());
  if (parts.length === 0 && !editingCorrection) return null;

  async function handleImport(accountId: string) {
    setLocalStatus('');
    setLoading(true);
    setError(null);
    try {
      const result = await importLocalData(accountId);
      setCorrection(result.correction);

      if (result.success) {
        // leave localStorage intact as recovery backup
        localStorage.setItem(importedKey, '1');
        window.location.reload();
      } else {
        setError(result.error ?? 'Migration failed');
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration error');
      setLoading(false);
    }
  }

  return (
    <div
      className={`mx-4 mt-4 flex flex-col items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 ${correction ? '' : 'sm:flex-row sm:items-center'}`}
    >
      <div className="flex w-full min-w-0 flex-col gap-1 sm:flex-1">
        <p className="text-sm text-foreground">
          We found {parts.join(', ')} saved in this browser. Import them to your account?
        </p>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        {correction && (
          <LocalResumeCorrection
            key={correction.resume.id}
            resume={correction.resume}
            index={correction.index}
            onOpen={() => setEditingCorrection(true)}
            onRefresh={refreshCorrection}
          />
        )}
        {localStatus && (
          <p className="text-sm" role="status">
            {localStatus}
          </p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          variant="ghost"
          onClick={() => void handleImport(userId)}
          disabled={loading || editingCorrection}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-white text-black hover:bg-neutral-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Importing...' : error || localStatus ? 'Retry' : 'Import'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setDismissed(true)}
          disabled={loading || editingCorrection}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-[var(--border)] text-foreground hover:bg-[var(--muted)] disabled:opacity-50 transition-colors"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
