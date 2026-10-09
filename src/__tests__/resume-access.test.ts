// @vitest-environment node
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  createResumeApiAccess,
  disconnectResumeApiAccess,
} from '@/lib/actions/resume-access-actions';
import { getCurrentUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { getResumeApiUserId, issueResumeAccess, withResumeAccess } from '@/lib/resume-access';
import { tailorResumeFromReference } from '@/lib/actions/resume-assistant-actions';
import { listResumeHistory } from '@/lib/actions/resume-history-actions';

interface TestDatabase {
  exec(sql: string): void;
  close(): void;
  prepare(sql: string): {
    all(...args: unknown[]): Record<string, unknown>[];
    run(...args: unknown[]): { changes: number | bigint };
    get(...args: unknown[]): Record<string, unknown> | undefined;
  };
}
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as {
  DatabaseSync: new (path: string) => TestDatabase;
};
const state = vi.hoisted(() => ({ requestHeaders: new Headers(), generate: vi.fn() }));
vi.mock('next/headers', () => ({ headers: async () => state.requestHeaders }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => {
    throw new Error('Local synthetic test');
  },
}));
vi.mock('@/lib/db', () => ({ db: { execute: vi.fn(), batch: vi.fn() } }));
vi.mock('@/lib/ping', () => ({ ping: vi.fn().mockResolvedValue(false) }));
vi.mock('@/lib/analytics', () => ({ trackActivated: vi.fn(), trackCoreAction: vi.fn() }));
vi.mock('ai', () => ({ generateObject: state.generate }));
vi.mock('@/lib/ai-cloudflare', () => ({
  getAIModel: () => ({}),
  getAIModelRetryOptions: () => ({}),
}));

let sql: TestDatabase;
const sessionToken = 'synthetic-test-session-token-12345678901234567890';
const sessionId = 'synthetic-session';
const master =
  '# Ada Example\n\n## Experience\n### Example Co\n- Built React screens and tested keyboard navigation.\n- Built scheduling APIs with Node.js request validation.\n\n## Projects\n### Reader\n- Released an accessible reading queue with saved filters.\n\n## Education\nBSc Computer Science, Example University, 2022.\n';
const jd =
  'Build React and TypeScript screens with accessible keyboard navigation and tests. Deliver customer features and work with APIs for a reading product.';

function execute(input: { sql: string; args?: readonly unknown[] } | string) {
  const query = typeof input === 'string' ? input : input.sql;
  const args = typeof input === 'string' ? [] : (input.args ?? []);
  const statement = sql.prepare(query);
  const returnsRows = /^SELECT/i.test(query.trim()) || /\bRETURNING\b/i.test(query);
  const rows = returnsRows ? statement.all(...args) : [];
  return {
    rows,
    rowsAffected: returnsRows ? rows.length : Number(statement.run(...args).changes),
    columns: [],
    lastInsertRowid: null,
  };
}
function request(token?: string, path = '/api/resume') {
  return new Request(`https://rolepatch.com${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync('src/lib/db-schema.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0002_better_auth_tables.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0003_resume_oauth.sql', 'utf8'));
  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + 2 * 86400000).toISOString();
  sql
    .prepare('INSERT INTO "user" (id,name,email,createdAt,updatedAt) VALUES (?,?,?,?,?)')
    .run('owner', 'Ada Example', 'ada@example.org', now, now);
  sql
    .prepare(
      'INSERT INTO "session" (id,token,userId,expiresAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?)'
    )
    .run(sessionId, sessionToken, 'owner', expiry, now, now);
  sql
    .prepare('INSERT INTO resumes (id,user_id,name,source) VALUES (?,?,?,?)')
    .run('master', 'owner', 'Master', master);
  sql
    .prepare('INSERT INTO resumes (id,user_id,name,source) VALUES (?,?,?,?)')
    .run('foreign', 'other', 'Other master', master);
  const signature = createHmac('sha256', 'resume-tailor-local-development-secret-32-chars')
    .update(sessionToken)
    .digest('base64');
  state.requestHeaders = new Headers({
    cookie: `better-auth.session_token=${encodeURIComponent(`${sessionToken}.${signature}`)}`,
  });
  vi.mocked(db.execute).mockImplementation(
    async (input) => execute(input) as Awaited<ReturnType<typeof db.execute>>
  );
  vi.mocked(db.batch).mockImplementation(async (inputs) => {
    sql.exec('BEGIN');
    try {
      const rows = inputs.map(execute);
      sql.exec('COMMIT');
      return rows as Awaited<ReturnType<typeof db.batch>>;
    } catch (error) {
      sql.exec('ROLLBACK');
      throw error;
    }
  });
  state.generate.mockRejectedValue(
    Object.assign(new Error('synthetic unavailable provider'), { statusCode: 502 })
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  sql.close();
  vi.restoreAllMocks();
});

it('issues from real Better Auth local session and saves the returned exact resume through bearer-owned actions', async () => {
  const access = await createResumeApiAccess();
  expect(access.ok).toBe(true);
  if (!access.ok) throw new Error('Local session issuance failed');
  expect(access.token).not.toContain(sessionToken);
  state.requestHeaders = new Headers();
  const lowercase = await withResumeAccess(
    new Request('https://rolepatch.com/api/resume', {
      headers: { authorization: `bearer ${access.token}` },
    }),
    async () => Response.json({ user: await getCurrentUserId() })
  );
  expect(await lowercase.json()).toEqual({ user: 'owner' });
  const response = await withResumeAccess(request(access.token), async () => {
    expect(await getCurrentUserId()).toBe('owner');
    return Response.json(
      await tailorResumeFromReference(
        {
          resume_id: 'master',
          jd_text: jd,
          company_name: 'Example',
          role_title: 'Frontend engineer',
        },
        true
      )
    );
  });
  const output = await response.json();
  expect(output).toMatchObject({
    ok: true,
    persisted: true,
    generation_method: 'source_fallback',
    fallback_reason: 'gateway_error:502',
    history: { saved: true },
  });
  expect(
    sql
      .prepare('SELECT source FROM tailored_resumes WHERE id=? AND user_id=?')
      .get(output.history.id, 'owner')?.source
  ).toBe(output.markdown);
  expect(sql.prepare('SELECT source FROM resumes WHERE id=?').get('master')?.source).toBe(master);
  expect(
    sql.prepare('SELECT balance FROM token_balances WHERE user_id=?').get('owner')?.balance
  ).toBe(3);
  expect(
    sql.prepare('SELECT COUNT(*) AS n FROM token_transactions WHERE user_id=?').get('owner')?.n
  ).toBe(2);
  await withResumeAccess(request(access.token), async () => {
    expect((await listResumeHistory())[0].source).toBe(output.markdown);
    return new Response();
  });
  expect(getResumeApiUserId()).toBeUndefined();
});

it('rejects foreign master before generation, billing or saving', async () => {
  const access = await createResumeApiAccess();
  if (!access.ok) throw new Error('Expected local session');
  state.requestHeaders = new Headers();
  const response = await withResumeAccess(request(access.token), async () =>
    Response.json(await tailorResumeFromReference({ resume_id: 'foreign', jd_text: jd }, true))
  );
  expect(await response.json()).toMatchObject({ ok: false, code: 'not_found' });
  expect(state.generate).not.toHaveBeenCalled();
  expect(sql.prepare('SELECT COUNT(*) AS n FROM tailored_resumes').get()?.n).toBe(0);
});

it('rejects forged, expired and revoked credentials without falling back to the browser or a guest', async () => {
  const access = await createResumeApiAccess();
  if (!access.ok) throw new Error('Expected local session');
  const expired = await issueResumeAccess(
    { id: sessionId, token: sessionToken, expiresAt: new Date(Date.now() + 86400000) },
    Date.now() - 86400001
  );
  const callback = vi.fn(async () => new Response());
  for (const token of [`${access.token.slice(0, -2)}xx`, expired.token, sessionToken])
    expect((await withResumeAccess(request(token), callback)).status).toBe(401);
  expect(await disconnectResumeApiAccess()).toEqual({ ok: true });
  expect((await withResumeAccess(request(access.token), callback)).status).toBe(401);
  expect(callback).not.toHaveBeenCalled();
});

it('scopes tokens to the two resume APIs and isolates overlapping guest requests', async () => {
  const access = await createResumeApiAccess();
  if (!access.ok) throw new Error('Expected local session');
  state.requestHeaders = new Headers();
  const callback = vi.fn(async () => new Response());
  expect(
    (await withResumeAccess(request(access.token, '/api/apply-agent/queue'), callback)).status
  ).toBe(401);
  let release!: () => void;
  const pause = new Promise<void>((resolve) => {
    release = resolve;
  });
  const owned = withResumeAccess(request(access.token, '/api/mcp'), async () => {
    await pause;
    expect(await getCurrentUserId()).toBe('owner');
    return new Response();
  });
  await withResumeAccess(request(), async () => {
    expect(await getCurrentUserId()).toBeNull();
    release();
    return new Response();
  });
  await owned;
  expect(getResumeApiUserId()).toBeUndefined();
  expect(callback).not.toHaveBeenCalled();
});

it('requires an ordinary signed-in session to issue capabilities', async () => {
  state.requestHeaders = new Headers();
  expect(await createResumeApiAccess()).toMatchObject({ ok: false });
});

it('omits fallback_reason on an AI-generated API response', async () => {
  state.generate.mockResolvedValue({
    object: {
      summary: {
        text: 'Built React screens and tested keyboard navigation. Built scheduling APIs with Node.js request validation.',
        evidence_ids: ['f1', 'f2'],
      },
      rankings: [{ group_id: 'g1', bullet_ids: ['g1b1', 'g1b2'] }],
      project_rankings: [],
    },
  });
  const output = await tailorResumeFromReference({ resume_id: 'master', jd_text: jd });
  expect(output).toMatchObject({ ok: true, generation_method: 'ai' });
  expect(output).not.toHaveProperty('fallback_reason');
});
