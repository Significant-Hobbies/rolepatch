'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { InterviewPrep } from '@/components/interview-prep';
import { localGetJob, localGetResume } from '@/lib/local-storage';
import type { JobApplication, Resume } from '@/lib/types';

/** Browser records are loaded only for a server-qualified guest request. */
export function GuestInterviewPrep({ jobId }: { jobId: string }) {
  const { isGuest } = useAuth();
  const [saved, setSaved] = useState<{ job: JobApplication; resume: Resume | null } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const job = isGuest ? localGetJob(jobId) : null;
      setSaved(job ? { job, resume: localGetResume(job.resume_id) } : null);
    } catch {
      setSaved(null);
    }
    setLoaded(true);
  }, [isGuest, jobId]);

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {!loaded ? (
        <p role="status">Loading saved job…</p>
      ) : saved && isGuest ? (
        <InterviewPrep
          key={saved.job.id}
          job={saved.job}
          resume={saved.resume}
          existingStories={[]}
        />
      ) : (
        <>
          <h1 className="text-2xl font-bold">Job unavailable</h1>
          <p className="mt-3">
            Open a job saved in this browser to prepare your interview answers.
          </p>
          <Link href="/jobs" className="mt-4 inline-block underline">
            Back to Jobs
          </Link>
        </>
      )}
    </main>
  );
}
