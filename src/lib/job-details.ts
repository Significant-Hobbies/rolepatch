import type { JobApplication } from '@/lib/types';

const JOB_DETAIL_KEYS = [
  'interview_date',
  'follow_up_at',
  'salary_min',
  'salary_max',
  'salary_currency',
  'offer_amount',
  'notes',
  'rejection_reason',
] as const;

type JobDetails = Pick<JobApplication, (typeof JOB_DETAIL_KEYS)[number]>;

/** Normalizes optional job detail fields, mapping missing values to null. */
export function jobDetailsOrNull(job: Partial<JobDetails>): JobDetails {
  const details: Record<string, unknown> = {};
  for (const key of JOB_DETAIL_KEYS) details[key] = job[key] ?? null;
  return details as JobDetails;
}
