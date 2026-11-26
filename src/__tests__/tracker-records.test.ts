// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth-utils';
import { createJobApplication, listJobApplications } from '@/lib/actions/job-actions';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
import { callTracker, getApplicationAnalytics } from '@/lib/actions/tracker-records';

vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { execute: vi.fn() } }));
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
let sql: InstanceType<typeof DatabaseSync>;
const call = (name: string, args: unknown) => callTracker(`rolepatch_${name}`, args);
async function ok(name: string, args: unknown) {
  const result = await call(name, args);
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result;
}
const job = {
  request_id: 'request-one',
  role: 'Engineer',
  company: 'Acme',
  url: 'https://jobs.acme.test/view?id=1&utm_source=campaign',
};
beforeEach(() => {
  sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=on;');
  sql.exec(readFileSync('migrations/0001_initial_schema.sql', 'utf8'));
  sql.exec(
    "INSERT INTO job_applications(id,user_id,company,role,status,url) VALUES('old','owner','Old','Engineer','interview','https://legacy.acme.test/role?utm_medium=email')"
  );
  sql.exec(readFileSync('migrations/0004_application_tracker.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0005_career_profiles.sql', 'utf8'));
  vi.mocked(getCurrentUserId).mockResolvedValue('owner');
  vi.mocked(db.execute).mockImplementation(async (input) => {
    const statement = sql.prepare(typeof input === 'string' ? input : input.sql);
    const args = typeof input === 'string' ? [] : (input.args ?? []);
    const columns = statement.columns().map((c: { name: string }) => c.name);
    const results = columns.length ? statement.all(...args) : [];
    const changes = columns.length ? results.length : statement.run(...args).changes;
    return { rows: results, columns, rowsAffected: Number(changes), lastInsertRowid: null };
  });
});
afterEach(() => {
  sql.close();
  vi.clearAllMocks();
});
describe('owned application tracker', () => {
  it('summarizes all dated submissions for the owner and preserves interview history after rejection', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-26T19:00:00Z'));
      const applied = Date.parse('2026-11-10T00:00:00Z') / 1000;
      const rangeStart = Date.parse('2026-08-29T00:00:00Z') / 1000;
      const add = sql.prepare(
        'INSERT INTO job_applications(id,user_id,company,role,status,stage,url,applied_at,interview_date) VALUES(?,?,?,?,?,?,?,?,?)'
      );
      for (let i = 0; i < 15; i++) {
        add.run(
          `dated-${i}`,
          'owner',
          'Example',
          'Engineer',
          'applied',
          'applied',
          '',
          applied,
          null
        );
      }
      add.run(
        'rejected',
        'owner',
        'Example',
        'Engineer',
        'interview',
        'technical',
        '',
        rangeStart,
        null
      );
      await ok('applications_update', { id: 'rejected', expected_revision: 1, status: 'rejected' });
      add.run(
        'offered',
        'owner',
        'Example',
        'Engineer',
        'offer',
        'offer',
        '',
        applied,
        applied + 86400
      );
      add.run(
        'out-of-range',
        'owner',
        'Example',
        'Engineer',
        'applied',
        'applied',
        '',
        rangeStart - 1,
        null
      );
      add.run(
        'future',
        'owner',
        'Example',
        'Engineer',
        'applied',
        'applied',
        '',
        Date.parse('2026-11-27') / 1000,
        null
      );
      add.run('draft', 'owner', 'Example', 'Engineer', 'draft', 'preparing', '', null, null);
      add.run(
        'other-owner',
        'foreign',
        'Example',
        'Engineer',
        'offer',
        'offer',
        '',
        applied,
        applied
      );

      expect(await getApplicationAnalytics(90)).toMatchObject({
        ok: true,
        summary: {
          total: 17,
          interviewed: 2,
          offers: 1,
          undated: 1,
          months: [
            { month: '2026-08', count: 1 },
            { month: '2026-09', count: 0 },
            { month: '2026-10', count: 0 },
            { month: '2026-11', count: 16 },
          ],
          stages: [
            { stage: 'applied', count: 15 },
            { stage: 'offer', count: 1 },
            { stage: 'rejected', count: 1 },
          ],
        },
      });
      expect(await getApplicationAnalytics(30)).toMatchObject({
        ok: true,
        summary: { total: 16, interviewed: 1, offers: 1, undated: 1 },
      });
      expect(await getApplicationAnalytics(60 as 90)).toMatchObject({ ok: false });
      vi.mocked(getCurrentUserId).mockResolvedValue(null);
      expect(await getApplicationAnalytics(90)).toMatchObject({ ok: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('imports ten jobs twice, maps legacy rows, filters and pages without loss', async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      ...job,
      url: `https://jobs.acme.test/view?id=${i}`,
      request_id: `r${i}`,
      status: 'ready',
      follow_up_at: 10,
    }));
    const first = await ok('applications_bulk_upsert', { items });
    expect(first.outcomes?.every((e) => e.ok)).toBe(true);
    const replay = await ok('applications_bulk_upsert', { items });
    expect(replay.outcomes).toEqual(first.outcomes);
    expect((await ok('applications_get', { id: 'old' })).record?.status).toBe('screening');
    const legacy = await ok('applications_create', {
      ...job,
      company: 'Old',
      request_id: 'legacy',
      url: 'https://legacy.acme.test/role/',
    });
    expect(legacy.id).toBe('old');
    let cursor: string | null | undefined;
    const found: string[] = [];
    do {
      const result = await ok('applications_list', {
        status: 'ready',
        due_before: 10,
        limit: 3,
        cursor: cursor ?? undefined,
      });
      found.push(...result.items!.map((row) => String(row.id)));
      cursor = result.next_cursor;
    } while (cursor);
    expect(found.length).toBe(10);
    expect(new Set(found).size).toBe(10);
    const one = await ok('applications_create', job);
    expect(one.id).toBe(found.find((id) => first.outcomes?.[1].ok && first.outcomes[1].id === id));
    expect(
      (await ok('applications_bulk_upsert', { items: [{ bad: 1 }, items[0]] })).outcomes?.map(
        (i) => i.ok
      )
    ).toEqual([false, true]);
  });
  it('enforces account boundaries and revision checks, including changes from existing UI writers', async () => {
    const a = await ok('applications_create', job);
    sql.prepare("UPDATE job_applications SET status='applied' WHERE id=?").run(a.id);
    expect((await ok('applications_get', { id: a.id })).record).toMatchObject({
      status: 'applied',
      revision: 2,
    });
    expect(
      await call('applications_update', { id: a.id, expected_revision: 1, status: 'technical' })
    ).toMatchObject({ code: 'conflict' });
    const b = await ok('applications_update', {
      id: a.id,
      expected_revision: 2,
      status: 'technical',
    });
    expect(b.revision).toBe(3);
    expect(
      (await ok('application_events_list', { application_id: a.id })).items?.map((r) => [
        r.status,
        r.source,
      ])
    ).toEqual([
      ['technical', 'user_reported'],
      ['applied', 'existing_workflow'],
      ['discovered', 'user_reported'],
    ]);
    vi.mocked(getCurrentUserId).mockResolvedValue('foreign');
    expect(await call('applications_get', { id: a.id })).toMatchObject({ code: 'not_found' });
    expect(
      await call('applications_update', { id: a.id, expected_revision: 3, notes: 'x' })
    ).toMatchObject({ code: 'not_found' });
    expect(await call('application_events_list', { application_id: a.id })).toMatchObject({
      code: 'not_found',
    });
    expect((await ok('applications_create', job)).id).not.toBe(a.id);
    expect(await call('applications_create', { ...job, user_id: 'owner' })).toMatchObject({
      code: 'invalid_input',
    });
    vi.mocked(getCurrentUserId).mockResolvedValue(null);
    vi.mocked(db.execute).mockClear();
    expect(await call('applications_list', {})).toMatchObject({ code: 'unauthenticated' });
    expect(db.execute).not.toHaveBeenCalled();
  });
  it('snapshots material versions at submission and keeps user claims separate from receipts', async () => {
    const a = await ok('applications_create', job);
    sql.exec("INSERT INTO resumes(id,name,user_id) VALUES('r','Master','owner')");
    sql
      .prepare(
        "INSERT INTO cover_letters(id,user_id,job_id,resume_id,content) VALUES('c','owner',?,'r','Original letter')"
      )
      .run(a.id);
    const m = await ok('materials_upsert', {
      application_id: a.id,
      request_id: 'first',
      kind: 'cover_letter',
      title: 'Letter',
      reference_type: 'cover_letter',
      reference_id: 'c',
    });
    sql.exec("UPDATE cover_letters SET content='Changed' WHERE id='c'");
    const eventInput = {
      application_id: a.id,
      request_id: 'submitted',
      material_versions: [{ id: m.id, revision: 1 }],
      status: 'applied',
      expected_revision: 1,
      note: 'I applied on Monday',
    };
    const event = await ok('application_events_add', eventInput);
    expect((await ok('application_events_add', eventInput)).id).toBe(event.id);
    expect(JSON.parse(String(event.record?.material_versions))).toEqual([
      { id: m.id, revision: 1 },
    ]);
    expect(sql.prepare('SELECT count(*) AS n FROM application_receipts').get().n).toBe(0);
    await ok('materials_upsert', {
      id: m.id,
      application_id: a.id,
      expected_revision: 1,
      title: 'New draft',
      kind: 'cover_letter',
      content: 'Revised letter',
    });
    expect((await ok('materials_get', { id: m.id, revision: 1 })).record?.content).toBe(
      'Original letter'
    );
    expect(
      await call('materials_delete', {
        id: m.id,
        expected_revision: 2,
        permanent: true,
        confirm_id: m.id,
      })
    ).toMatchObject({ code: 'conflict' });
    expect((await ok('materials_delete', { id: m.id, expected_revision: 2 })).revision).toBe(3);
    expect((await ok('materials_list', { application_id: a.id })).items).toEqual([]);
    expect(
      await call('applications_delete', {
        id: a.id,
        expected_revision: 2,
        permanent: true,
        confirm_id: a.id,
      })
    ).toMatchObject({ code: 'conflict' });
    vi.mocked(getCurrentUserId).mockResolvedValue('foreign');
    const other = await ok('applications_create', job);
    expect(
      await call('materials_upsert', {
        application_id: other.id,
        request_id: 'first',
        kind: 'cover_letter',
        title: 'Letter',
        reference_type: 'cover_letter',
        reference_id: 'c',
      })
    ).toMatchObject({ code: 'not_found' });
    expect(await call('materials_get', { id: m.id })).toMatchObject({ code: 'not_found' });
  });
  it('shares web job creation, refuses foreign resumes and keeps withdrawn rows out of legacy counts', async () => {
    sql.exec(
      "INSERT INTO resumes(id,name,user_id) VALUES('mine','Master','owner'),('theirs','Master','foreign')"
    );
    const tracked = await ok('applications_create', job);
    expect(
      await createJobApplication('mine', job.url, 'Acme', 'Engineer', '', 'Test description')
    ).toBe(tracked.id);
    await expect(
      createJobApplication('theirs', job.url, 'Acme', 'Engineer', '', 'Test description')
    ).rejects.toThrow('not found');
    const row = (await ok('applications_get', { id: tracked.id })).record!;
    expect(row.jd_text).toBe('Test description');
    await ok('applications_update', {
      id: tracked.id,
      expected_revision: row.revision,
      status: 'withdrawn',
    });
    expect((await listJobApplications()).map((j) => j.id)).not.toContain(tracked.id);
    expect((await ok('applications_list', { status: 'withdrawn' })).items).toHaveLength(1);
  });
  it('retains intake keys after URL changes and rejects unknown material snapshots atomically', async () => {
    const tracked = await ok('applications_create', job);
    const duplicate = { ...job, request_id: 'different intake' };
    expect((await ok('applications_create', duplicate)).id).toBe(tracked.id);
    await ok('applications_update', {
      id: tracked.id,
      expected_revision: 1,
      url: 'https://jobs.acme.test/changed',
    });
    expect((await ok('applications_create', duplicate)).id).toBe(tracked.id);
    expect(
      await call('applications_create', { ...duplicate, role: 'Different role' })
    ).toMatchObject({ code: 'conflict' });
    expect(
      await call('application_events_add', {
        application_id: tracked.id,
        request_id: 'wrong',
        expected_revision: 2,
        status: 'applied',
        note: 'Resume attached',
        material_versions: [{ id: 'unknown', revision: 1 }],
      })
    ).toMatchObject({ code: 'conflict' });
    expect((await ok('applications_get', { id: tracked.id })).record).toMatchObject({
      status: 'discovered',
      revision: 2,
    });
  });
  it('separates manual jobs and query identities; resolves board identity conflicts', async () => {
    const a = await ok('applications_create', {
      company: 'Acme',
      role: 'Engineer',
      manual_id: 'manual1',
      request_id: 'a',
    });
    const b = await ok('applications_create', {
      company: 'Acme',
      role: 'Engineer',
      manual_id: 'manual2',
      request_id: 'b',
    });
    expect(b.id).not.toBe(a.id);
    expect(await call('applications_create', { ...job, request_id: 'a' })).toMatchObject({
      code: 'conflict',
    });
    const dup = await ok('applications_create', {
      ...job,
      board: 'greenhouse/acme',
      external_job_id: '123',
    });
    expect(
      (
        await ok('applications_create', {
          company: 'Acme',
          role: 'Engineer',
          request_id: 'board',
          board: 'greenhouse/acme',
          external_job_id: '123',
        })
      ).id
    ).toBe(dup.id);
    expect(
      await call('applications_update', { id: a.id, expected_revision: 1, url: job.url })
    ).toMatchObject({ code: 'conflict' });
    await ok('applications_delete', { id: a.id, expected_revision: 1 });
    expect((await ok('applications_list', { status: 'archived' })).items).toHaveLength(1);
    await ok('applications_update', { id: a.id, status: 'ready', expected_revision: 2 });
    await ok('applications_delete', {
      id: a.id,
      expected_revision: 3,
      permanent: true,
      confirm_id: a.id,
    });
    expect(await call('applications_get', { id: a.id })).toMatchObject({ code: 'not_found' });
  });
});
