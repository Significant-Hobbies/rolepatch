import { Dashboard } from '@/components/dashboard';
import ObservedJobs from '@/components/observed-jobs';
import { listResumes } from '@/lib/actions/resume-actions';

import { requireWorkspaceSignIn, type WorkspaceSearchParams } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Find jobs' };

export default async function DiscoverJobsPage({
  searchParams,
}: {
  searchParams: WorkspaceSearchParams;
}) {
  await requireWorkspaceSignIn('/jobs/discover', searchParams);
  const resumes = await listResumes();
  return (
    <Dashboard
      view="discover"
      browseContent={<ObservedJobs searchParams={searchParams} />}
      serverResumes={resumes}
      serverJobs={[]}
    />
  );
}
