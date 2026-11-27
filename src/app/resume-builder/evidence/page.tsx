import { ResumeBuilder } from '@/components/resume-builder';
import { listAchievementEvidence } from '@/lib/actions/achievement-evidence-actions';
import { listStashEntries } from '@/lib/actions/stash-actions';

import { requireWorkspaceSignIn, type WorkspaceSearchParams } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Evidence' };

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: WorkspaceSearchParams;
}) {
  await requireWorkspaceSignIn('/resume-builder/evidence', searchParams);
  const [evidence, stash, params] = await Promise.all([
    listAchievementEvidence(),
    listStashEntries(),
    searchParams,
  ]);
  return (
    <ResumeBuilder
      view="evidence"
      serverResumes={[]}
      serverEvidence={evidence}
      serverStash={stash}
      requestedResume={typeof params.resume === 'string' ? params.resume : undefined}
    />
  );
}
