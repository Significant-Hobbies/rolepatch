import {
  createDpopReplayStore,
  enforceDpopBinding,
  parseAccessTokenAuthorization,
  verifyJwsAccessToken,
} from 'better-auth/oauth2';
import { getAuth } from '@/lib/auth';
import { db } from '@/lib/db';

function includesJSON(value: unknown, item: string) {
  try {
    const values = JSON.parse(String(value));
    return Array.isArray(values) && values.includes(item);
  } catch {
    return false;
  }
}

/** Official JWT/DPoP verification plus current owner/session/consent checks. */
export async function verifyResumeOAuth(request: Request): Promise<string | null> {
  const authorization = parseAccessTokenAuthorization(request.headers.get('authorization'));
  if (!authorization) return null;
  const auth = getAuth();
  const context = await auth.$context;
  const resource = `${new URL(context.baseURL).origin}${new URL(request.url).pathname}`;
  const payload = await verifyJwsAccessToken(authorization.token, {
    jwksFetch: () => auth.api.getJwks(),
    jwksCacheKey: auth,
    verifyOptions: { issuer: context.baseURL, audience: resource, typ: 'at+jwt' },
  });
  await enforceDpopBinding({
    payload,
    authorization,
    proofJwt: request.headers.get('dpop'),
    method: request.method,
    url: request.url,
    replayStore: createDpopReplayStore(context.internalAdapter),
  });
  if (typeof payload.scope !== 'string' || !payload.scope.split(' ').includes('resume'))
    throw new ResumeOAuthScopeError();
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    typeof payload.client_id !== 'string'
  )
    return null;
  const result = await db.execute({
    sql: `SELECT s.expiresAt, c.scopes, c.resources
      FROM "session" s
      JOIN "oauthConsent" c ON c.userId = s.userId
      JOIN "oauthClient" client ON client.clientId = c.clientId
      WHERE s.id = ? AND s.userId = ? AND c.clientId = ?
        AND (client.disabled IS NULL OR client.disabled = 0)`,
    args: [payload.sid, payload.sub, payload.client_id],
  });
  return result.rows.some(
    (row) =>
      new Date(String(row.expiresAt)).getTime() > Date.now() &&
      includesJSON(row.scopes, 'resume') &&
      includesJSON(row.resources, resource)
  )
    ? payload.sub
    : null;
}

class ResumeOAuthScopeError extends Error {
  override readonly name = 'ResumeOAuthScopeError';
}
