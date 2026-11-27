import { ResumeBuilder } from '@/components/resume-builder';
import { listResumes } from '@/lib/actions/resume-actions';

import { requireWorkspaceSignIn, type WorkspaceSearchParams } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Generate a résumé' };

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: WorkspaceSearchParams;
}) {
  await requireWorkspaceSignIn('/resume-builder/generate', searchParams);
  const [resumes, params] = await Promise.all([listResumes(), searchParams]);
  return (
    <ResumeBuilder
      view="generate"
      serverResumes={resumes}
      requestedResume={typeof params.resume === 'string' ? params.resume : undefined}
    />
  );
}
