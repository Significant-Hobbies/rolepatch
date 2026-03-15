'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { migrateGuestData } from '@/lib/actions/migration-actions';
import { localListResumes, localListJobs, localListStashEntries } from '@/lib/local-storage';
import type { Resume, JobApplication, TailoredResume, CoverLetter, StashEntry } from '@/lib/types';

const DISMISSED_KEY = 'rt-migration-dismissed';
const STORAGE_KEYS = ['rt-resumes', 'rt-jobs', 'rt-stash', 'rt-tailored', 'rt-cover-letters'];

function getLocalItems<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

export function MigrationBanner() {
  const { isGuest } = useAuth();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ resumes: 0, jobs: 0, stash: 0 });

  useEffect(() => {
    if (isGuest) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const resumes = localListResumes();
    const jobs = localListJobs();
    const stash = localListStashEntries();

    if (resumes.length + jobs.length + stash.length === 0) return;

    setCounts({ resumes: resumes.length, jobs: jobs.length, stash: stash.length });
    setVisible(true);
  }, [isGuest]);

  if (!visible) return null;

  const parts: string[] = [];
  if (counts.resumes > 0) parts.push(`${counts.resumes} resume${counts.resumes > 1 ? 's' : ''}`);
  if (counts.jobs > 0) parts.push(`${counts.jobs} job${counts.jobs > 1 ? 's' : ''}`);
  if (counts.stash > 0) parts.push(`${counts.stash} stash entr${counts.stash > 1 ? 'ies' : 'y'}`);

  async function handleImport() {
    setLoading(true);
    try {
      const resumes = getLocalItems<Resume>('rt-resumes');
      const jobs = getLocalItems<JobApplication>('rt-jobs');
      const tailoredResumes = getLocalItems<TailoredResume>('rt-tailored');
      const coverLetters = getLocalItems<CoverLetter>('rt-cover-letters');
      const stashEntries = getLocalItems<StashEntry>('rt-stash');

      const result = await migrateGuestData({ resumes, jobs, tailoredResumes, coverLetters, stashEntries });

      if (result.success) {
        STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
        window.location.reload();
      } else {
        console.error('Migration failed:', result.error);
        setLoading(false);
      }
    } catch (err) {
      console.error('Migration error:', err);
      setLoading(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <p className="text-sm text-neutral-300">
        We found {parts.join(', ')} saved locally. Import them to your account?
      </p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleImport}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-white text-black hover:bg-neutral-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Importing...' : 'Import'}
        </button>
        <button
          onClick={handleDismiss}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-neutral-600 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
