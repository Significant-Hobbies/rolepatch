export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jobs' };

import ObservedJobs from '@/components/observed-jobs';
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

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [
    resumes,
    jobs,
    applicationQueue,
    applicationReceipts,
    applicationPackets,
    profileAnswers,
    jobDiscoveryAlerts,
    replyRoutingAddress,
    recruiterReplyEvents,
    history,
  ] = await Promise.all([
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
  const fitScores = await listFitScores(jobs.map((j) => j.id));
  return (
    <Dashboard
      browseContent={<ObservedJobs searchParams={searchParams} />}
      serverResumes={resumes}
      serverJobs={jobs}
      serverFitScores={fitScores}
      serverApplicationQueue={applicationQueue}
      serverApplicationReceipts={applicationReceipts}
      serverApplicationPackets={applicationPackets}
      serverProfileAnswers={profileAnswers}
      serverJobDiscoveryAlerts={jobDiscoveryAlerts}
      serverReplyRoutingAddress={replyRoutingAddress}
      serverRecruiterReplyEvents={recruiterReplyEvents}
      serverHistory={history}
    />
  );
}
