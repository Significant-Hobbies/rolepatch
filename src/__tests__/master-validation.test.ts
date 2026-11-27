// @vitest-environment node
import { createRequire } from 'node:module';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { createResume, renameResume, updateResume } from '@/lib/actions/resume-actions';
import { migrateGuestData } from '@/lib/actions/migration-actions';
import { recordResumeHistory } from '@/lib/actions/resume-history-actions';
vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: async () => 'owner' }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { execute: vi.fn(), batch: vi.fn() } }));
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
const sample = 'password=example12345';
let sql: InstanceType<typeof DatabaseSync>;
const doc = (id: string, source: string) => ({
  id,
  name: 'Master',
  source,
  created_at: 1,
  updated_at: 1,
});
beforeEach(() => {
  sql = new DatabaseSync(':memory:');
  sql.exec(
    'CREATE TABLE resumes(id TEXT PRIMARY KEY,user_id TEXT,name TEXT,source TEXT,created_at INTEGER,updated_at INTEGER,archived_at INTEGER)'
  );
  vi.resetAllMocks();
  vi.mocked(db.execute).mockImplementation(async (input) => {
    const query = typeof input === 'string' ? input : input.sql;
    const args = typeof input === 'string' ? [] : (input.args ?? []);
    const statement = sql.prepare(query);
    if (/^SELECT/i.test(query.trim()))
      return { rows: statement.all(...args), rowsAffected: 0, columns: [], lastInsertRowid: null };
    const result = statement.run(...args);
    return { rows: [], rowsAffected: Number(result.changes), columns: [], lastInsertRowid: null };
  });
});
afterEach(() => sql.close());
it('preserves a legacy line on unrelated edits; forged prior text, duplicate sensitive lines and foreign masters never authorize an edit', async () => {
  const old = `# Master\n${sample}`;
  sql
    .prepare('INSERT INTO resumes(id,user_id,name,source) VALUES(?,?,?,?)')
    .run('mine', 'owner', 'Legacy', old);
  sql
    .prepare('INSERT INTO resumes(id,user_id,name,source) VALUES(?,?,?,?)')
    .run('theirs', 'other', 'Foreign', old);
  const updated = `${old}\nNew role`;
  expect(await updateResume('mine', updated, old)).toBeUndefined();
  expect(await updateResume('mine', `${updated}\n${sample}`)).toMatchObject({
    ok: false,
    error: expect.stringContaining('Master resume, line 4'),
  });
  const forged = `${updated}\n${sample}`;
  expect(await updateResume('mine', forged, forged)).toMatchObject({ ok: false });
  expect(await updateResume('theirs', updated, old)).toMatchObject({ ok: false });
  expect(sql.prepare("SELECT source FROM resumes WHERE id='mine'").get().source).toBe(updated);
  expect(sql.prepare("SELECT source FROM resumes WHERE id='theirs'").get().source).toBe(old);
});
it('returns safe errors from create and rename and retains the saved name', async () => {
  const id = await createResume('Approved name', 'Designed password reset workflows.');
  if (typeof id !== 'string') throw new Error('Expected saved master.');
  const rejected = await createResume(sample, 'other data');
  expect(rejected).toMatchObject({
    ok: false,
    error: expect.stringContaining('Resume name, line 1'),
  });
  expect(await renameResume(id, sample)).toEqual(rejected);
  expect(sql.prepare('SELECT name FROM resumes WHERE id=?').get(id).name).toBe('Approved name');
  expect(JSON.stringify(rejected)).not.toContain(sample);
});
it('rejects the complete guest migration before storing any member of the batch', async () => {
  const data = {
    resumes: [doc('clean', 'Clean'), doc('unsafe', sample)],
    jobs: [],
    tailoredResumes: [],
    coverLetters: [],
    stashEntries: [],
  };
  const before = JSON.stringify(data);
  expect(await migrateGuestData(data, 'owner')).toMatchObject({
    success: false,
    error: expect.stringContaining('Local resume 2, line 1'),
  });
  expect(JSON.stringify(data)).toBe(before);
  expect(db.execute).not.toHaveBeenCalled();
});

it('keeps partial browser imports retryable and detects account changes', async () => {
  const data = {
    resumes: [doc('mine', '# Master'), doc('theirs', '# Browser copy')],
    jobs: [],
    tailoredResumes: [],
    coverLetters: [],
    stashEntries: [],
  };
  await expect(migrateGuestData(data, 'old-session-user')).resolves.toMatchObject({
    success: false,
  });
  expect(db.execute).not.toHaveBeenCalled();
  sql
    .prepare('INSERT INTO resumes (id, user_id, source) VALUES (?, ?, ?)')
    .run('theirs', 'other', 'Existing content');
  for (let attempt = 0; attempt < 2; attempt++) {
    await expect(migrateGuestData(data, 'owner')).resolves.toMatchObject({
      success: false,
      counts: { resumes: 1 },
    });
  }
  expect(sql.prepare('SELECT source FROM resumes WHERE id = ?').get('theirs').source).toBe(
    'Existing content'
  );
  expect(sql.prepare('SELECT id FROM resumes WHERE user_id = ?').all('owner')).toEqual([
    { id: 'mine' },
  ]);
});
it('rejects direct persistence of a new inline master before creating a job, master or version', async () => {
  await expect(
    recordResumeHistory({
      resume_source: `# Synthetic master\n${sample}`,
      jd_text: 'Synthetic job',
      source: 'Synthetic tailored resume.',
    })
  ).rejects.toThrow('Inline master resume, line 2');
  expect(db.batch).not.toHaveBeenCalled();
  expect(sql.prepare('SELECT count(*) AS count FROM resumes').get().count).toBe(0);
});
