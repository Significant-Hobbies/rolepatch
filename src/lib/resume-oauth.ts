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
export async function verifyResumeOAuth(
  request: Request,
  requiredScopes: readonly string[] = ['resume']
): Promise<string | null> {
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
  const granted = typeof payload.scope === 'string' ? payload.scope.split(' ') : [];
  if (!requiredScopes.every((scope) => granted.includes(scope))) throw new ResumeOAuthScopeError();
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
  const live = result.rows.filter(
    (row) =>
      new Date(String(row.expiresAt)).getTime() > Date.now() &&
      includesJSON(row.resources, resource)
  );
  if (!live.length) return null;
  if (!live.some((row) => requiredScopes.every((scope) => includesJSON(row.scopes, scope))))
    throw new ResumeOAuthScopeError();
  return payload.sub;
}

class ResumeOAuthScopeError extends Error {
  override readonly name = 'ResumeOAuthScopeError';
}
