import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { getCurrentUserId } from '@/lib/auth-utils';

// Per-user sliding-window rate limit.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const stamps = (rateLimitMap.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (stamps.length >= RATE_LIMIT_MAX) return false;
  stamps.push(now);
  rateLimitMap.set(key, stamps);
  return true;
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to discover jobs' }, { status: 401 });
  }

  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded — max 5 searches per minute.' },
      { status: 429 },
    );
  }

  const serviceKey = process.env.JOBSPY_API_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'Job discovery is not configured on this deployment.' },
      { status: 503 },
    );
  }
  // Same-origin Vercel Python function. VERCEL_URL is set on Vercel; fall back
  // to request origin so local `vercel dev` works too.
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : new URL(req.url).origin;
  const serviceUrl = `${origin}/api/python/jobs-search`;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const res = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    const text = await res.text();
    // Pass through the sidecar's content as-is so clients see real errors.
    if (!res.ok) {
      return new NextResponse(text, {
        status: res.status >= 500 ? 502 : res.status,
        headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
      });
    }
    return new NextResponse(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Job discovery service unavailable: ${message}` },
      { status: 502 },
    );
  }
}
