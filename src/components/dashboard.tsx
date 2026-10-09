'use client';

import { AlertCircle, ArrowRight, Calendar, Globe, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { ApplyAgentCommandCenter } from '@/components/apply-agent-command-center';
import { ApplicationCampaignTracker } from '@/components/application-campaign-tracker';
import { useAuth } from '@/components/auth-provider';
import { JobResumeHistory } from '@/components/job-resume-history';
import { JobDetailsModal, type JobDetailsModalInitialValues } from '@/components/job-details-modal';
import { JobDiscovery, type DiscoveryQueueContext } from '@/components/job-discovery';
import { JobSearchTips } from '@/components/job-search-tips';
import { MigrationBanner } from '@/components/migration-banner';
import { NewJobButton } from '@/components/new-job-button';
import { RecruiterReplyRoutingCard } from '@/components/recruiter-reply-routing-card';
import {
  bulkUpdateApplicationQueueStatus,
  listApplicationPackets,
  listApplicationQueue,
  listApplicationReceipts,
  queueApplication,
  recordManualApplicationReceipt,
  refreshApplicationQueueReadiness,
  retryApplicationQueueEntry,
  runGuardedBrowserSubmit,
  runGuardedBrowserSubmitBatch,
  runReviewedBrowserCheckBatch,
  runReviewedBrowserCheck,
  updateApplicationQueueStatus,
} from '@/lib/actions/apply-agent-actions';
import { createJobApplication, updateJobDetails, updateJobStatus } from '@/lib/actions/job-actions';
import {
  deleteProfileAnswer,
  listProfileAnswers,
  saveProfileAnswer,
} from '@/lib/actions/profile-answer-actions';
import {
  localBulkUpdateApplicationQueueStatus,
  localDeleteProfileAnswer,
  localListApplicationPackets,
  localListApplicationQueue,
  localListApplicationReceipts,
  localListJobDiscoveryAlerts,
  localListJobs,
  localGetJob,
  localListProfileAnswers,
  localListResumes,
  localListResumeHistory,
  localQueueApplication,
  localRecordManualApplicationReceipt,
  localRefreshApplicationQueueReadiness,
  localSaveJob,
  localRetryApplicationQueueEntry,
  localSaveProfileAnswer,
  localUpdateApplicationQueueStatus,
  localUpdateJobDetails,
  localUpdateJobStatus,
} from '@/lib/local-storage';
import { jobDetailsOrNull } from '@/lib/job-details';
import { normalizeJobUrl } from '@/lib/job-discovery-alerts';
import type { DiscoveredJob } from '@/lib/job-discovery-types';
import type {
  AchievementEvidence,
  ApplicationPacket,
  ApplicationQueueEntry,
  ApplicationQueueStatus,
  ApplicationReceipt,
  ApplyAgentDiscoveryAlert,
  JobApplication,
  JobDetailsPatch,
  ProfileAnswer,
  ProfileAnswerCategory,
  RecruiterReplyEvent,
  Resume,
  TailoredResume,
} from '@/lib/types';

const STATUS_OPTIONS: JobApplication['status'][] = [
  'draft',
  'tailored',
  'applied',
  'interview',
  'offer',
  'rejected',
];

const statusConfig: Record<
  string,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  draft: {
    label: 'Draft',
    dot: 'bg-muted-foreground',
    bg: 'bg-muted',
    text: 'text-[var(--muted-foreground)]',
    border: 'border-[var(--border)]',
  },
  tailored: {
    label: 'Tailored',
    dot: 'bg-[var(--primary)]',
    bg: 'bg-[var(--primary)]/5',
    text: 'text-[var(--primary)]',
    border: 'border-[var(--primary)]/20',
  },
  applied: {
    label: 'Applied',
    dot: 'bg-accent',
    bg: 'bg-accent/5',
    text: 'text-accent',
    border: 'border-accent/20',
  },
  interview: {
    label: 'Interview',
    dot: 'bg-accent',
    bg: 'bg-accent/10',
    text: 'text-accent',
    border: 'border-accent/30',
  },
  offer: {
    label: 'Offer',
    dot: 'bg-accent',
    bg: 'bg-accent/20',
    text: 'text-accent',
    border: 'border-accent/40',
  },
  rejected: {
    label: 'Rejected',
    dot: 'bg-destructive',
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/20',
  },
};

type DashboardJob = Pick<
  JobApplication,
  | 'id'
  | 'resume_id'
  | 'url'
  | 'company'
  | 'role'
  | 'status'
  | 'created_at'
  | 'updated_at'
  | 'interview_date'
  | 'follow_up_at'
  | 'salary_min'
  | 'salary_max'
  | 'salary_currency'
  | 'offer_amount'
  | 'notes'
  | 'rejection_reason'
> & { jd_text?: string };

interface DashboardProps {
  serverHistory?: TailoredResume[];
  serverResumes: Resume[];
  serverJobs: JobApplication[];
  serverFitScores?: Record<string, number>;
  serverEvidence?: AchievementEvidence[];
  browseContent?: React.ReactNode;
  serverApplicationQueue?: ApplicationQueueEntry[];
  serverApplicationReceipts?: ApplicationReceipt[];
  serverApplicationPackets?: ApplicationPacket[];
  serverProfileAnswers?: ProfileAnswer[];
  serverJobDiscoveryAlerts?: ApplyAgentDiscoveryAlert[];
  serverReplyRoutingAddress?: string | null;
  serverRecruiterReplyEvents?: RecruiterReplyEvent[];
}

function toDashboardJob(j: JobApplication): DashboardJob {
  return {
    id: j.id,
    resume_id: j.resume_id,
    jd_text: j.jd_text,
    url: j.url,
    company: j.company,
    role: j.role,
    status: j.status,
    created_at: j.created_at,
    updated_at: j.updated_at,
    ...jobDetailsOrNull(j),
  };
}

function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function Dashboard({
  serverResumes,
  serverJobs,
  serverFitScores,
  browseContent,
  serverApplicationQueue = [],
  serverApplicationReceipts = [],
  serverApplicationPackets = [],
  serverProfileAnswers = [],
  serverJobDiscoveryAlerts = [],
  serverReplyRoutingAddress = null,
  serverRecruiterReplyEvents = [],
  serverHistory = [],
}: DashboardProps) {
  const { isGuest, isPending: authPending } = useAuth();
  const [resumes, setResumes] = useState(serverResumes);
  const [jobs, setJobs] = useState<DashboardJob[]>(serverJobs.map(toDashboardJob));
  const [history, setHistory] = useState(serverHistory);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'applied' | 'resumes'>('all');
  const [query, setQuery] = useState('');
  const historyByJob = useMemo(() => {
    const grouped = new Map<string, TailoredResume[]>();
    for (const version of history)
      grouped.set(version.job_id, [...(grouped.get(version.job_id) ?? []), version]);
    return grouped;
  }, [history]);
  const [fitScores] = useState<Record<string, number>>(serverFitScores ?? {});
  const [applicationQueue, setApplicationQueue] = useState(serverApplicationQueue);
  const [applicationReceipts, setApplicationReceipts] = useState(serverApplicationReceipts);
  const appliedJobs = jobs.filter(
    (job) =>
      ['applied', 'interview', 'offer', 'rejected'].includes(job.status) ||
      applicationReceipts.some(
        (receipt) => receipt.job_id === job.id && receipt.status === 'submitted'
      )
  );
  const filteredJobs =
    historyFilter === 'applied'
      ? appliedJobs
      : historyFilter === 'resumes'
        ? jobs.filter((job) => historyByJob.has(job.id))
        : jobs;
  const visibleJobs = filteredJobs.filter((job) =>
    `${job.role} ${job.company}`.toLowerCase().includes(query.toLowerCase().trim())
  );
  const [applicationPackets, setApplicationPackets] = useState(serverApplicationPackets);
  const [profileAnswers, setProfileAnswers] = useState(serverProfileAnswers);
  const [jobDiscoveryAlerts, setJobDiscoveryAlerts] = useState(serverJobDiscoveryAlerts);
  const detailsTrigger = useRef<HTMLButtonElement | null>(null);
  const [detailsJobId, setDetailsJobId] = useState<string | null>(null);
  const [nowSec, setNowSec] = useState<number>(0);

  // Intentional: hydrate from localStorage for guest users after auth context resolves
  useEffect(() => {
    if (authPending) return;
    if (isGuest) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setResumes(localListResumes());
      setJobs(localListJobs());
      setHistory(localListResumeHistory());
      setApplicationQueue(localListApplicationQueue());
      setApplicationReceipts(localListApplicationReceipts());
      setApplicationPackets(localListApplicationPackets());
      setProfileAnswers(localListProfileAnswers());
      setJobDiscoveryAlerts(localListJobDiscoveryAlerts());
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [authPending, isGuest]);

  // Capture a stable "now" for alerts (client-only to avoid impure render)
  useEffect(() => {
    setNowSec(Math.floor(Date.now() / 1000)); // eslint-disable-line react-hooks/set-state-in-effect -- client-only seed
  }, []);

  async function handleStatusChange(jobId: string, newStatus: string) {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, status: newStatus as JobApplication['status'] } : j
      )
    );
    if (isGuest) {
      localUpdateJobStatus(jobId, newStatus as JobApplication['status']);
    } else {
      await updateJobStatus(jobId, newStatus);
    }
  }

  async function handleDetailsSave(jobId: string, patch: JobDetailsPatch): Promise<void> {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...patch } : j)));
    if (isGuest) {
      localUpdateJobDetails(jobId, patch);
    } else {
      await updateJobDetails(jobId, patch);
    }
  }

  async function refreshApplyAgentState(): Promise<void> {
    if (isGuest) {
      setApplicationQueue(localListApplicationQueue());
      setApplicationReceipts(localListApplicationReceipts());
      setApplicationPackets(localListApplicationPackets());
      setProfileAnswers(localListProfileAnswers());
      return;
    }

    const [queue, receipts, packets, answers] = await Promise.all([
      listApplicationQueue(),
      listApplicationReceipts(),
      listApplicationPackets(),
      listProfileAnswers(),
    ]);
    setApplicationQueue(queue);
    setApplicationReceipts(receipts);
    setApplicationPackets(packets);
    setProfileAnswers(answers);
  }

  async function handleQueueApplication(jobId: string): Promise<void> {
    if (isGuest) {
      localQueueApplication(jobId);
      await refreshApplyAgentState();
      return;
    }
    await queueApplication(jobId);
    await refreshApplyAgentState();
  }

  function discoveryQueueNote(context?: DiscoveryQueueContext): string | null {
    if (!context?.semanticScore) return null;
    const evidence =
      context.matchTerms && context.matchTerms.length > 0
        ? ` Evidence: ${context.matchTerms.join(', ')}.`
        : '';
    return `RolePatch semantic match: ${context.semanticScore}% resume match.${evidence}`;
  }

  function mergeRolePatchQueueNote(
    existing: string | null | undefined,
    note: string | null,
    marker: string
  ): string | null {
    if (!note) return existing ?? null;
    if (!existing?.trim()) return note;
    if (existing.includes(marker)) return existing;
    return `${existing.trim()}\n\n${note}`;
  }

  function discoveryAlertNote(alert: ApplyAgentDiscoveryAlert): string {
    const parts = [alert.source, alert.location].filter(Boolean);
    return parts.length > 0
      ? `RolePatch discovery alert: ${parts.join(' · ')}.`
      : 'RolePatch discovery alert.';
  }

  async function handleQueueDiscoveryAlert(alert: ApplyAgentDiscoveryAlert): Promise<void> {
    if (!alert.job_url) throw new Error('This discovery alert does not include a job URL');
    const resume = resumes[0];
    if (!resume) throw new Error('Create a base resume before queueing discovery alerts');
    const normalizedAlertUrl = normalizeJobUrl(alert.job_url);
    const existing = jobs.find((job) => job.url && normalizeJobUrl(job.url) === normalizedAlertUrl);
    const note = discoveryAlertNote(alert);
    if (existing) {
      const mergedNote = mergeRolePatchQueueNote(existing.notes, note, 'RolePatch discovery alert');
      if (mergedNote !== existing.notes) {
        if (isGuest) localUpdateJobDetails(existing.id, { notes: mergedNote });
        else await updateJobDetails(existing.id, { notes: mergedNote });
        setJobs((prev) =>
          prev.map((job) => (job.id === existing.id ? { ...job, notes: mergedNote } : job))
        );
      }
      await handleQueueApplication(existing.id);
      return;
    }

    const company = alert.company || alert.detail.split('·')[0]?.trim() || 'Unknown Company';
    const role = alert.title || 'Untitled Role';
    const jdText = alert.detail || `${company} discovery alert`;

    if (isGuest) {
      const jobId = crypto.randomUUID();
      localSaveJob(jobId, company, role, resume.id, alert.job_url, jdText, jdText);
      localUpdateJobDetails(jobId, { notes: note });
      localQueueApplication(jobId);
      setJobs(localListJobs());
      await refreshApplyAgentState();
      return;
    }

    const jobId = await createJobApplication(
      resume.id,
      alert.job_url,
      company,
      role,
      jdText,
      jdText
    );
    await updateJobDetails(jobId, { notes: note });
    await queueApplication(jobId);
    const now = Math.floor(Date.now() / 1000);
    setJobs((prev) => [
      {
        id: jobId,
        resume_id: resume.id,
        url: alert.job_url ?? '',
        company,
        role,
        jd_text: jdText,
        status: 'draft',
        created_at: now,
        updated_at: now,
        interview_date: null,
        follow_up_at: null,
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        offer_amount: null,
        notes: note,
        rejection_reason: null,
      },
      ...prev,
    ]);
    await refreshApplyAgentState();
  }

  async function handleQueueDiscoveryAlerts(alerts: ApplyAgentDiscoveryAlert[]): Promise<void> {
    const seenUrls = new Set<string>();
    const uniqueAlerts = alerts.filter((alert) => {
      if (!alert.job_url) return false;
      const normalized = normalizeJobUrl(alert.job_url);
      if (seenUrls.has(normalized)) return false;
      seenUrls.add(normalized);
      return true;
    });
    for (const alert of uniqueAlerts) {
      await handleQueueDiscoveryAlert(alert);
    }
  }

  async function handleQueueDiscoveredJob(
    job: DiscoveredJob,
    resumeId: string,
    context?: DiscoveryQueueContext
  ): Promise<void> {
    if (!job.job_url) throw new Error('This job does not include a job URL');
    if (!resumeId) throw new Error('Create a base resume before queueing jobs');
    const note = discoveryQueueNote(context);
    const normalizedJobUrl = normalizeJobUrl(job.job_url);
    const existing = jobs.find(
      (item) => item.url && normalizeJobUrl(item.url) === normalizedJobUrl
    );
    if (existing) {
      const mergedNote = mergeRolePatchQueueNote(existing.notes, note, 'RolePatch semantic match:');
      if (mergedNote !== existing.notes) {
        if (isGuest) localUpdateJobDetails(existing.id, { notes: mergedNote });
        else await updateJobDetails(existing.id, { notes: mergedNote });
        setJobs((prev) =>
          prev.map((item) => (item.id === existing.id ? { ...item, notes: mergedNote } : item))
        );
      }
      await handleQueueApplication(existing.id);
      return;
    }

    const company = job.company || 'Unknown Company';
    const role = job.title || 'Untitled Role';
    const jdText = job.description || job.description_short || `${role} at ${company}`;

    if (isGuest) {
      const jobId = crypto.randomUUID();
      localSaveJob(jobId, company, role, resumeId, job.job_url, jdText, jdText);
      if (note) localUpdateJobDetails(jobId, { notes: note });
      localQueueApplication(jobId);
      setJobs(localListJobs());
      await refreshApplyAgentState();
      return;
    }

    const jobId = await createJobApplication(resumeId, job.job_url, company, role, jdText, jdText);
    if (note) await updateJobDetails(jobId, { notes: note });
    await queueApplication(jobId);
    const now = Math.floor(Date.now() / 1000);
    setJobs((prev) => [
      {
        id: jobId,
        resume_id: resumeId,
        url: job.job_url ?? '',
        company,
        role,
        jd_text: jdText,
        status: 'draft',
        created_at: now,
        updated_at: now,
        interview_date: null,
        follow_up_at: null,
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        offer_amount: null,
        notes: note,
        rejection_reason: null,
      },
      ...prev,
    ]);
    await refreshApplyAgentState();
  }

  async function handleQueueReadyApplications(): Promise<void> {
    const queued = new Set(applicationQueue.map((entry) => entry.job_id));
    const readyJobs = jobs.filter((job) => job.status === 'tailored' && !queued.has(job.id));
    if (isGuest) {
      for (const job of readyJobs) localQueueApplication(job.id);
      await refreshApplyAgentState();
      return;
    }
    await Promise.all(readyJobs.map((job) => queueApplication(job.id)));
    await refreshApplyAgentState();
  }

  async function handleRefreshReadiness(): Promise<void> {
    if (isGuest) {
      setApplicationQueue(localRefreshApplicationQueueReadiness());
      setApplicationPackets(localListApplicationPackets());
      return;
    }
    setApplicationQueue(await refreshApplicationQueueReadiness());
    setApplicationPackets(await listApplicationPackets());
  }

  async function handleUpdateQueueStatus(
    queueId: string,
    status: ApplicationQueueStatus
  ): Promise<void> {
    if (isGuest) {
      localUpdateApplicationQueueStatus(queueId, status);
      setApplicationQueue(localListApplicationQueue());
      return;
    }
    await updateApplicationQueueStatus(queueId, status);
    setApplicationQueue(await listApplicationQueue());
  }

  async function handleBulkUpdateQueueStatus(
    queueIds: string[],
    status: Exclude<ApplicationQueueStatus, 'submitted'>
  ): Promise<void> {
    if (queueIds.length === 0) return;
    if (isGuest) {
      localBulkUpdateApplicationQueueStatus(queueIds, status);
      setApplicationQueue(localListApplicationQueue());
      return;
    }
    await bulkUpdateApplicationQueueStatus(queueIds, status);
    setApplicationQueue(await listApplicationQueue());
  }

  async function handleRetryQueueEntry(queueId: string): Promise<void> {
    if (isGuest) {
      localRetryApplicationQueueEntry(queueId);
      await refreshApplyAgentState();
      return;
    }
    await retryApplicationQueueEntry(queueId);
    await refreshApplyAgentState();
  }

  async function handleRecordManualReceipt(queueId: string): Promise<void> {
    const entry = applicationQueue.find((item) => item.id === queueId);
    if (isGuest) {
      localRecordManualApplicationReceipt(queueId);
      setJobs(localListJobs());
      await refreshApplyAgentState();
      return;
    }
    await recordManualApplicationReceipt({ queueId });
    if (entry) {
      setJobs((prev) =>
        prev.map((job) => (job.id === entry.job_id ? { ...job, status: 'applied' } : job))
      );
    }
    await refreshApplyAgentState();
  }

  async function handleRunBrowserCheck(queueId: string): Promise<void> {
    if (isGuest) throw new Error('Sign in to run reviewed browser checks');
    await runReviewedBrowserCheck(queueId);
    await refreshApplyAgentState();
  }

  async function handleRunBrowserCheckBatch(queueIds: string[]): Promise<void> {
    if (isGuest) throw new Error('Sign in to run reviewed browser checks');
    await runReviewedBrowserCheckBatch(queueIds);
    await refreshApplyAgentState();
  }

  async function handleRunGuardedSubmit(queueId: string): Promise<void> {
    if (isGuest) throw new Error('Sign in to run guarded submit');
    await runGuardedBrowserSubmit(queueId);
    await refreshApplyAgentState();
  }

  async function handleRunGuardedSubmitBatch(queueIds: string[]): Promise<void> {
    if (isGuest) throw new Error('Sign in to run guarded submit');
    await runGuardedBrowserSubmitBatch(queueIds);
    await refreshApplyAgentState();
  }

  async function handleSaveProfileAnswer(input: {
    id?: string;
    category: ProfileAnswerCategory;
    label: string;
    answer: string;
    sensitive: boolean;
  }): Promise<void> {
    if (isGuest) {
      localSaveProfileAnswer(input);
      setApplicationQueue(localRefreshApplicationQueueReadiness());
      await refreshApplyAgentState();
      return;
    }
    await saveProfileAnswer(input);
    setApplicationQueue(await refreshApplicationQueueReadiness());
    await refreshApplyAgentState();
  }

  async function handleDeleteProfileAnswer(id: string): Promise<void> {
    if (isGuest) {
      localDeleteProfileAnswer(id);
      setApplicationQueue(localRefreshApplicationQueueReadiness());
      await refreshApplyAgentState();
      return;
    }
    await deleteProfileAnswer(id);
    setApplicationQueue(await refreshApplicationQueueReadiness());
    await refreshApplyAgentState();
  }

  const alerts = useMemo(() => {
    if (nowSec === 0) return { interviewsThisWeek: 0, overdueFollowUps: 0 };
    const weekFromNow = nowSec + 7 * 24 * 60 * 60;
    const interviewsThisWeek = jobs.filter(
      (j) =>
        j.interview_date != null && j.interview_date >= nowSec && j.interview_date <= weekFromNow
    ).length;
    const overdueFollowUps = jobs.filter(
      (j) =>
        j.follow_up_at != null &&
        j.follow_up_at < nowSec &&
        j.status !== 'rejected' &&
        j.status !== 'offer'
    ).length;
    return { interviewsThisWeek, overdueFollowUps };
  }, [jobs, nowSec]);

  const activeDetailsJob = useMemo(
    () => jobs.find((j) => j.id === detailsJobId) ?? null,
    [jobs, detailsJobId]
  );
  // Stable reference keyed on jobId so the modal only resets when switching
  // jobs, not on every parent re-render.
  const detailsInitial = useMemo<JobDetailsModalInitialValues | null>(() => {
    if (!activeDetailsJob) return null;
    return {
      interview_date: activeDetailsJob.interview_date,
      follow_up_at: activeDetailsJob.follow_up_at,
      salary_min: activeDetailsJob.salary_min,
      salary_max: activeDetailsJob.salary_max,
      salary_currency: activeDetailsJob.salary_currency,
      offer_amount: activeDetailsJob.offer_amount,
      notes: activeDetailsJob.notes,
      rejection_reason: activeDetailsJob.rejection_reason,
    };
  }, [activeDetailsJob]);

  return (
    <main className="min-w-0 flex-1 space-y-6 p-4 md:p-6">
      <MigrationBanner />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="mt-2 text-muted-foreground">
            {isGuest
              ? 'Add a job, review your tailored resume, and track your application. Guest work stays in this browser.'
              : 'Add a job, review your tailored resume, and track your application.'}
          </p>
        </div>
        <NewJobButton resumes={resumes.map((r) => ({ id: r.id, name: r.name }))} />
      </div>

      {/* Alerts — interviews this week, overdue follow-ups */}
      {(alerts.interviewsThisWeek > 0 || alerts.overdueFollowUps > 0) && (
        <div className="mb-8 flex flex-wrap gap-3">
          {alerts.interviewsThisWeek > 0 && (
            <div className="flex items-center gap-2.5 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] rounded-xl px-4 py-2.5 text-xs font-bold">
              <Calendar className="w-4 h-4" />
              <span>
                {alerts.interviewsThisWeek} interview{alerts.interviewsThisWeek === 1 ? '' : 's'}{' '}
                this week
              </span>
            </div>
          )}
          {alerts.overdueFollowUps > 0 && (
            <div className="flex items-center gap-2.5 bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 text-[var(--destructive)] rounded-xl px-4 py-2.5 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>
                {alerts.overdueFollowUps} overdue follow-up
                {alerts.overdueFollowUps === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>
      )}

      {resumes.length === 0 && (
        <p className="mb-8 rounded-lg border border-[var(--border)] p-4">
          Start by{' '}
          <Link href="/resume-builder" className="font-semibold underline">
            building your master resume
          </Link>
          , then add your first job.
        </p>
      )}

      {/* Job Applications section */}
      <section id="history" aria-labelledby="history-heading">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="history-heading" className="text-base font-semibold">
              History
            </h2>
            <Badge variant="secondary">
              {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
            </Badge>
          </div>
          <Input
            aria-label="Search jobs"
            placeholder="Search jobs…"
            className="w-full sm:w-64"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Every job and its saved tailored resumes. Generating a draft does not apply for a job.
        </p>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter history">
          {(
            [
              { id: 'all', label: `All jobs (${jobs.length})` },
              { id: 'applied', label: `Applied and later (${appliedJobs.length})` },
              {
                id: 'resumes',
                label: `With resumes (${jobs.filter((job) => historyByJob.has(job.id)).length})`,
              },
            ] as const
          ).map((filter) => (
            <Button
              key={filter.id}
              variant={historyFilter === filter.id ? 'secondary' : 'ghost'}
              type="button"
              aria-pressed={historyFilter === filter.id}
              onClick={() => setHistoryFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        {visibleJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-md bg-muted">
              <Globe className="w-8 h-8 text-[var(--muted-foreground)]/30" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {jobs.length ? 'No jobs match this filter' : 'No job history yet'}
            </p>
            <p className="text-xs font-medium text-[var(--muted-foreground)] mt-2">
              Add a job URL or paste its description to tailor your resume.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role & company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Resumes</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>
                    <span className="sr-only">Open job</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleJobs.map((job) => (
                  <Fragment key={job.id}>
                    <TableRow>
                      <TableCell>
                        <button
                          type="button"
                          className="text-left font-medium hover:underline"
                          onClick={(event) => {
                            detailsTrigger.current = event.currentTarget;
                            setDetailsJobId(job.id);
                          }}
                        >
                          {job.role || 'Untitled Role'}
                        </button>
                        <div className="text-sm text-muted-foreground">
                          {job.company || 'Unknown Company'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <select
                          aria-label={`Application status for ${job.role || 'Untitled Role'}`}
                          value={job.status}
                          onChange={(event) => handleStatusChange(job.id, event.target.value)}
                          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {statusConfig[status]?.label ?? status}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{historyByJob.get(job.id)?.length ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {timeAgo(job.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            href={`/tailor/${job.id}`}
                            aria-label="Open tailor"
                            prefetch={false}
                          >
                            <ArrowRight />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={5}>
                        <JobResumeHistory
                          role={job.role || 'Job description'}
                          company={job.company}
                          versions={historyByJob.get(job.id) ?? []}
                        />
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <details className="mt-8 mb-8 border-t border-[var(--border)] pt-6">
        <summary className="cursor-pointer text-lg font-bold">Find more jobs</summary>
        {/* Stats bar — only show when there are jobs */}
        {/* Discover jobs section */}
        <section className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/5 flex items-center justify-center text-[var(--primary)] shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Discover jobs</h2>
              <p className="text-xs font-medium text-[var(--muted-foreground)] opacity-100">
                Search LinkedIn or paste any ATS job URL — Ashby, Greenhouse, Lever, and more
              </p>
            </div>
          </div>
          <JobDiscovery
            resumes={resumes.map((r) => ({ id: r.id, name: r.name, source: r.source }))}
            onQueueDiscoveredJob={handleQueueDiscoveredJob}
          />
          <div className="mt-4">
            <JobSearchTips />
          </div>
        </section>

        {browseContent}
      </details>
      <details className="mt-8 mb-8 border-t border-[var(--border)] pt-6">
        <summary className="cursor-pointer text-lg font-bold">
          Application preparation & follow-ups
        </summary>
        <div className="pt-6">
          <ApplicationCampaignTracker jobs={jobs} onOpenDetails={setDetailsJobId} />

          {!isGuest && (
            <RecruiterReplyRoutingCard
              address={serverReplyRoutingAddress}
              events={serverRecruiterReplyEvents}
            />
          )}

          <ApplyAgentCommandCenter
            jobs={jobs}
            resumeCount={resumes.length}
            fitScores={fitScores}
            queue={applicationQueue}
            receipts={applicationReceipts}
            packets={applicationPackets}
            profileAnswers={profileAnswers}
            discoveryAlerts={jobDiscoveryAlerts}
            onQueueApplication={handleQueueApplication}
            onQueueDiscoveryAlert={handleQueueDiscoveryAlert}
            onQueueDiscoveryAlerts={handleQueueDiscoveryAlerts}
            onQueueReadyApplications={handleQueueReadyApplications}
            onRefreshReadiness={handleRefreshReadiness}
            onUpdateQueueStatus={handleUpdateQueueStatus}
            onBulkUpdateQueueStatus={handleBulkUpdateQueueStatus}
            onRetryQueueEntry={handleRetryQueueEntry}
            onRecordManualReceipt={handleRecordManualReceipt}
            onRunBrowserCheck={handleRunBrowserCheck}
            onRunBrowserCheckBatch={handleRunBrowserCheckBatch}
            onRunGuardedSubmit={handleRunGuardedSubmit}
            onRunGuardedSubmitBatch={handleRunGuardedSubmitBatch}
            onSaveProfileAnswer={handleSaveProfileAnswer}
            onDeleteProfileAnswer={handleDeleteProfileAnswer}
          />
        </div>
      </details>

      {detailsInitial && activeDetailsJob && (
        <JobDetailsModal
          open={detailsJobId !== null}
          jobTitle={activeDetailsJob.role}
          company={activeDetailsJob.company}
          initial={detailsInitial}
          description={
            activeDetailsJob.jd_text ?? (isGuest ? localGetJob(activeDetailsJob.id)?.jd_text : '')
          }
          versions={historyByJob.get(activeDetailsJob.id) ?? []}
          onClose={() => setDetailsJobId(null)}
          onReturnFocus={() => detailsTrigger.current?.focus()}
          onSave={(patch) => handleDetailsSave(activeDetailsJob.id, patch)}
        />
      )}
    </main>
  );
}
