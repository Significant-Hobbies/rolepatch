'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { localListResumes, localListJobs, localUpdateJobStatus } from '@/lib/local-storage';
import { updateJobStatus } from '@/lib/actions/job-actions';
import type { Resume, JobApplication } from '@/lib/types';
import { ResumeCard } from '@/components/resume-card';
import { CreateResumeButton } from '@/components/create-resume-button';
import { NewJobButton } from '@/components/new-job-button';
import { MigrationBanner } from '@/components/migration-banner';

const STATUS_OPTIONS: JobApplication['status'][] = [
  'draft', 'tailored', 'applied', 'interview', 'offer', 'rejected',
];

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-600',
  tailored: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-600',
  applied: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-600',
  interview: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-600',
  offer: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-600',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300 dark:border-red-600',
};

interface DashboardProps {
  serverResumes: Resume[];
  serverJobs: JobApplication[];
}

export function Dashboard({ serverResumes, serverJobs }: DashboardProps) {
  const { isGuest } = useAuth();
  const [resumes, setResumes] = useState(serverResumes);
  const [jobs, setJobs] = useState<Pick<JobApplication, 'id' | 'company' | 'role' | 'status' | 'created_at'>[]>(serverJobs);

  useEffect(() => {
    if (isGuest) {
      setResumes(localListResumes());
      setJobs(localListJobs());
    }
  }, [isGuest]);

  async function handleStatusChange(jobId: string, newStatus: string) {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus as JobApplication['status'] } : j));
    if (isGuest) {
      localUpdateJobStatus(jobId, newStatus);
    } else {
      await updateJobStatus(jobId, newStatus);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <MigrationBanner />

      {/* Resumes section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Resumes</h1>
          <CreateResumeButton />
        </div>
        {resumes.length === 0 ? (
          <p className="text-gray-500">No resumes yet. Create one to get started.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumes.map((r) => (
              <ResumeCard key={r.id} resume={r} />
            ))}
          </div>
        )}
      </section>

      {/* Job Applications section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Job Applications</h1>
          <NewJobButton resumes={resumes.map(r => ({ id: r.id, name: r.name }))} />
        </div>
        {jobs.length === 0 ? (
          <p className="text-gray-500">No job applications yet. Add one to start tailoring.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/tailor/${job.id}`}
                className="block border rounded-lg p-4 hover:border-green-500 transition-colors"
              >
                <h3 className="font-semibold truncate">{job.role || 'Untitled Role'}</h3>
                <p className="text-sm text-gray-500 mt-1">{job.company || 'Unknown Company'}</p>
                <select
                  value={job.status}
                  onChange={(e) => handleStatusChange(job.id, e.target.value)}
                  onClick={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`mt-2 text-xs px-2 py-0.5 rounded-full border appearance-none cursor-pointer focus:outline-none ${statusStyles[job.status] ?? statusStyles.draft}`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
