import { Dashboard } from '@/components/dashboard';
import {
  listApplicationPackets,
  listApplicationQueue,
  listApplicationReceipts,
} from '@/lib/actions/apply-agent-actions';
import { listFitScores } from '@/lib/actions/fit-score-action';
import { listJobDiscoveryAlerts } from '@/lib/actions/job-discovery-actions';
import { listJobApplications } from '@/lib/actions/job-actions';
import { listProfileAnswers } from '@/lib/actions/profile-answer-actions';
import {
  getReplyRoutingAddress,
  listRecruiterReplyEvents,
} from '@/lib/actions/recruiter-reply-actions';
import { listResumes } from '@/lib/actions/resume-actions';
import { listResumeHistory } from '@/lib/actions/resume-history-actions';

import { requireWorkspaceSignIn, type WorkspaceSearchParams } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Apply queue' };

export default async function ApplyQueuePage({
  searchParams,
}: {
  searchParams: WorkspaceSearchParams;
}) {
  await requireWorkspaceSignIn('/jobs/queue', searchParams);
  const [resumes, jobs, queue, receipts, packets, answers, alerts, address, replies, history] =
    await Promise.all([
      listResumes(),
      listJobApplications(),
      listApplicationQueue(),
      listApplicationReceipts(),
      listApplicationPackets(),
      listProfileAnswers(),
      listJobDiscoveryAlerts(),
      getReplyRoutingAddress(),
      listRecruiterReplyEvents(),
      listResumeHistory(),
    ]);
  const fitScores = await listFitScores(jobs.map((job) => job.id));
  return (
    <Dashboard
      view="queue"
      serverResumes={resumes}
      serverJobs={jobs}
      serverFitScores={fitScores}
      serverApplicationQueue={queue}
      serverApplicationReceipts={receipts}
      serverApplicationPackets={packets}
      serverProfileAnswers={answers}
      serverJobDiscoveryAlerts={alerts}
      serverReplyRoutingAddress={address}
      serverRecruiterReplyEvents={replies}
      serverHistory={history}
    />
  );
}
