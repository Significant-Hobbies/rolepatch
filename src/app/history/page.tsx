import { Dashboard } from '@/components/dashboard';
import { listApplicationReceipts } from '@/lib/actions/apply-agent-actions';
import { listJobApplications } from '@/lib/actions/job-actions';
import { listResumeHistory } from '@/lib/actions/resume-history-actions';

import { requireWorkspaceSignIn, type WorkspaceSearchParams } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'History' };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: WorkspaceSearchParams;
}) {
  await requireWorkspaceSignIn('/history', searchParams);
  const [jobs, versions, receipts] = await Promise.all([
    listJobApplications(),
    listResumeHistory(),
    listApplicationReceipts(),
  ]);

  return (
    <Dashboard
      view="history"
      serverResumes={[]}
      serverJobs={jobs}
      serverHistory={versions}
      serverApplicationReceipts={receipts}
    />
  );
}
