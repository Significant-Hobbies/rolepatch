// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { callCareer } from '@/lib/actions/career-records';
import { careerTools } from '@/lib/career-tools';

interface TestDatabase {
  close(): void;
  exec(sql: string): void;
  prepare(sql: string): {
    all(...args: (string | number | null)[]): Record<string, unknown>[];
    run(...args: (string | number | null)[]): { changes: number };
  };
}
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as {
  DatabaseSync: new (path: string) => TestDatabase;
};
let sqlite: TestDatabase;
let owner: string | null;
type Statement = { sql: string; args?: (string | number | null)[] };
function execute({ sql, args = [] }: Statement) {
  const statement = sqlite.prepare(sql);
  if (/^\s*SELECT/i.test(sql)) return { rows: statement.all(...args), rowsAffected: 0 };
  return { rows: [], rowsAffected: Number(statement.run(...args).changes) };
}
vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: async () => owner }));
vi.mock('@/lib/db', () => ({
  db: {
    execute: async (input: Statement) => execute(input),
    batch: async (statements: Statement[]) => {
      sqlite.exec('BEGIN');
      try {
        const result = statements.map(execute);
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  },
}));
beforeEach(() => {
  owner = 'one';
  sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_initial_schema.sql', '0005_career_profiles.sql'])
    sqlite.exec(readFileSync(`migrations/${name}`, 'utf8'));
});
afterEach(() => sqlite.close());
async function createProfile(name = 'Master', request_id = 'create') {
  const response = await callCareer('rolepatch_profiles_create', {
    request_id,
    name,
    is_default: true,
    source: '# Unmodified',
  });
  if (!response.ok || !('profile' in response)) throw new Error('create failed');
  return response.profile;
}
const get = (profile_id: string) => callCareer('rolepatch_profiles_get', { profile_id });
it('preserves Markdown, registers JSON input schemas, and replays profile creates without changing another default', async () => {
  expect(careerTools.map((t) => t.inputSchema.type)).toEqual(new Array(10).fill('object'));
  const first = await createProfile();
  const other = await createProfile('Second', 'two');
  expect((await createProfile()).id).toBe(first.id);
  expect(await callCareer('rolepatch_profiles_get', {})).toMatchObject({
    profile: { id: other.id, source: '# Unmodified', is_default: true },
  });
  expect(await get(first.id)).toMatchObject({ profile: { is_default: false, revision: 2 } });
  expect(
    await callCareer('rolepatch_profiles_create', { request_id: 'create', name: 'Different' })
  ).toMatchObject({ code: 'conflict' });
  expect(
    await callCareer('rolepatch_profiles_update', {
      profile_id: first.id,
      expected_revision: 1,
      name: 'Stale',
    })
  ).toMatchObject({ code: 'conflict' });
  expect(
    await callCareer('rolepatch_profiles_update', {
      profile_id: first.id,
      expected_revision: 2,
      is_default: true,
    })
  ).toMatchObject({ ok: true, revision: 3 });
  expect(
    await callCareer('rolepatch_profiles_archive', { profile_id: first.id, expected_revision: 3 })
  ).toMatchObject({ ok: true, revision: 4 });
  expect(await callCareer('rolepatch_profiles_get', {})).toMatchObject({ code: 'not_found' });
  expect(
    await callCareer('rolepatch_profiles_update', {
      profile_id: first.id,
      expected_revision: 4,
      restore: true,
    })
  ).toMatchObject({ ok: true, profile: { archived_at: null, revision: 5 } });
});
it('imports linked records, produces stable pages, protects sources and permits granular corrections', async () => {
  const { id: profile_id } = await createProfile();
  const role = { id: 'role', kind: 'employment', title: 'Engineer', data: { employer: 'Acme' } };
  const achievement = {
    id: 'ach',
    kind: 'achievement',
    title: 'Latency',
    data: {
      related_role_id: 'role',
      original_text: 'Team latency fell.',
      individual_contribution: 'Built the cache.',
    },
  };
  const input = {
    profile_id,
    records: [
      role,
      achievement,
      { ...achievement, id: 'invalid', data: { related_role_id: 'missing' } },
    ],
  };
  for (let i = 0; i < 2; i++) {
    expect(await callCareer('rolepatch_career_records_bulk_upsert', input)).toMatchObject({
      outcomes: [{ ok: true, revision: 1 }, { ok: true, revision: 1 }, { code: 'invalid_input' }],
    });
  }
  expect(await get(profile_id)).toMatchObject({ profile: { source: '# Unmodified', revision: 3 } });
  expect(await callCareer('rolepatch_profiles_get', { profile_id, limit: 1 })).toMatchObject({
    records: [{ id: 'ach' }],
    next_cursor: 'ach',
  });
  expect(
    await callCareer('rolepatch_profiles_get', { profile_id, limit: 1, cursor: 'ach' })
  ).toMatchObject({ records: [{ id: 'role' }], next_cursor: null });
  expect(
    await callCareer('rolepatch_career_records_upsert', {
      profile_id,
      ...achievement,
      expected_revision: 1,
      data: { approved_wording: 'Built the cache.' },
    })
  ).toMatchObject({
    ok: true,
    revision: 2,
    record: { data: { original_text: 'Team latency fell.', verification_status: 'unverified' } },
  });
  expect(
    await callCareer('rolepatch_career_records_delete', {
      profile_id,
      id: 'role',
      expected_revision: 1,
      permanent: true,
      confirm_id: 'role',
    })
  ).toMatchObject({ code: 'conflict' });
  expect(
    await callCareer('rolepatch_career_records_list', {
      profile_id,
      sections: ['achievement'],
      query: 'latency',
    })
  ).toMatchObject({ records: [{ id: 'ach', revision: 2 }] });
  owner = 'two';
  expect(await get(profile_id)).toMatchObject({ code: 'not_found' });
  expect(
    await callCareer('rolepatch_career_records_get', { profile_id, id: 'role' })
  ).toMatchObject({ code: 'not_found' });
  expect(
    await callCareer('rolepatch_career_records_upsert', { profile_id, ...role })
  ).toMatchObject({ code: 'not_found' });
  const other = await createProfile();
  expect(
    await callCareer('rolepatch_career_records_upsert', { profile_id: other.id, ...achievement })
  ).toMatchObject({ code: 'invalid_input' });
  owner = null;
  expect(await get(profile_id)).toMatchObject({ code: 'unauthenticated' });
});
it('keeps sensitive answers out of reads, writes and deletes without explicit opt-in', async () => {
  const { id: profile_id } = await createProfile();
  const input = { profile_id, id: 'pay', kind: 'answer', title: 'Pay', data: { value: 'Private' } };
  expect(
    await callCareer('rolepatch_career_records_upsert', { ...input, sensitive: true })
  ).toMatchObject({ code: 'invalid_input' });
  expect(
    await callCareer('rolepatch_career_records_upsert', {
      ...input,
      sensitive: true,
      include_sensitive: true,
    })
  ).toMatchObject({ ok: true });
  expect(await get(profile_id)).toMatchObject({ records: [] });
  expect(
    await callCareer('rolepatch_career_records_upsert', { ...input, expected_revision: 1 })
  ).toMatchObject({ code: 'not_found' });
  expect(
    await callCareer('rolepatch_career_records_delete', {
      profile_id,
      id: 'pay',
      expected_revision: 1,
    })
  ).toMatchObject({ code: 'not_found' });
  expect(
    await callCareer('rolepatch_career_records_get', {
      profile_id,
      id: 'pay',
      include_sensitive: true,
    })
  ).toMatchObject({ record: { sensitive: true, data: { value: 'Private' } } });
  sqlite.exec(
    "INSERT INTO profile_answers(id,user_id,label,answer,sensitive) VALUES ('old','one','Private','Original',1),('other','two','Private','Other',0)"
  );
  expect(
    await callCareer('rolepatch_profiles_get', { profile_id, legacy_sources: true })
  ).toMatchObject({ legacy_sources: [] });
  expect(
    await callCareer('rolepatch_profiles_get', {
      profile_id,
      legacy_sources: true,
      include_sensitive: true,
    })
  ).toMatchObject({ legacy_sources: [{ id: 'answer:old', data: { answer: 'Original' } }] });
});
