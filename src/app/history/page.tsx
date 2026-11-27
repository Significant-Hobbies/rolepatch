import { Dashboard } from '@/components/dashboard';
import { listApplicationReceipts } from '@/lib/actions/apply-agent-actions';
import { listJobApplications } from '@/lib/actions/job-actions';
import { listResumeHistory } from '@/lib/actions/resume-history-actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'History' };

export default async function HistoryPage() {
  const [jobs, versions, receipts] = await Promise.all([
    listJobApplications(),
    listResumeHistory(),
    listApplicationReceipts(),
  ]);

  return (
    <Dashboard
      historyOnly
      serverResumes={[]}
      serverJobs={jobs}
      serverHistory={versions}
      serverApplicationReceipts={receipts}
    />
  );
}
