import { ResumeBuilder } from '@/components/resume-builder';
import { listResumes } from '@/lib/actions/resume-actions';

import { requireWorkspaceSignIn, type WorkspaceSearchParams } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Career profile' };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: WorkspaceSearchParams;
}) {
  await requireWorkspaceSignIn('/resume-builder/profile', searchParams);
  const [resumes, params] = await Promise.all([listResumes(), searchParams]);
  return (
    <ResumeBuilder
      view="profile"
      serverResumes={resumes}
      requestedResume={typeof params.resume === 'string' ? params.resume : undefined}
    />
  );
}
