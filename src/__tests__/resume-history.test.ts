// @vitest-environment node
import { readFileSync } from 'node:fs';
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
import { listResumeHistory, recordResumeHistory } from '@/lib/actions/resume-history-actions';

vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { execute: vi.fn(), batch: vi.fn() } }));
let sql: TestDatabase;
const master =
  '# Alex Morgan\n\n## Projects\n### Reader\n- Built a reading queue.\n\n## Education\nBSc, Example University.\n';
const jd =
  'Build React and TypeScript web interfaces, ship accessible customer features, and maintain frontend tests and backend API integrations.';
const version = master.replace(
  '## Projects',
  '## Summary\nSoftware engineer building web interfaces and reading tools.\n\n## Projects'
);
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
  sql.exec(readFileSync('src/lib/db-schema.sql', 'utf8'));
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

describe('owned immutable resume history with real SQL', () => {
  it('blocks guest writes and foreign job/master IDs', async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);
    await expect(
      recordResumeHistory({ resume_id: 'master', jd_text: jd, source: version })
    ).rejects.toThrow('Sign in');
    expect(db.execute).not.toHaveBeenCalled();
    vi.mocked(getCurrentUserId).mockResolvedValue('owner');
    await expect(
      recordResumeHistory({ resume_id: 'foreign', jd_text: jd, source: version })
    ).rejects.toThrow('Resume not found');
    await expect(
      recordResumeHistory({
        resume_id: 'master',
        job_id: 'foreign-job',
        jd_text: jd,
        source: version,
      })
    ).rejects.toThrow('Job not found');
    expect(db.batch).not.toHaveBeenCalled();
  });
  it.each(['applied', 'interview', 'offer', 'rejected'])(
    'stores immutable versions without regressing %s status or changing the master',
    async (status) => {
      sql.prepare('UPDATE job_applications SET status=? WHERE id=?').run(status, 'job');
      const a = await recordResumeHistory({
        resume_id: 'master',
        job_id: 'job',
        jd_text: jd,
        source: version,
      });
      const newer = version.replace('web interfaces', 'TypeScript web interfaces');
      const b = await recordResumeHistory({
        resume_id: 'master',
        job_id: 'job',
        jd_text: jd,
        source: newer,
      });
      const history = await listResumeHistory();
      expect(history.map((item) => item.id)).toEqual([b.id, a.id]);
      expect(history.map((item) => item.source)).toEqual([newer, version]);
      expect(sql.prepare('SELECT status FROM job_applications WHERE id=?').get('job')).toEqual({
        status,
      });
      expect(sql.prepare('SELECT source FROM resumes WHERE id=?').get('master')).toEqual({
        source: master,
      });
    }
  );
  it('creates a target job and reuses an identical owned inline master', async () => {
    const result = await recordResumeHistory({
      resume_source: master,
      company: 'Example Co',
      role: 'Frontend Engineer',
      jd_text: jd,
      source: version,
    });
    expect(result.resume_id).toBe('master');
    expect(
      sql
        .prepare('SELECT status,company,jd_text FROM job_applications WHERE id=?')
        .get(result.job_id)
    ).toEqual({ status: 'tailored', company: 'Example Co', jd_text: jd });
    expect(result.view_url).toContain(`version=${result.id}`);
  });
  it('creates an inline master, job and version together and excludes another owner from listing', async () => {
    const changedMaster = master.replace('Alex Morgan', 'Alex Example');
    const result = await recordResumeHistory({
      resume_source: changedMaster,
      jd_text: jd,
      source: version,
    });
    expect(result.resume_id).not.toBe('foreign');
    expect(
      sql
        .prepare('SELECT source FROM resumes WHERE id=? AND user_id=?')
        .get(result.resume_id, 'owner')
    ).toEqual({ source: changedMaster });
    vi.mocked(getCurrentUserId).mockResolvedValue('other');
    expect(await listResumeHistory()).toEqual([]);
  });
  it('rejects reuse of a job with a different description', async () => {
    await expect(
      recordResumeHistory({
        resume_id: 'master',
        job_id: 'job',
        jd_text: `${jd} Changed.`,
        source: version,
      })
    ).rejects.toThrow('description changed');
    expect(db.batch).not.toHaveBeenCalled();
  });
});

it('rolls back a new inline master and job when storing the output fails', async () => {
  sql.exec(
    "CREATE TRIGGER reject_history BEFORE INSERT ON tailored_resumes BEGIN SELECT RAISE(ABORT, 'Storage unavailable'); END"
  );
  await expect(
    recordResumeHistory({
      resume_source: master.replace('Alex Morgan', 'New Person'),
      jd_text: jd,
      source: version,
    })
  ).rejects.toThrow('Storage unavailable');
  expect(sql.prepare('SELECT COUNT(*) AS n FROM resumes').get()).toEqual({ n: 2 });
  expect(sql.prepare('SELECT COUNT(*) AS n FROM job_applications').get()).toEqual({ n: 2 });
  expect(sql.prepare('SELECT COUNT(*) AS n FROM tailored_resumes').get()).toEqual({ n: 0 });
});
