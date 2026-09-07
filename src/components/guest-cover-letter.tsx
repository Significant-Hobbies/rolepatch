'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { CoverLetterEditor } from '@/components/cover-letter-editor';
import { OutreachPanel } from '@/components/outreach-panel';
import { localGetJob } from '@/lib/local-storage';
import type { JobApplication } from '@/lib/types';

/** Only rendered after the server has established that the request is a guest. */
export function GuestCoverLetter({ jobId }: { jobId: string }) {
  const { isGuest } = useAuth();
  const [job, setJob] = useState<JobApplication | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setJob(isGuest ? localGetJob(jobId) : null);
    } catch {
      setJob(null);
    }
    setLoaded(true);
  }, [isGuest, jobId]);

  if (!loaded) return <p role="status">Loading saved job…</p>;
  if (!job || !isGuest) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold">Job unavailable</h1>
        <p className="mt-3">Open a job saved in this browser to draft its cover letter.</p>
        <Link href="/dashboard" className="mt-4 inline-block underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Cover Letter</h1>
        <p className="text-[var(--muted-foreground)]">
          {job.role} at {job.company}
        </p>
      </header>
      <CoverLetterEditor key={job.id} job={job} serverResume={null} existingLetter={null} />
      <div className="mt-10">
        <OutreachPanel key={job.id} job={job} serverResume={null} existingEmail={null} />
      </div>
    </main>
  );
}
