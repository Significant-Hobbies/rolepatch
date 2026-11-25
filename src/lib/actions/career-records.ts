'use server';

import { z } from 'zod';
import {
  careerSecretMessage,
  careerCredentialIssue,
  containsCareerCredential,
  containsCredentialAnswer,
} from '@/lib/career-data-privacy';
import { getCurrentUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import {
  careerData,
  careerClaimChanged,
  careerSchemas,
  type CareerProfile,
  type CareerData,
  type CareerRecord,
  type CareerToolName,
} from '@/lib/career-tools';

type Row = Record<string, unknown>;
type Arg = string | number | null;
type Input<N extends CareerToolName> = z.infer<(typeof careerSchemas)[N]>;
const fail = (code: string, error: string) => ({ ok: false as const, code, error });
const absent = () => fail('not_found', 'No matching career profile or record.');
function conflict(row: Row, message = 'The record changed. Read its current revision and retry.') {
  return { ...fail('conflict', message), id: String(row.id), revision: Number(row.revision) };
}
const profileFields = 'id,name,source,is_default,archived_at,revision';
const profileQuery = `SELECT ${profileFields} FROM resumes WHERE user_id=? AND id=?`;
const recordQuery =
  'SELECT id,profile_id,kind,title,data_json,sensitive,revision,archived_at FROM career_records WHERE user_id=? AND profile_id=?';
function profileRow(row: Row): CareerProfile {
  return {
    id: String(row.id),
    name: String(row.name),
    source: String(row.source),
    revision: Number(row.revision),
    is_default: Boolean(row.is_default),
    archived_at: row.archived_at === null ? null : Number(row.archived_at),
  };
}
function recordRow(row: Row): CareerRecord {
  return {
    id: String(row.id),
    profile_id: String(row.profile_id),
    kind: row.kind as CareerRecord['kind'],
    title: String(row.title),
    data: JSON.parse(String(row.data_json)),
    sensitive: Boolean(row.sensitive),
    revision: Number(row.revision),
    archived_at: row.archived_at === null ? null : Number(row.archived_at),
  };
}
function pageOf<T extends { id: string }>(rows: T[], limit: number) {
  const items = rows.slice(0, limit);
  return { items, next_cursor: rows.length > limit ? items[items.length - 1].id : null };
}
async function listProfiles(user: string, input: Input<'rolepatch_profiles_list'>) {
  const limit = input.limit ?? 50;
  const rows = await db.execute({
    sql: 'SELECT id,name,is_default,archived_at,revision FROM resumes WHERE user_id=? AND id>? AND (? OR archived_at IS NULL) ORDER BY id LIMIT ?',
    args: [user, input.cursor ?? '', Number(!!input.include_archived), limit + 1],
  });
  const { items, next_cursor } = pageOf(
    rows.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      is_default: Boolean(row.is_default),
      archived_at: row.archived_at,
      revision: Number(row.revision),
    })),
    limit
  );
  return { ok: true as const, profiles: items, next_cursor };
}
async function listRecords(user: string, input: Input<'rolepatch_career_records_list'>) {
  const limit = input.limit ?? 50;
  let sql = `${recordQuery} AND id>? AND (? OR archived_at IS NULL) AND (? OR sensitive=0)`;
  const args: Arg[] = [
    user,
    input.profile_id,
    input.cursor ?? '',
    Number(!!input.include_archived),
    Number(!!input.include_sensitive),
  ];
  if (input.sections?.length) {
    sql += ` AND kind IN (${input.sections.map(() => '?').join(',')})`;
    args.push(...input.sections);
  }
  if (input.query) {
    sql += ' AND (instr(lower(title),lower(?))>0 OR instr(lower(data_json),lower(?))>0)';
    args.push(input.query, input.query);
  }
  const result = await db.execute({
    sql: `${sql} ORDER BY id LIMIT ?`,
    args: [...args, limit + 1],
  });
  const { items, next_cursor } = pageOf(result.rows.map(recordRow), limit);
  return { ok: true as const, records: items, next_cursor };
}
async function legacySources(user: string, input: Input<'rolepatch_profiles_get'>) {
  const limit = input.limit ?? 50;
  const result = await db.execute({
    sql: `SELECT id,kind,title,content FROM (
    SELECT 'evidence:'||id id,'achievement' kind,title,
      json_object('situation',situation,'action',action,'result',result,'metric',metric,'scope',scope,'skills',skills,'role_targets',role_targets,'impact_type',impact_type) content
      FROM achievement_evidence WHERE user_id=?
    UNION ALL SELECT 'stash:'||id,'note',label,json_object('category',category,'content',content) FROM stash_entries WHERE user_id=?
    UNION ALL SELECT 'answer:'||id,'answer',label,json_object('category',category,'answer',answer,'sensitive',sensitive) FROM profile_answers WHERE user_id=? AND (sensitive=0 OR ?)
    ) WHERE id>? AND (? IS NULL OR kind IN (SELECT value FROM json_each(?))) ORDER BY id LIMIT ?`,
    args: [
      user,
      user,
      user,
      Number(!!input.include_sensitive),
      input.cursor ?? '',
      input.sections ? JSON.stringify(input.sections) : null,
      JSON.stringify(input.sections ?? []),
      limit + 1,
    ],
  });
  const { items, next_cursor } = pageOf(
    result.rows.map((row) => ({
      id: String(row.id),
      kind: String(row.kind),
      title: String(row.title),
      data: JSON.parse(String(row.content)) as Row,
    })),
    limit
  );
  return { legacy_sources: items, next_cursor };
}
async function getProfile(user: string, input: Input<'rolepatch_profiles_get'>) {
  const query = input.profile_id
    ? { sql: profileQuery, args: [user, input.profile_id] }
    : {
        sql:
          'SELECT ' +
          profileFields +
          ' FROM resumes WHERE user_id=? AND is_default=1 AND archived_at IS NULL',
        args: [user],
      };
  const row = (await db.execute(query)).rows[0];
  if (!row) return absent();
  const profile = profileRow(row);
  const records = input.legacy_sources
    ? await legacySources(user, input)
    : await listRecords(user, { ...input, profile_id: profile.id });
  return { ...records, ok: true as const, profile };
}
async function createProfile(user: string, input: Input<'rolepatch_profiles_create'>) {
  const issue =
    careerCredentialIssue('Profile name', input.name) ??
    careerCredentialIssue('Master resume', input.source) ??
    careerCredentialIssue('Request ID', input.request_id);
  if (issue) return fail('invalid_input', issue);
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(
          JSON.stringify([input.name, input.source ?? '', input.is_default ?? false])
        )
      )
    ),
    (i) => i.toString(16).padStart(2, '0')
  ).join('');
  const [, read] = await db.batch([
    {
      sql: `INSERT INTO resumes(id,user_id,name,source,is_default,create_request_id,create_payload_hash)
    SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM resumes WHERE user_id=? AND create_request_id=?)`,
      args: [
        crypto.randomUUID(),
        user,
        input.name,
        input.source ?? '',
        Number(!!input.is_default),
        input.request_id,
        hash,
        user,
        input.request_id,
      ],
    },
    {
      sql:
        'SELECT ' +
        profileFields +
        ',create_payload_hash FROM resumes WHERE user_id=? AND create_request_id=?',
      args: [user, input.request_id],
    },
  ]);
  const row = read.rows[0];
  if (!row) return absent();
  if (row.create_payload_hash !== hash)
    return conflict(row, 'This request ID was already used for a different profile.');
  const profile = profileRow(row);
  return { ok: true as const, id: profile.id, revision: profile.revision, profile };
}
async function updateProfile(
  user: string,
  input: Input<'rolepatch_profiles_update'>,
  archive: boolean
) {
  if (containsCareerCredential(input.name, input.source)) {
    const existing = (await db.execute({ sql: profileQuery, args: [user, input.profile_id] }))
      .rows[0];
    if (!existing) return absent();
    if (existing.revision !== input.expected_revision) return conflict(existing);
    const issue =
      careerCredentialIssue('Profile name', input.name, String(existing.name)) ??
      careerCredentialIssue('Master resume', input.source, String(existing.source));
    if (issue) return fail('invalid_input', issue);
  }
  const [changed, read] = await db.batch([
    {
      sql: `UPDATE resumes SET name=coalesce(?,name),source=coalesce(?,source),
    is_default=CASE WHEN ? THEN 0 ELSE coalesce(?,is_default) END, archived_at=CASE WHEN ? THEN unixepoch() WHEN ? THEN NULL ELSE archived_at END
    WHERE user_id=? AND id=? AND revision=? AND (archived_at IS NULL OR ?)`,
      args: [
        input.name ?? null,
        input.source ?? null,
        Number(archive),
        input.is_default === undefined ? null : Number(input.is_default),
        Number(archive),
        Number(!!input.restore),
        user,
        input.profile_id,
        input.expected_revision,
        Number(!!input.restore),
      ],
    },
    { sql: profileQuery, args: [user, input.profile_id] },
  ]);
  if (!read.rows[0]) return absent();
  // D1 includes the revision and default-selection trigger writes in meta.changes.
  if (!changed.rowsAffected) return conflict(read.rows[0]);
  const profile = profileRow(read.rows[0]);
  return { ok: true as const, id: profile.id, revision: profile.revision, profile };
}
type RecordWrite = Input<'rolepatch_career_records_upsert'>;
function fieldText(value: CareerData[keyof CareerData]) {
  if (Array.isArray(value)) return value.join('\n');
  return typeof value === 'string' ? value : undefined;
}
function changedCredentialAnswer(input: RecordWrite, data: CareerData, previous?: CareerRecord) {
  if (input.kind !== 'answer') return false;
  const fields = ['value', 'original_text', 'approved_wording', 'summary'] as const;
  if (previous?.title === input.title && fields.every((key) => data[key] === previous.data[key]))
    return false;
  return containsCredentialAnswer(
    input.title,
    fields.map((key) => data[key] ?? '')
  );
}
function careerRecordPrivacyIssue(input: RecordWrite, merged: CareerData, previous?: CareerRecord) {
  if (changedCredentialAnswer(input, merged, previous)) return `Answer. ${careerSecretMessage}`;
  const labelIssue =
    careerCredentialIssue('Record ID', input.id, previous?.id) ??
    careerCredentialIssue('Record title', input.title, previous?.title);
  if (labelIssue) return labelIssue;
  for (const key of Object.keys(merged) as (keyof CareerData)[]) {
    const issue = careerCredentialIssue(
      `Record ${key}`,
      fieldText(merged[key]),
      fieldText(previous?.data[key])
    );
    if (issue) return issue;
  }
  return null;
}
function verified(status: CareerData['verification_status']) {
  return status === 'user_confirmed' || status === 'document_supported';
}
async function writeRecord(user: string, input: RecordWrite) {
  if (input.reconfirm && !verified(input.data.verification_status))
    return fail(
      'invalid_input',
      'Supply user_confirmed or document_supported alongside reconfirm: true.'
    );
  if (input.restore && input.expected_revision === undefined)
    return fail(
      'invalid_input',
      'Read the archived record and supply its expected revision to restore it.'
    );
  if (input.sensitive && (!input.include_sensitive || input.kind !== 'answer'))
    return fail(
      'invalid_input',
      'Sensitive content requires an answer record and explicit opt-in.'
    );
  const scope = [user, input.profile_id, input.id];
  const read = {
    sql: `${recordQuery} AND id=? AND (sensitive=0 OR ?)`,
    args: [...scope, Number(!!input.include_sensitive)],
  };
  const current = (await db.execute(read)).rows[0];
  const previous = current ? recordRow(current) : undefined;
  const sensitive = input.sensitive ?? previous?.sensitive ?? false;
  const merged = { ...previous?.data, ...input.data };
  for (const key of input.clear_fields ?? []) delete merged[key];
  const issue = careerRecordPrivacyIssue(input, merged, previous);
  if (issue) return fail('invalid_input', issue);
  const factsChanged =
    input.title !== previous?.title || careerClaimChanged(previous?.data ?? {}, merged);
  if (!merged.verification_status) merged.verification_status = 'unverified';
  if (
    factsChanged &&
    verified(previous?.data.verification_status) &&
    verified(merged.verification_status) &&
    !(input.reconfirm && input.data.verification_status)
  ) {
    if (input.data.verification_status)
      return fail(
        'invalid_input',
        'Review the changed claim and supply reconfirm: true to keep its verified status.'
      );
    merged.verification_status = 'unverified';
  }
  if (merged.verification_status === 'document_supported' && !merged.source_urls?.length)
    return fail('invalid_input', 'Document-supported records require a source URL.');
  const data = JSON.stringify(careerData.parse(merged));
  const values = [input.title, data, Number(sensitive)];
  let result: Awaited<ReturnType<typeof db.batch>>;
  try {
    result = await db.batch([
      {
        sql: `INSERT INTO career_records(user_id,profile_id,id,kind,title,data_json,sensitive)
       SELECT ?,?,?,?,?,?,? WHERE ? IS NULL AND EXISTS (SELECT 1 FROM resumes WHERE user_id=? AND id=? AND archived_at IS NULL)
       AND NOT EXISTS (SELECT 1 FROM career_records WHERE user_id=? AND profile_id=? AND id=?)`,
        args: [
          ...scope,
          input.kind,
          ...values,
          input.expected_revision ?? null,
          user,
          input.profile_id,
          ...scope,
        ],
      },
      {
        sql: `UPDATE career_records SET title=?,data_json=?,sensitive=?,archived_at=NULL,revision=revision+1
        WHERE user_id=? AND profile_id=? AND id=? AND kind=? AND revision=? AND (archived_at IS NULL OR ?) AND (sensitive=0 OR ?)
        AND (title<>? OR data_json<>? OR sensitive<>? OR archived_at IS NOT NULL) AND EXISTS (SELECT 1 FROM resumes WHERE user_id=? AND id=? AND archived_at IS NULL)`,
        args: [
          ...values,
          ...scope,
          input.kind,
          input.expected_revision ?? null,
          Number(!!input.restore),
          Number(!!input.include_sensitive),
          ...values,
          user,
          input.profile_id,
        ],
      },
      read,
      {
        sql: 'SELECT id FROM resumes WHERE user_id=? AND id=? AND archived_at IS NULL',
        args: [user, input.profile_id],
      },
    ]);
  } catch (error) {
    if (
      error instanceof Error &&
      /invalid related (role|project)/.test(`${String(error)} ${String(error.cause)}`)
    )
      return fail('invalid_input', 'The related role or project must belong to this profile.');
    throw error;
  }
  const row = result[2].rows[0];
  if (!row || !result[3].rows.length) return absent();
  if (
    row.archived_at !== null ||
    row.kind !== input.kind ||
    row.title !== input.title ||
    row.data_json !== data ||
    row.sensitive !== Number(sensitive)
  )
    return conflict(row);
  const record = recordRow(row);
  return { ok: true as const, id: record.id, revision: record.revision, record };
}
async function removeRecord(user: string, input: Input<'rolepatch_career_records_delete'>) {
  if (input.permanent && input.confirm_id !== input.id)
    return fail('invalid_input', 'Confirm the record ID to delete it permanently.');
  const scope = [user, input.profile_id, input.id];
  const where =
    ' WHERE user_id=? AND profile_id=? AND id=? AND revision=? AND (sensitive=0 OR ?) AND EXISTS(SELECT 1 FROM resumes WHERE user_id=? AND id=? AND archived_at IS NULL)';
  const args = [
    ...scope,
    input.expected_revision,
    Number(!!input.include_sensitive),
    user,
    input.profile_id,
  ];
  const remove = input.permanent
    ? {
        sql:
          'DELETE FROM career_records' +
          where +
          ` AND NOT EXISTS(SELECT 1 FROM career_records child WHERE child.user_id=? AND child.profile_id=? AND
    (json_extract(child.data_json,'$.related_role_id')=? OR json_extract(child.data_json,'$.related_project_id')=?))`,
        args: [...args, user, input.profile_id, input.id, input.id],
      }
    : {
        sql:
          'UPDATE career_records SET archived_at=unixepoch(), revision=revision+1' +
          where +
          ' AND archived_at IS NULL',
        args,
      };
  const [before, changed] = await db.batch([
    {
      sql: `${recordQuery} AND id=? AND (sensitive=0 OR ?) AND EXISTS (SELECT 1 FROM resumes WHERE user_id=? AND id=? AND archived_at IS NULL)`,
      args: [...scope, Number(!!input.include_sensitive), user, input.profile_id],
    },
    remove,
  ]);
  if (!before.rows.length) return absent();
  if (!changed.rowsAffected)
    return conflict(before.rows[0], 'Check the latest revision, archive state and linked records.');
  return {
    ok: true as const,
    id: input.id,
    revision: input.expected_revision + 1,
    permanent: !!input.permanent,
  };
}

export async function callCareer(name: string, raw: unknown) {
  const user = await getCurrentUserId();
  if (!user) return fail('unauthenticated', 'Connect your account to access career profiles.');
  try {
    switch (name) {
      case 'rolepatch_profiles_list':
        return await listProfiles(user, careerSchemas[name].parse(raw));
      case 'rolepatch_profiles_get':
        return await getProfile(user, careerSchemas[name].parse(raw));
      case 'rolepatch_profiles_create':
        return await createProfile(user, careerSchemas[name].parse(raw));
      case 'rolepatch_profiles_update':
      case 'rolepatch_profiles_archive':
        return await updateProfile(user, careerSchemas[name].parse(raw), name.endsWith('_archive'));
      case 'rolepatch_career_records_list': {
        const input = careerSchemas[name].parse(raw);
        if (
          !(
            await db.execute({
              sql: 'SELECT id FROM resumes WHERE user_id=? AND id=?',
              args: [user, input.profile_id],
            })
          ).rows.length
        )
          return absent();
        return await listRecords(user, input);
      }
      case 'rolepatch_career_records_get': {
        const input = careerSchemas[name].parse(raw);
        const row = (
          await db.execute({
            sql: `${recordQuery} AND id=? AND (sensitive=0 OR ?)`,
            args: [user, input.profile_id, input.id, Number(!!input.include_sensitive)],
          })
        ).rows[0];
        return row ? { ok: true as const, record: recordRow(row) } : absent();
      }
      case 'rolepatch_career_records_upsert':
        return await writeRecord(user, careerSchemas[name].parse(raw));
      case 'rolepatch_career_records_bulk_upsert': {
        const input = careerSchemas[name]
          .extend({ records: z.array(z.unknown()).min(1).max(50) })
          .parse(raw);
        const outcomes: Awaited<ReturnType<typeof writeRecord>>[] = [];
        for (const item of input.records) {
          const parsed = careerSchemas[name].shape.records.element.safeParse(item);
          if (!parsed.success) {
            outcomes.push(
              fail(
                'invalid_input',
                parsed.error.issues
                  .map((issue) => `${issue.path.join('.')} ${issue.message}`)
                  .join('; ')
              )
            );
            continue;
          }
          outcomes.push(
            await writeRecord(user, {
              ...parsed.data,
              profile_id: input.profile_id,
              include_sensitive: input.include_sensitive,
            })
          );
        }
        return { ok: true as const, outcomes };
      }
      case 'rolepatch_career_records_delete':
        return await removeRecord(user, careerSchemas[name].parse(raw));
      default:
        return fail('invalid_input', 'Unknown career tool.');
    }
  } catch (error) {
    if (error instanceof z.ZodError)
      return fail(
        'invalid_input',
        error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ')
      );
    throw error;
  }
}
