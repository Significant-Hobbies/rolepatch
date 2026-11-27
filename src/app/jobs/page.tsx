import { redirect } from 'next/navigation';
import { Dashboard } from '@/components/dashboard';
import { listJobApplications } from '@/lib/actions/job-actions';
import { listResumes } from '@/lib/actions/resume-actions';
import { listResumeHistory } from '@/lib/actions/resume-history-actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jobs' };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const legacyFeedPage = Array.isArray(params.page) ? params.page[0] : params.page;
  if (legacyFeedPage) redirect(`/jobs/discover?page=${encodeURIComponent(legacyFeedPage)}`);
  const [resumes, jobs, history] = await Promise.all([
    listResumes(),
    listJobApplications(),
    listResumeHistory(),
  ]);
  return <Dashboard serverResumes={resumes} serverJobs={jobs} serverHistory={history} />;
}
