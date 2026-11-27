import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { queueApplyAgentApplicationForUser } from '@/lib/apply-agent-api';
import { getCurrentUserId } from '@/lib/auth-utils';
import { extensionCorsHeaders } from '@/lib/extension-cors';
import { parseExtensionJobInput } from '@/lib/extension-route-input';
import { captureExtensionOpening } from '@/lib/saved-job';

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: extensionCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const headers = extensionCorsHeaders(req);
  const authHeaders = new Headers(req.headers);
  const forwardedSession = req.headers.get('x-rolepatch-session');
  if (forwardedSession && !authHeaders.has('cookie')) {
    authHeaders.set('cookie', forwardedSession);
  }

  const userId = await getCurrentUserId(authHeaders);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'Not authenticated', redirect_url: '/api/auth/signin' },
      { status: 401, headers }
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400, headers });
  }

  const parsed = parseExtensionJobInput(payload);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400, headers });
  }

  const { url, jdText } = parsed.input;
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, error: 'url must be http(s)' }, { status: 400, headers });
  }
  if (jdText.length < 50) {
    return NextResponse.json({ ok: false, error: 'jd_text too short' }, { status: 400, headers });
  }
  const saved=await captureExtensionOpening(userId,parsed.input);
  if(!saved)return NextResponse.json({ok:false,error:'Create a resume first',redirect_url:'/dashboard'},{status:400,headers});
  const {id:jobId,existing}=saved;
  const shouldQueue = parsed.input.queue !== false;
  let queueId: string | null = null;
  if (shouldQueue) {
    const entry = await queueApplyAgentApplicationForUser(userId, jobId);
    queueId = entry.id;
  }

  return NextResponse.json(
    {
      ok: true,
      job_id: jobId,
      queue_id: queueId,
      existing,
      redirect_url: shouldQueue ? '/jobs/queue' : `/tailor/${jobId}`,
    },
    { status: existing ? 200 : 201, headers }
  );
}
