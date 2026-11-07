export const dynamic = 'force-dynamic';

import Link from 'next/link';

import { TailorFlow } from '@/components/tailor-flow';
import { listAchievementEvidence } from '@/lib/actions/achievement-evidence-actions';
import { getFitScore } from '@/lib/actions/fit-score-action';
import { getJobApplication, getTailoredResumes } from '@/lib/actions/job-actions';
import { listResumes } from '@/lib/actions/resume-actions';
import { listStashEntries } from '@/lib/actions/stash-actions';

export default async function TailorPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
}) {
  const { jobId } = await params;
  const version = (await searchParams).version;
  const job = await getJobApplication(jobId);

  const [resumes, tailored, fitScore, stashEntries, evidenceEntries] = await Promise.all([
    listResumes(),
    getTailoredResumes(jobId),
    getFitScore(jobId),
    listStashEntries(),
    listAchievementEvidence(),
  ]);
  const resume = job ? (resumes.find((item) => item.id === job.resume_id) ?? null) : null;

  return (
    <main className="precision-app precision-workspace flex flex-col">
      <header className="precision-workspace-heading">
        <div>
          <p className="precision-crumb">Your workspace / Resume tailoring</p>
          <h1>Your experience, for this role.</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tailor your base resume to this role, then review every change. Your original stays
            preserved.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-[var(--muted-foreground)] hover:text-primary"
        >
          Back
        </Link>
      </header>
      <TailorFlow
        jobId={jobId}
        job={job}
        serverResume={resume}
        serverResumes={resumes}
        serverStashEntries={stashEntries}
        serverEvidence={evidenceEntries}
        existingTailored={tailored}
        existingFitScore={fitScore}
        initialVersionId={typeof version === 'string' ? version : undefined}
      />
    </main>
  );
}
