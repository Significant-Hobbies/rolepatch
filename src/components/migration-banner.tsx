'use client';

import { Button } from '@saas-maker/ui/components/button';
import { useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { LocalResumeCorrection } from '@/components/local-resume-correction';
import { guestMasterProblem } from '@/lib/guest-migration-validation';
import { migrateGuestData } from '@/lib/actions/migration-actions';
import { localListJobs, localListResumes, localListStashEntries } from '@/lib/local-storage';
import type { CoverLetter, JobApplication, Resume, StashEntry, TailoredResume } from '@/lib/types';

const DISMISSED_KEY = 'rt-migration-dismissed';
// leave localStorage intact as recovery backup
const MIGRATED_KEY = 'rt-migrated';

function getLocalItems<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function firstCorrection(resumes: Resume[]) {
  const issue = guestMasterProblem(resumes);
  return issue ? { ...issue, resume: resumes[issue.index] } : null;
}

async function importLocalData() {
  const resumes = getLocalItems<Resume>('rt-resumes');
  const correction = firstCorrection(resumes);
  if (correction) return { success: false, error: correction.error, correction };
  const result = await migrateGuestData({
    resumes,
    jobs: getLocalItems<JobApplication>('rt-jobs'),
    tailoredResumes: getLocalItems<TailoredResume>('rt-tailored'),
    coverLetters: getLocalItems<CoverLetter>('rt-cover-letters'),
    stashEntries: getLocalItems<StashEntry>('rt-stash'),
  });
  return { ...result, correction: null };
}

export function MigrationBanner() {
  const { isGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== 'undefined' &&
      (localStorage.getItem(DISMISSED_KEY) === '1' || localStorage.getItem(MIGRATED_KEY) === '1')
  );
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

  const resumes = !isGuest && !dismissed ? localListResumes() : [];
  const jobs = !isGuest && !dismissed ? localListJobs() : [];
  const stash = !isGuest && !dismissed ? localListStashEntries() : [];
  const total = resumes.length + jobs.length + stash.length;

  const visible = !isGuest && !dismissed && (total > 0 || editingCorrection);
  if (!visible) return null;

  const parts: string[] = [];
  if (resumes.length > 0) parts.push(`${resumes.length} resume${resumes.length > 1 ? 's' : ''}`);
  if (jobs.length > 0) parts.push(`${jobs.length} job${jobs.length > 1 ? 's' : ''}`);
  if (stash.length > 0) parts.push(`${stash.length} stash entr${stash.length > 1 ? 'ies' : 'y'}`);

  async function handleImport() {
    setLocalStatus('');
    setLoading(true);
    setError(null);
    try {
      const result = await importLocalData();
      setCorrection(result.correction);

      if (result.success) {
        // leave localStorage intact as recovery backup
        localStorage.setItem(MIGRATED_KEY, '1');
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

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
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
          onClick={handleImport}
          disabled={loading || editingCorrection}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-white text-black hover:bg-neutral-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Importing...' : error || localStatus ? 'Retry' : 'Import'}
        </Button>
        <Button
          variant="ghost"
          onClick={handleDismiss}
          disabled={loading || editingCorrection}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-[var(--border)] text-foreground hover:bg-[var(--muted)] disabled:opacity-50 transition-colors"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
