import { Dashboard } from '@/components/dashboard';
import ObservedJobs from '@/components/observed-jobs';
import { listResumes } from '@/lib/actions/resume-actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Find jobs' };

export default async function DiscoverJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
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
