'use server';

import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/auth-utils';

export async function getResumeOAuthRequest(query: string) {
  const userId = await getCurrentUserId();
  if (query.length > 12000) return { ok: false as const, error: 'Invalid connection request.' };
  try {
    const params = new URLSearchParams(query);
    const client = await getAuth().api.getOAuthClientPublicPrelogin({
      body: { client_id: params.get('client_id') ?? '', oauth_query: query },
    });
    const callback = new URL(params.get('redirect_uri') ?? '');
    const scopes = (params.get('scope') ?? '').split(' ').filter(Boolean);
    if (
      !scopes.includes('resume') ||
      scopes.some((scope) => !['resume', 'offline_access'].includes(scope))
    )
      throw new Error('Unsupported access');
    const session = userId ? await getAuth().api.getSession({ headers: await headers() }) : null;
    const needsFreshLogin = (params.get('prompt') ?? '').split(' ').includes('login');
    const freshSession =
      session &&
      (!needsFreshLogin ||
        new Date(session.session.createdAt).getTime() >= Number(params.get('ba_iat')));
    return {
      ok: true as const,
      client_name: client.client_name?.slice(0, 100) || 'Assistant',
      callback_origin: callback.origin,
      scopes,
      signed_in: Boolean(freshSession),
    };
  } catch {
    return {
      ok: false as const,
      error: 'This connection request expired or is invalid. Start again from your assistant.',
    };
  }
}

export async function consentResumeOAuth(query: string, accept: boolean) {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false as const, error: 'Sign in before connecting your resume.' };
  const request = await getResumeOAuthRequest(query);
  if (!request.ok) return request;
  try {
    const auth = getAuth();
    const { baseURL } = await auth.$context;
    const requestHeaders = new Headers(await headers());
    requestHeaders.set('accept', 'application/json');
    requestHeaders.set('content-type', 'application/json');
    requestHeaders.delete('content-length');
    const response = await auth.handler(
      new Request(`${baseURL}/oauth2/consent`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({ oauth_query: query, accept }),
      })
    );
    const result = await response.json();
    if (!response.ok || typeof result.url !== 'string') throw new Error('Consent failed');
    return { ok: true as const, redirect_uri: result.url };
  } catch {
    return {
      ok: false as const,
      error: 'Could not finish connecting. Start again from your assistant.',
    };
  }
}
