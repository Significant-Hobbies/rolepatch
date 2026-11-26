// @vitest-environment node
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
interface TestDatabase {
  exec(sql: string): void;
  close(): void;
  prepare(sql: string): {
    all(...args: string[]): unknown[];
    run(...args: string[]): { changes: number | bigint };
    get(...args: string[]): unknown;
  };
}
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as {
  DatabaseSync: new (path: string) => TestDatabase;
};
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { callCareerResume } from '@/lib/actions/career-resume';
import { readdirSync } from 'node:fs';
import { generateObject } from 'ai';
vi.mock('ai', () => ({ generateObject: vi.fn() }));
vi.mock('@/lib/ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ai')>()),
  getAIModel: () => ({}),
  getAIModelRetryOptions: () => ({}),
}));
import { careerResumeTools } from '@/lib/career-resume-tools';

vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { execute: vi.fn(), batch: vi.fn() } }));
let sql: TestDatabase;
const master =
  '# Alex Morgan\n\n## Projects\n### Reader\n- Built a reading queue.\n\n## Education\nBSc, Example University.\n';
const jd =
  'Build React and TypeScript web interfaces, ship accessible customer features, and maintain frontend tests and backend API integrations.';
function execute(input: { sql: string; args?: readonly unknown[] } | string) {
  const query = typeof input === 'string' ? input : input.sql;
  const args = typeof input === 'string' ? [] : (input.args ?? []);
  const statement = sql.prepare(query);
  const rows = /^SELECT/i.test(query.trim()) ? statement.all(...(args as string[])) : [];
  const result =
    rows.length || /^SELECT/i.test(query.trim())
      ? { changes: 0 }
      : statement.run(...(args as string[]));
  return { rows, rowsAffected: Number(result.changes), columns: [], lastInsertRowid: null };
}
beforeEach(() => {
  vi.resetAllMocks();
  sql = new DatabaseSync(':memory:');
  for (const file of readdirSync('migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sql.exec(readFileSync(`migrations/${file}`, 'utf8'));
  sql.exec(
    "INSERT INTO users(id,email) VALUES('owner','test@example.org'),('other','other@example.org'); INSERT INTO token_balances(user_id,balance) VALUES('owner',3);"
  );
  sql
    .prepare('INSERT INTO resumes(id,user_id,name,source) VALUES (?,?,?,?)')
    .run('master', 'owner', 'Master', master);
  sql
    .prepare('INSERT INTO resumes(id,user_id,name,source) VALUES (?,?,?,?)')
    .run('foreign', 'other', 'Other', master);
  sql
    .prepare('INSERT INTO job_applications(id,user_id,resume_id,jd_text,status) VALUES (?,?,?,?,?)')
    .run('job', 'owner', 'master', jd, 'applied');
  sql
    .prepare('INSERT INTO job_applications(id,user_id,resume_id,jd_text,status) VALUES (?,?,?,?,?)')
    .run('foreign-job', 'other', 'foreign', jd, 'draft');
  vi.mocked(getCurrentUserId).mockResolvedValue('owner');
  vi.mocked(db.execute).mockImplementation(
    async (input) => execute(input) as Awaited<ReturnType<typeof db.execute>>
  );
  vi.mocked(db.batch).mockImplementation(async (inputs) => {
    sql.exec('BEGIN');
    try {
      const result = inputs.map((input) => execute(input));
      sql.exec('COMMIT');
      return result as Awaited<ReturnType<typeof db.batch>>;
    } catch (error) {
      sql.exec('ROLLBACK');
      throw error;
    }
  });
});
afterEach(() => sql.close());

function fact(id: string, kind: string, title: string, data: Record<string, unknown>) {
  sql
    .prepare(
      'INSERT INTO career_records(id,user_id,profile_id,kind,title,data_json) VALUES(?,?,?,?,?,?)'
    )
    .run(id, 'owner', 'master', kind, title, JSON.stringify(data));
}
const generate = (input: Record<string, unknown> = {}) =>
  callCareerResume('rolepatch_generate_resume', {
    profile_id: 'master',
    request_id: 'request-1',
    ...input,
  });
const call = (operation: string, args: unknown) =>
  callCareerResume(`rolepatch_resume_versions_${operation}`, args);

describe('profile-generated resumes and immutable history', () => {
  it('publishes six distinct discoverable tools and requires generation request IDs', () => {
    expect(new Set(careerResumeTools.map((tool) => tool.name)).size).toBe(6);
    expect(careerResumeTools[0].inputSchema).toMatchObject({ required: ['request_id'] });
  });
  it('selects backend evidence from 30 achievements and preserves ownership, labels and source dates', async () => {
    fact('employment', 'employment', 'Staff Engineer', {
      employer: 'Example Co',
      start_date: '2022-06',
    });
    for (let n = 0; n < 30; n++)
      fact(`point-${n}`, 'achievement', `Release ${n}`, {
        verification_status: 'user_confirmed',
        approved_wording:
          n === 29 ? 'Optimized PostgreSQL API query latency by 31%.' : `Designed interface ${n}.`,
        related_role_id: 'employment',
      });
    fact('uncertain', 'achievement', 'In review', {
      verification_status: 'disputed',
      approved_wording: 'Increased revenue by 90%.',
    });
    fact('secret', 'answer', 'Private answer', { value: 'Private-value' });
    const result = await generate({
      jd_text: 'Backend engineering PostgreSQL API',
      save_to_history: true,
    });
    expect(result).toMatchObject({
      ok: true,
      credits_charged: 0,
      saved: true,
      markdown: expect.stringContaining('Optimized PostgreSQL API query latency by 31%.'),
      warnings: [expect.stringContaining('uncertain')],
    });
    if (!result.ok || !('markdown' in result)) throw new Error('generation failed');
    expect(result.markdown).toContain('2022-06');
    expect(result.markdown).not.toMatch(/Private-value|Increased revenue/);
    expect(result.selected_record_ids).toEqual(
      expect.arrayContaining(['point-29', 'employment', 'master'])
    );
    sql.exec("UPDATE resumes SET source='changed' WHERE id='master'");
    expect(await call('get', { version_id: result.id })).toMatchObject({
      markdown: result.markdown,
      snapshot: { jd_text: 'Backend engineering PostgreSQL API' },
    });
  });
  it('returns the same free fixed-wording draft on concurrent requests; distinct inputs conflict', async () => {
    const results = await Promise.all([generate(), generate()]);
    expect(results.map((r) => ('credits_charged' in r ? r.credits_charged : null)).sort()).toEqual([
      0, 0,
    ]);
    expect(
      sql.prepare("SELECT balance,total_used FROM token_balances WHERE user_id='owner'").get()
    ).toEqual({ balance: 3, total_used: 0 });
    expect(sql.prepare('SELECT COUNT(*) AS count FROM token_transactions').get()).toEqual({
      count: 0,
    });
    expect(await generate({ jd_text: 'changed' })).toMatchObject({ ok: false, code: 'conflict' });
    expect(await call('list', {})).toMatchObject({ versions: [] });
  });
  it('saves exact edits, allows explicit approval, blocks stale updates; archived series remains readable by exact ID', async () => {
    const generation = await generate();
    if (!generation.ok || !('draft_id' in generation)) throw new Error('generation failed');
    const saveArgs = {
      draft_id: generation.draft_id,
      markdown: 'Edited exact Markdown.  \n',
      request_id: 'save-1',
    };
    const first = await call('save', saveArgs);
    if (!first.ok || !('revision' in first)) throw new Error('save failed');
    expect(await call('save', saveArgs)).toMatchObject({
      id: first.id,
      markdown: saveArgs.markdown,
    });
    const edits = {
      version_id: first.id,
      expected_revision: first.revision,
      request_id: 'approve-1',
      approved: true,
    };
    const second = await call('update', edits);
    if (!second.ok || !('revision' in second)) throw new Error('approval failed');
    expect(second.approved).toBe(true);
    expect(await call('update', { ...edits, request_id: 'stale' })).toMatchObject({
      code: 'conflict',
    });
    expect(await call('get', { version_id: first.id })).toMatchObject({ approved: false });
    expect(
      await call('archive', {
        version_id: second.id,
        expected_revision: second.revision,
        request_id: 'archive-1',
      })
    ).toMatchObject({ archived: true });
    expect(await call('list', {})).toMatchObject({ versions: [] });
    expect(await call('get', { version_id: first.id })).toMatchObject({
      markdown: saveArgs.markdown,
    });
    vi.mocked(getCurrentUserId).mockResolvedValue('other');
    expect(await call('get', { version_id: first.id })).toMatchObject({ code: 'not_found' });
    expect(
      await callCareerResume('rolepatch_render_resume_pdf', { version_id: first.id })
    ).toMatchObject({ code: 'not_found' });
  });
  it('does not debit on foreign targets, absent defaults, or insufficient balance', async () => {
    expect(await generate({ profile_id: 'foreign' })).toMatchObject({ code: 'not_found' });
    expect(await generate({ application_id: 'foreign-job' })).toMatchObject({ code: 'not_found' });
    expect(await generate({ profile_id: undefined })).toMatchObject({ code: 'not_found' });
    sql.exec(
      "UPDATE resumes SET is_default=1 WHERE id='master';UPDATE token_balances SET balance=0"
    );
    fact('a1', 'achievement', 'Caching', {
      verification_status: 'user_confirmed',
      individual_contribution: 'I tested caches.',
    });
    expect(await generate({ profile_id: undefined, mode: 'grounded_rewrite' })).toMatchObject({
      code: 'insufficient_tokens',
    });
    expect(sql.prepare('SELECT COUNT(*) AS count FROM career_resume_versions').get()).toEqual({
      count: 0,
    });
  });
  it('allows only one gateway call for overlapping AI retries, and guards referenced job history', async () => {
    fact('p', 'achievement', 'Availability', {
      approved_wording: 'Maintained APIs.',
      individual_contribution: 'I tested API failover.',
      verification_status: 'user_confirmed',
    });
    let finish = () => {};
    const wait = new Promise<void>((resolve) => {
      finish = resolve;
    });
    let started = () => {};
    const running = new Promise<void>((resolve) => {
      started = resolve;
    });
    vi.mocked(generateObject).mockImplementationOnce(async () => {
      started();
      await wait;
      return { object: { rewrites: [{ id: 'p', details: [] }] } } as Awaited<
        ReturnType<typeof generateObject>
      >;
    });
    const args = { mode: 'grounded_rewrite', application_id: 'job', save_to_history: true };
    const first = generate(args);
    await running;
    try {
      expect(await generate(args)).toMatchObject({ code: 'conflict' });
    } finally {
      finish();
    }
    expect(await first).toMatchObject({ ok: true, credits_charged: 1 });
    expect(await generate(args)).toMatchObject({ ok: true, credits_charged: 0 });
    expect(generateObject).toHaveBeenCalledTimes(1);
    expect(() => sql.prepare('DELETE FROM job_applications WHERE id=?').run('job')).toThrow();
  });
  it('falls back to free fixed wording when AI selects an unknown fact', async () => {
    fact('a1', 'achievement', 'Caching', {
      individual_contribution: 'I wrote tests.',
      approved_wording: 'Wrote cache tests.',
      verification_status: 'user_confirmed',
    });
    vi.mocked(generateObject).mockResolvedValue({
      object: { rewrites: [{ id: 'foreign', details: [] }] },
    } as Awaited<ReturnType<typeof generateObject>>);
    const result = await generate({ mode: 'grounded_rewrite' });
    expect(result).toMatchObject({
      ok: true,
      credits_charged: 0,
      markdown: expect.stringContaining('Wrote cache tests.'),
      warnings: [expect.stringContaining('no charge')],
    });
  });
  it('rewrites only the supplied individual contribution and labels team outcomes and estimates', async () => {
    fact('a1', 'achievement', 'Caching', {
      verification_status: 'user_confirmed',
      approved_wording: 'Reviewed cache designs.',
      individual_contribution: 'I tested cache invalidation.',
      team_outcome: 'Latency improved 20%.',
      metric_is_estimate: true,
    });
    vi.mocked(generateObject).mockResolvedValue({
      object: { rewrites: [{ id: 'a1', details: ['team_outcome'] }] },
    } as Awaited<ReturnType<typeof generateObject>>);
    const rewrite = { mode: 'grounded_rewrite', pin_ids: ['a1'] };
    const result = await generate(rewrite);
    expect(result).toMatchObject({ credits_charged: 1 });
    expect(await generate(rewrite)).toMatchObject({ credits_charged: 0, replayed: true });
    expect(generateObject).toHaveBeenCalledTimes(1);
    expect(sql.prepare('SELECT balance,total_used FROM token_balances').get()).toEqual({
      balance: 2,
      total_used: 1,
    });
    expect(result).toMatchObject({
      markdown: expect.stringContaining(
        'Tested cache invalidation. · Team outcome: Latency improved 20%. (metric is an estimate)'
      ),
    });
    expect(await generate({ request_id: 'bad-pin', pin_ids: ['foreign'] })).toMatchObject({
      code: 'invalid_input',
    });
  });
});

it('exports generic and targeted one-page PDFs with selectable evidence and live links, then renders an exact saved revision without a charge', {
  skip: !process.env.PUPPETEER_EXECUTABLE_PATH,
  timeout: 60_000,
}, async () => {
  const { PDFParse } = await import('pdf-parse');
  const renderer = await import('@/lib/pdf');
  const render = vi.spyOn(renderer, 'renderPdf').mockImplementation(
    async (html) =>
      new Uint8Array(
        Buffer.from(
          execFileSync(process.execPath, ['src/__tests__/fixtures/render-pdf.mjs'], {
            input: html,
            encoding: 'utf8',
            maxBuffer: 5_000_000,
          }),
          'base64'
        )
      )
  );
  try {
    fact('site', 'identity', 'Portfolio', {
      value: 'Portfolio',
      source_urls: ['https://example.org/portfolio'],
    });
    fact('role', 'employment', 'Backend Engineer', {
      employer: 'Example Co',
      start_date: '2022-03',
      end_date: '2025-09',
    });
    for (let i = 0; i < 30; i++)
      fact(`sample-${i}`, 'achievement', `Project ${i}`, {
        related_role_id: 'role',
        verification_status: 'document_supported',
        approved_wording:
          i === 29 ? 'Reduced PostgreSQL API latency by 31%.' : `Validated interface ${i}.`,
      });
    for (const [request_id, jd_text] of [
      ['generic', ''],
      ['targeted', 'Backend engineer PostgreSQL API'],
    ]) {
      const draft = await generate({ request_id, jd_text, format: 'pdf', save_to_history: true });
      if (!draft.ok || !('pdf' in draft) || !draft.pdf) throw new Error('PDF generation failed.');
      const exported = await callCareerResume('rolepatch_render_resume_pdf', {
        version_id: draft.id,
      });
      expect(exported).toMatchObject({ ok: true, credits_charged: 0, markdown: draft.markdown });
      const parser = new PDFParse({ data: Buffer.from(draft.pdf.data_base64, 'base64') });
      try {
        const info = await parser.getInfo({ parsePageInfo: true });
        expect(info.total).toBe(1);
        expect(JSON.stringify(info.pages)).toContain('https://example.org/portfolio');
        const { text } = await parser.getText();
        expect(text).toContain('Alex Morgan');
        expect(text).toContain('Example University');
        if (jd_text) expect(text).toContain('Reduced PostgreSQL API latency by 31%.');
      } finally {
        await parser.destroy();
      }
    }
    expect(sql.prepare('SELECT COUNT(*) AS count FROM token_transactions').get()).toEqual({
      count: 0,
    });
  } finally {
    render.mockRestore();
  }
});
