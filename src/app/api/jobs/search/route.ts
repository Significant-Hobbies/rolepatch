import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getCurrentUserId } from '@/lib/auth-utils';
import { searchJobs } from '@/lib/job-search';

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to discover jobs' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const params = (body ?? {}) as Record<string, unknown>;
  const query = typeof params.query === 'string' ? params.query.trim() : '';
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  try {
    const result = await searchJobs({
      query,
      location: typeof params.location === 'string' ? params.location : null,
      remote: Boolean(params.remote ?? params.is_remote),
      results_wanted: Number(params.results_wanted) || 25,
      hours_old: Number(params.hours_old) || 168,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Job search failed: ${message}` }, { status: 502 });
  }
}
