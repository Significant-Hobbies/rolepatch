import { ResumeBuilder } from '@/components/resume-builder';
import { listAchievementEvidence } from '@/lib/actions/achievement-evidence-actions';
import { listResumes } from '@/lib/actions/resume-actions';
import { listStashEntries } from '@/lib/actions/stash-actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Resume Builder' };

export default async function ResumeBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string }>;
}) {
  const [resumes, evidence, stash, params] = await Promise.all([
    listResumes(),
    listAchievementEvidence(),
    listStashEntries(),
    searchParams,
  ]);
  return (
    <ResumeBuilder
      serverResumes={resumes}
      serverEvidence={evidence}
      serverStash={stash}
      requestedResume={params.resume}
    />
  );
}
