'use server';
import { getCurrentUserId } from '@/lib/auth-utils';
import {
  performTracker,
  summarizeApplications,
  type ApplicationAnalyticsRange,
  type TrackerResult,
} from '@/lib/tracker-store';

export async function getApplicationAnalytics(days: ApplicationAnalyticsRange, localDate: string) {
  const owner = await getCurrentUserId();
  if (!owner) return { ok: false as const, error: 'Sign in to view application analytics.' };
  if (days !== 30 && days !== 90 && days !== 365)
    return { ok: false as const, error: 'Choose a supported reporting period.' };
  const today = Date.parse(`${localDate}T00:00:00Z`) / 1000;
  const utcToday = Math.floor(Date.now() / 86_400_000) * 86400;
  if (!Number.isFinite(today) || Math.abs(today - utcToday) > 86400)
    return { ok: false as const, error: 'Check your device date and try again.' };
  try {
    return { ok: true as const, summary: await summarizeApplications(owner, days, today) };
  } catch {
    return { ok: false as const, error: 'Could not load application analytics. Please retry.' };
  }
}
export async function callTracker(name: string, args: unknown): Promise<TrackerResult> {
  const owner = await getCurrentUserId();
  if (!owner)
    return {
      ok: false,
      code: 'unauthenticated',
      error: 'Sign in to access your application tracker.',
    };
  return performTracker(owner, name, args);
}
