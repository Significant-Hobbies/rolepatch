'use server';

import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { issueResumeAccess } from '@/lib/resume-access';

export async function createResumeApiAccess() {
  const userId = await getCurrentUserId();
  if (!userId)
    return {
      ok: false as const,
      error: 'Sign in with Google to connect your saved master resume.',
    };
  const session = await getAuth().api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!session || session.user.id !== userId)
    return { ok: false as const, error: 'Your session ended. Sign in again.' };
  return { ok: true as const, ...(await issueResumeAccess(session.session)) };
}

/** Revokes all capabilities linked to this browser session; other sessions stay signed in. */
export async function disconnectResumeApiAccess() {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, error: 'Sign in to disconnect this session.' };
  const session = await getAuth().api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!session || session.user.id !== userId)
    return { ok: false as const, error: 'Your session ended.' };
  await db.execute({
    sql: 'DELETE FROM "session" WHERE id = ? AND userId = ?',
    args: [session.session.id, userId],
  });
  return { ok: true as const };
}
