import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { parseJsonObjectInput } from '@/lib/json-route-input';
import { searchJobs, toUserFacingJobSearchError } from '@/lib/job-search';
import { verifyTurnstile } from '@/lib/turnstile';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseJsonObjectInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const params = parsed.body;
  const query = typeof params.query === 'string' ? params.query.trim() : '';
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const verified = await verifyTurnstile({
    token: params.turnstileToken,
    action: 'turnstile-spin-v2',
    remoteIp:
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  });
  if (!verified) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
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
    const safeError = toUserFacingJobSearchError(err);
    return NextResponse.json({ error: safeError.message, detail: safeError }, { status: 502 });
  }
}
