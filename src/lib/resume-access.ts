import { AsyncLocalStorage } from 'node:async_hooks';
import { db } from '@/lib/db';

const identity = new AsyncLocalStorage<string>();
const prefix = 'rp_resume_v1';
const lifetime = 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();

export function getResumeApiUserId(): string | undefined {
  return identity.getStore();
}

function encode(value: string | Uint8Array): string {
  return (typeof value === 'string' ? Buffer.from(value) : Buffer.from(value)).toString(
    'base64url'
  );
}

async function signingKey(sessionToken: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(sessionToken),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function issueResumeAccess(
  session: { id: string; token: string; expiresAt: Date },
  now = Date.now()
) {
  const expires = Math.min(new Date(session.expiresAt).getTime(), now + lifetime);
  if (!Number.isFinite(expires) || expires <= now) throw new Error('Session expired');
  const payload = encode(JSON.stringify({ sid: session.id, exp: expires, scope: 'resume' }));
  const message = `${prefix}.${payload}`;
  const signature = await crypto.subtle.sign(
    'HMAC',
    await signingKey(session.token),
    encoder.encode(message)
  );
  return {
    token: `${message}.${encode(new Uint8Array(signature))}`,
    expires_at: new Date(expires).toISOString(),
  };
}

async function verifyResumeAccess(token: string, now = Date.now()): Promise<string | null> {
  if (token.length > 2048) return null;
  const parts = token.split('.');
  if (
    parts.length !== 3 ||
    parts[0] !== prefix ||
    !/^[\w-]+$/.test(parts[1]) ||
    !/^[\w-]{43}$/.test(parts[2])
  )
    return null;
  let payload: { sid?: unknown; exp?: unknown; scope?: unknown };
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (
    !payload ||
    typeof payload.sid !== 'string' ||
    payload.sid.length > 200 ||
    !payload.sid ||
    payload.scope !== 'resume' ||
    typeof payload.exp !== 'number' ||
    !Number.isSafeInteger(payload.exp) ||
    payload.exp <= now ||
    payload.exp > now + lifetime
  )
    return null;
  const result = await db.execute({
    sql: 'SELECT token, userId, expiresAt FROM "session" WHERE id = ? LIMIT 1',
    args: [payload.sid],
  });
  const session = result.rows[0];
  if (!session || typeof session.token !== 'string' || typeof session.userId !== 'string')
    return null;
  const expires = new Date(String(session.expiresAt)).getTime();
  if (!Number.isFinite(expires) || expires <= now || payload.exp > expires) return null;
  const valid = await crypto.subtle.verify(
    'HMAC',
    await signingKey(session.token),
    Buffer.from(parts[2], 'base64url'),
    encoder.encode(`${prefix}.${parts[1]}`)
  );
  return valid ? session.userId : null;
}

/** Only these two facades may delegate their owner-scoped actions to a capability. */
export async function withResumeAccess(
  request: Request,
  action: () => Promise<Response>,
  requireAccount = false
): Promise<Response> {
  const authorization = request.headers.get('authorization');
  if (!authorization && !requireAccount) return action();
  const path = new URL(request.url).pathname;
  let userId: string | null = null;
  let insufficientScope = false;
  try {
    if (
      authorization &&
      ['/api/resume', '/api/mcp'].includes(path) &&
      /^Bearer rp_resume_v1\.[\w-]+\.[\w-]+$/i.test(authorization)
    )
      userId = await verifyResumeAccess(authorization.slice(7));
    else if (['/api/resume', '/api/mcp'].includes(path)) {
      if (authorization) {
        const { verifyResumeOAuth } = await import('@/lib/resume-oauth');
        userId = await verifyResumeOAuth(request);
      } else {
        const { getAuth } = await import('@/lib/auth');
        const session = await getAuth().api.getSession({ headers: request.headers });
        if (session) return action();
      }
    }
  } catch (error) {
    insufficientScope = error instanceof Error && error.name === 'ResumeOAuthScopeError';
    // Auth/storage errors are fail-closed, without leaking credentials or falling back to guests.
  }
  if (!userId)
    return Response.json(
      {
        ok: false,
        code: 'invalid_access_token',
        error: insufficientScope
          ? 'Authorize resume access for this connection.'
          : 'Connect your account or create a new API token in Settings.',
      },
      {
        status: insufficientScope ? 403 : 401,
        headers: {
          'Cache-Control': 'private, no-store',
          'WWW-Authenticate': `Bearer resource_metadata="${new URL(request.url).origin}/.well-known/oauth-protected-resource${path}", scope="resume", error="${insufficientScope ? 'insufficient_scope' : 'invalid_token'}"`,
        },
      }
    );
  return identity.run(userId, action);
}
