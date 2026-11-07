import { NextResponse } from 'next/server';
import { tailorResumeFromReference } from '@/lib/actions/resume-assistant-actions';
import { withResumeAccess } from '@/lib/resume-access';

export const dynamic = 'force-dynamic';
const limits = new Map<string, { count: number; reset: number }>();
const headers = { 'Cache-Control': 'private, no-store' };
const failure = (status: number, code: string, error: string) =>
  NextResponse.json({ ok: false, code, error }, { status, headers });

/** Plain JSON facade; auth, generation, billing and writes stay in existing server actions. */
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin)
    return failure(403, 'origin_not_allowed', 'Origin not allowed');
  if (req.headers.get('sec-fetch-site') === 'cross-site')
    return failure(403, 'origin_not_allowed', 'Cross-site browser requests are not allowed');
  if (!req.headers.get('content-type')?.includes('application/json'))
    return failure(415, 'invalid_content_type', 'Use application/json');
  const reader = req.body?.getReader();
  if (!reader) return failure(400, 'invalid_input', 'Empty request');
  const decoder = new TextDecoder();
  let text = '',
    size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 100_000) {
        await reader.cancel();
        return failure(413, 'request_too_large', 'Request too large');
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return failure(400, 'invalid_input', 'Could not read request');
  } finally {
    reader.releaseLock();
  }
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return failure(400, 'invalid_input', 'Invalid JSON');
  }
  const now = Date.now();
  for (const [key, state] of limits) if (state.reset <= now) limits.delete(key);
  const key = req.headers.get('cf-connecting-ip') ?? 'local';
  const state = limits.get(key) ?? { count: 0, reset: now + 60_000 };
  if (state.count >= 10 || limits.size >= 1000)
    return failure(429, 'rate_limited', 'Too many requests. Wait a minute and retry.');
  state.count++;
  limits.set(key, state);
  try {
    return await withResumeAccess(req, async () => {
      const result = await tailorResumeFromReference(input, true);
      const status = result.ok
        ? 200
        : result.code === 'sign_in_required'
          ? 401
          : result.code === 'not_found'
            ? 404
            : result.code === 'generation_failed' || result.code === 'extraction_failed'
              ? 502
              : 400;
      return NextResponse.json(result, { status, headers });
    });
  } catch {
    return failure(503, 'unavailable', 'Resume preparation is unavailable. Please retry.');
  }
}

export function GET() {
  return failure(
    405,
    'method_not_allowed',
    'Use POST with your master resume and job description.'
  );
}
