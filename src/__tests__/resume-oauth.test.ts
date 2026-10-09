// @vitest-environment node
import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { getAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getResumeApiUserId, withResumeAccess } from '@/lib/resume-access';
import { getResumeOAuthRequest, consentResumeOAuth } from '@/lib/actions/resume-oauth-actions';
const state = vi.hoisted(() => ({ headers: new Headers() }));
const origin = 'http://localhost:4366';
const secret = 'oauth-local-synthetic-test-secret-20261008';
vi.mock('next/headers', () => ({ headers: async () => state.headers }));
vi.mock('@/lib/ping', () => ({ ping: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { execute: vi.fn(), batch: vi.fn() } }));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => ({
    env: {
      NODE_ENV: 'test',
      DB: {},
      BETTER_AUTH_URL: 'http://localhost:4366',
      BETTER_AUTH_SECRET: 'oauth-local-synthetic-test-secret-20261008',
    },
  }),
}));
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
const sql = new DatabaseSync(':memory:');
const resource = `${origin}/api/mcp`;
const verifier = 'a'.repeat(64);
const challenge = createHash('sha256').update(verifier).digest('base64url');
const redirect = 'https://client.example.org/callback';
let cookie: string;
async function send(path: string, body?: unknown, signed = false) {
  const headers = new Headers({ accept: 'application/json' });
  if (signed) headers.set('cookie', cookie);
  if (body) headers.set('content-type', 'application/json');
  return getAuth().handler(
    new Request(`${origin}/api/auth${path}`, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  );
}
async function token(body: Record<string, string>) {
  return getAuth().handler(
    new Request(`${origin}/api/auth/oauth2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    })
  );
}
function query(client: string, extra: Record<string, string> = {}) {
  return new URLSearchParams({
    client_id: client,
    redirect_uri: redirect,
    response_type: 'code',
    scope: 'resume offline_access',
    resource,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'synthetic-state',
    ...extra,
  }).toString();
}
async function consentQuery(client: string, signed = true, extra: Record<string, string> = {}) {
  const response = await send(`/oauth2/authorize?${query(client, extra)}`, undefined, signed);
  const data = await response.json();
  if (response.status !== 200 || !data.url?.includes('/settings?'))
    throw new Error(
      `Unexpected authorization response: ${response.status} ${JSON.stringify(data)}`
    );
  return new URL(data.url, origin).search.slice(1);
}
async function invoke(access: string, path = '/api/mcp') {
  return withResumeAccess(
    new Request(`${origin}${path}`, {
      headers: { authorization: `Bearer ${access}` },
    }),
    async () => Response.json({ user: getResumeApiUserId() })
  );
}
beforeAll(() => {
  sql.exec('PRAGMA foreign_keys=ON');
  sql.exec(readFileSync('migrations/0002_better_auth_tables.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0003_resume_oauth.sql', 'utf8'));
  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + 86400000).toISOString();
  sql
    .prepare('INSERT INTO "user" (id,name,email,createdAt,updatedAt) VALUES (?,?,?,?,?)')
    .run('oauth-owner', 'Ada Example', 'ada@example.org', now, now);
  const sessionToken = 'synthetic-oauth-session-token-12345678901234567890';
  sql
    .prepare(
      'INSERT INTO "session" (id,token,userId,expiresAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?)'
    )
    .run('oauth-session', sessionToken, 'oauth-owner', expiry, now, now);
  const signature = createHmac('sha256', secret).update(sessionToken).digest('base64');
  cookie = `better-auth.session_token=${encodeURIComponent(`${sessionToken}.${signature}`)}`;
  state.headers = new Headers({ cookie, origin });
  vi.mocked(db.execute).mockImplementation(async (input) => {
    const query = typeof input === 'string' ? input : input.sql;
    const args = typeof input === 'string' ? [] : (input.args ?? []);
    const statement = sql.prepare(query);
    const reads = /^SELECT/i.test(query.trim()) || /RETURNING/i.test(query);
    const rows = reads ? statement.all(...args) : [];
    return {
      rows,
      rowsAffected: reads ? rows.length : Number(statement.run(...args).changes),
      columns: [],
      lastInsertRowid: null,
    };
  });
});
afterAll(() => sql.close());
it('advertises resource-bound OAuth endpoints through real provider discovery', async () => {
  const response = await getAuth().handler(
    new Request(`${origin}/.well-known/oauth-authorization-server/api/auth`)
  );
  expect(response.status).toBe(200);
  const metadata = await response.json();
  expect(metadata.issuer).toBe(`${origin}/api/auth`);
  expect(metadata.registration_endpoint).toBe(`${origin}/api/auth/oauth2/register`);
  expect(metadata.code_challenge_methods_supported).toEqual(['S256']);
  expect(metadata.grant_types_supported).not.toContain('client_credentials');
  const protectedResponse = await getAuth().handler(
    new Request(`${origin}/.well-known/oauth-protected-resource/api/mcp`)
  );
  expect(await protectedResponse.json()).toMatchObject({ resource, scopes_supported: ['resume'] });
});
it('qualifies registration, consent, PKCE, replay resistance, owner identity, refresh and immediate session revocation', async () => {
  const registration = await send('/oauth2/register', {
    client_name: 'Synthetic Assistant',
    redirect_uris: [redirect],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: 'resume offline_access',
  });
  expect(registration.status).toBe(201);
  const client = await registration.json();
  expect(client.client_id).toBeTruthy();
  const missingPkce = new URLSearchParams(query(client.client_id));
  missingPkce.delete('code_challenge');
  missingPkce.delete('code_challenge_method');
  const noPkce = await send(`/oauth2/authorize?${missingPkce}`, undefined, true);
  expect(JSON.stringify(await noPkce.json())).toMatch(/invalid_request|PKCE|pkce/);
  const anonymousQuery = await consentQuery(client.client_id, false);
  expect(await getResumeOAuthRequest(anonymousQuery)).toMatchObject({
    ok: true,
    client_name: 'Synthetic Assistant',
    callback_origin: 'https://client.example.org',
  });
  expect(await getResumeOAuthRequest(`${anonymousQuery}&scope=admin`)).toMatchObject({ ok: false });
  const signedQuery = await consentQuery(client.client_id);
  const denied = await consentResumeOAuth(signedQuery, false);
  expect(denied.ok).toBe(true);
  if (denied.ok) expect(denied.redirect_uri).toContain('access_denied');
  expect(sql.prepare('SELECT COUNT(*) n FROM oauthConsent').get().n).toBe(0);
  const accepted = await consentResumeOAuth(signedQuery, true);
  expect(accepted.ok).toBe(true);
  if (!accepted.ok) throw new Error(accepted.error);
  const code = new URL(accepted.redirect_uri).searchParams.get('code')!;
  const grant = {
    grant_type: 'authorization_code',
    client_id: client.client_id,
    redirect_uri: redirect,
    code_verifier: verifier,
    resource,
    code,
  };
  const wrong = await token({ ...grant, code_verifier: 'b'.repeat(64) });
  expect(wrong.status).toBeGreaterThanOrEqual(400);
  // Invalid attempts consume a one-time code; get a fresh code for the positive path.
  const fresh = await send(`/oauth2/authorize?${query(client.client_id)}`, undefined, true);
  const freshData = await fresh.json();
  const freshCode = new URL(freshData.url).searchParams.get('code')!;
  const issued = await token({ ...grant, code: freshCode });
  expect(issued.status).toBe(200);
  const tokens = await issued.json();
  expect(tokens.access_token).toBeTruthy();
  expect(tokens.refresh_token).toBeTruthy();
  const valid = await invoke(tokens.access_token);
  expect(valid.status).toBe(200);
  expect(await valid.json()).toEqual({ user: 'oauth-owner' });
  expect((await invoke(tokens.access_token, '/api/resume')).status).toBe(401);
  expect((await invoke(`${tokens.access_token.slice(0, -2)}XX`)).status).toBe(401);
  expect((await token({ ...grant, code: freshCode })).status).toBeGreaterThanOrEqual(400);
  const refreshed = await token({
    grant_type: 'refresh_token',
    client_id: client.client_id,
    refresh_token: tokens.refresh_token,
    resource,
  });
  // Code replay invalidates its token family by provider policy. Obtain a fresh grant if revoked.
  if (refreshed.status !== 200) {
    const next = await send(`/oauth2/authorize?${query(client.client_id)}`, undefined, true);
    const nextTokensResponse = await token({
      ...grant,
      code: new URL((await next.json()).url).searchParams.get('code')!,
    });
    const nextTokens = await nextTokensResponse.json();
    const rotated = await token({
      grant_type: 'refresh_token',
      client_id: client.client_id,
      refresh_token: nextTokens.refresh_token,
      resource,
    });
    expect(rotated.status).toBe(200);
    expect((await invoke((await rotated.json()).access_token)).status).toBe(200);
  } else {
    const rotated = await refreshed.json();
    expect((await invoke(rotated.access_token)).status).toBe(200);
    expect(
      (
        await token({
          grant_type: 'refresh_token',
          client_id: client.client_id,
          refresh_token: tokens.refresh_token,
          resource,
        })
      ).status
    ).toBeGreaterThanOrEqual(400);
  }
  const concurrent = await send(`/oauth2/authorize?${query(client.client_id)}`, undefined, true);
  const oneCode = new URL((await concurrent.json()).url).searchParams.get('code')!;
  const races = await Promise.all([
    token({ ...grant, code: oneCode }),
    token({ ...grant, code: oneCode }),
  ]);
  expect(races.filter((x) => x.status === 200)).toHaveLength(1);
  const winning = await races.find((x) => x.status === 200)!.json();
  expect((await invoke(winning.access_token)).status).toBe(200);
  sql.prepare('DELETE FROM "session" WHERE id=?').run('oauth-session');
  expect((await invoke(winning.access_token)).status).toBe(401);
});
