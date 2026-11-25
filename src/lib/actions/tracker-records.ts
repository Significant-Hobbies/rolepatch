'use server';
import { getCurrentUserId } from '@/lib/auth-utils';
import { performTracker, type TrackerResult } from '@/lib/tracker-store';
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
