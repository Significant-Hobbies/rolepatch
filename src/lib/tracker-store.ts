import type { trackerStages } from '@/lib/tracker-vocabulary';
import { z } from 'zod';
import { db } from '@/lib/db';
import { canonicalTrackerUrl as canonical } from '@/lib/job-url';
import { trackerSchemas, type TrackerName } from '@/lib/tracker-tools';

type Value = string | number | null;
type Item = Record<string, Value>;
export type TrackerResult =
  | {
      ok: true;
      id?: string;
      revision?: number;
      record?: Item;
      items?: Item[];
      submission_receipts?: Item[];
      next_cursor?: string | null;
      outcomes?: TrackerResult[];
    }
  | { ok: false; code: string; error: string; id?: string; revision?: number };
type Stage = (typeof trackerStages)[number];
type S<N extends TrackerName> = z.output<(typeof trackerSchemas)[N]>;
const fail = (code: string, error: string): never => {
  throw new TrackerError(code, error);
};
class TrackerError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
const conflict = () =>
  fail(
    'conflict',
    'The record changed or its identity conflicts with another record. Read the current revision before retrying.'
  );
const missing = () => fail('not_found', 'Record not found.');
const invalid = (message: string) => fail('invalid_input', message);
const legacyStatus: Record<Stage, string> = {
  discovered: 'draft',
  preparing: 'draft',
  ready: 'tailored',
  applied: 'applied',
  screening: 'interview',
  technical: 'interview',
  final_round: 'interview',
  offer: 'offer',
  accepted: 'offer',
  rejected: 'rejected',
  withdrawn: 'rejected',
  archived: 'rejected',
};
const applicationColumns =
  'id,revision,stage AS status,company,role,url,normalized_url,board,external_job_id,manual_id,jd_text,location,remote_eligibility,india_eligibility,salary_min,salary_max,salary_currency,salary_period,compensation_evidence,priority,applied_at,next_action,follow_up_at,interview_date,outcome,rejection_reason,notes,created_at,updated_at';
const materialColumns =
  'id,job_id AS application_id,revision,kind,title,content,reference_type,reference_id,archived,created_at';
const eventColumns =
  'id,job_id AS application_id,revision,status,prior_status,source,note,material_versions,created_at';
async function rows(sql: string, args: Value[] = []): Promise<Item[]> {
  const result = await db.execute({ sql, args });
  // D1 compatibility wrapper also exposes numeric column aliases. Never serialize those.
  return result.rows.map(
    (row) => Object.fromEntries(Object.entries(row).filter(([key]) => !/^\d+$/.test(key))) as Item
  );
}
function saved(record: Item): TrackerResult {
  return { ok: true, id: String(record.id), revision: Number(record.revision), record };
}
async function application(owner: string, id: string) {
  const [found] = await rows(
    `SELECT ${applicationColumns} FROM job_applications WHERE user_id=? AND id=?`,
    [owner, id]
  );
  return found ?? missing();
}
function tupleCursor(cursor: string): [number, string] {
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      Number.isSafeInteger(value[0]) &&
      typeof value[1] === 'string'
    )
      return [value[0], value[1]];
  } catch {
    /* Return one stable validation error for malformed cursors. */
  }
  return invalid('Invalid pagination cursor.');
}
function page(items: Item[], limit: number, sort: string): TrackerResult {
  const more = items.length > limit;
  const visible = items.slice(0, limit);
  const last = visible.at(-1);
  return {
    ok: true,
    items: visible,
    next_cursor:
      more && last
        ? Buffer.from(JSON.stringify([last[sort], last.id])).toString('base64url')
        : null,
  };
}
function pageAfter(where: string[], args: Value[], column: string, cursor?: string) {
  if (!cursor) return;
  const [n, id] = tupleCursor(cursor);
  where.push(`(${column},id)<(?,?)`);
  args.push(n, id);
}
async function listApplications(owner: string, input: S<'rolepatch_applications_list'>) {
  const where = ['user_id=?'];
  const args: Value[] = [owner];
  if (input.query) {
    where.push("(instr(lower(company||' '||role||' '||coalesce(notes,'')),lower(?))>0)");
    args.push(input.query);
  }
  const filters = {
    company: 'lower(company)=lower(?)',
    status: 'stage=?',
    priority: 'priority=?',
    salary_currency: 'salary_currency=?',
    salary_period: 'salary_period=?',
    salary_min: 'coalesce(salary_max,salary_min)>=?',
    salary_max: 'coalesce(salary_min,salary_max)<=?',
    date_from: 'applied_at>=?',
    date_to: 'applied_at<=?',
    due_before: "follow_up_at<=? AND stage NOT IN ('accepted','withdrawn','archived','rejected')",
  };
  for (const key of Object.keys(filters) as (keyof typeof filters)[]) {
    const value = input[key];
    if (value != null) {
      where.push(filters[key]);
      args.push(value);
    }
  }
  if (!input.status) where.push("stage!='archived'");
  pageAfter(where, args, 'created_at', input.cursor);
  const found = await rows(
    `SELECT ${applicationColumns} FROM job_applications WHERE ${where.join(' AND ')} ORDER BY created_at DESC,id DESC LIMIT ?`,
    [...args, input.limit + 1]
  );
  return page(found, input.limit, 'created_at');
}
type Changes = Partial<Omit<S<'rolepatch_applications_update'>, 'id' | 'expected_revision'>>;
function validateIdentity(next: Changes) {
  if (next.url) {
    try {
      canonical(next.url);
    } catch {
      invalid('Use a valid job URL without credentials.');
    }
  }

  if ((next.board == null) !== (next.external_job_id == null))
    invalid('Provide board and external_job_id together.');
  if (next.board && /^(greenhouse|lever|ashby)$/i.test(next.board))
    invalid('Qualify this board with its company slug, for example greenhouse/acme.');
  if (next.salary_min != null && next.salary_max != null && next.salary_min > next.salary_max)
    invalid('Salary minimum exceeds maximum.');
}
function prepared(input: Changes): Item {
  const fields: Item = {};
  // Callers pass validated objects; exclude request metadata.
  for (const key of Object.keys(trackerSchemas.rolepatch_applications_update.shape)) {
    if (['id', 'expected_revision', 'status'].includes(key)) continue;
    const value = input[key as keyof Changes];
    if (value !== undefined) fields[key] = value;
  }
  if (input.url !== undefined) {
    fields.normalized_url = input.url ? canonical(input.url) : null;
    fields.url = input.url || '';
  }
  if (input.board) fields.board = input.board.toLowerCase();
  if (input.status) {
    fields.stage = input.status;
    fields.status = legacyStatus[input.status];
  }
  return fields;
}
/** A historic duplicate keeps its own materials and ID. New URL-only references pick
 * the normalized row, or the oldest active legacy row with a stable ID tie-breaker. */
async function matchingUrl(owner: string, url: string): Promise<string | null> {
  const path = new URL(url);
  path.search = '';
  path.hash = '';
  const escaped = path.href.replace(/\/$/, '').replace(/[\\%_]/g, '\\$&');
  const candidates = await rows(
    `SELECT id,url,normalized_url FROM job_applications WHERE user_id=?
    AND (normalized_url=? OR (normalized_url IS NULL AND url LIKE ? ESCAPE '\\'))
    ORDER BY (normalized_url IS NOT NULL) DESC,(stage IN ('archived','withdrawn')) ASC, created_at ASC,id ASC`,
    [owner, url, `${escaped}%`]
  );
  for (const row of candidates) {
    if (row.normalized_url === url) return String(row.id);
    try {
      if (canonical(String(row.url)) === url) return String(row.id);
    } catch {
      /* Historical URL could be malformed. */
    }
  }
  return null;
}
async function matchIdentity(owner: string, input: Changes): Promise<string | null> {
  const candidates = new Set<string>();
  const conditions: string[] = [];
  const args: Value[] = [];
  if (input.manual_id) {
    conditions.push('manual_id=?');
    args.push(input.manual_id);
  }
  if (input.board && input.external_job_id) {
    conditions.push('(board=? AND external_job_id=?)');
    args.push(input.board.toLowerCase(), input.external_job_id);
  }
  if (input.url) {
    const id = await matchingUrl(owner, canonical(input.url));
    if (id) candidates.add(id);
  }
  if (conditions.length) {
    for (const row of await rows(
      `SELECT id FROM job_applications WHERE user_id=? AND (${conditions.join(' OR ')})`,
      [owner, ...args]
    ))
      candidates.add(String(row.id));
  }
  if (candidates.size > 1) return conflict();
  return [...candidates][0] ?? null;
}
/** Match older web/history inputs to the same owner-scoped job identity as the tracker. */
export async function legacyApplicationIdentity(owner: string, raw: string) {
  if (!raw.trim()) return { url: null, id: null };
  let url: string;
  try {
    url = canonical(raw);
  } catch {
    return { url: null, id: null };
  }
  return { url, id: await matchIdentity(owner, { url }) };
}
async function fingerprint(input: object) {
  const sorted = Object.entries(input).sort(([a], [b]) => a.localeCompare(b));
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(sorted))
  );
  return Buffer.from(digest).toString('hex');
}
async function validatePatch(owner: string, id: string, before: Item, patch: Changes) {
  const merged = { ...before, ...patch } as Changes;
  validateIdentity({ ...merged, url: patch.url });
  if (['url', 'board', 'external_job_id', 'manual_id'].some((key) => key in patch)) {
    if (!merged.url && !merged.manual_id && !merged.external_job_id)
      invalid('A job needs a URL, board identity or explicit manual_id.');
    const matched = await matchIdentity(owner, merged);
    if (matched && matched !== id) return conflict();
  }
}
async function updateApplication(
  owner: string,
  id: string,
  rev: number,
  patch: Changes,
  event?: { key: string; note: string; materials: string },
  intake?: { key: string; hash: string }
): Promise<TrackerResult> {
  const before = await application(owner, id);
  if (Number(before.revision) !== rev) return conflict();
  await validatePatch(owner, id, before, patch);
  const fields = prepared(patch);
  if (!event && !Object.keys(fields).length)
    return invalid('Provide at least one field to update.');
  if (!event && Object.entries(patch).every(([key, value]) => before[key] === value))
    return saved(before);
  if (intake) {
    fields.create_key = intake.key;
    fields.create_hash = intake.hash;
  }
  fields.event_source = 'user_reported';
  const history = event ?? { key: null, note: null, materials: '[]' };
  fields.event_key = history.key;
  fields.event_note = history.note;
  fields.event_material_versions = history.materials;
  const verifyMaterials = event
    ? `AND NOT EXISTS(SELECT 1 FROM json_each(?) reference
    WHERE NOT EXISTS(SELECT 1 FROM application_material_versions m WHERE m.user_id=job_applications.user_id
      AND m.job_id=job_applications.id AND m.id=json_extract(reference.value,'$.id')
      AND m.revision=json_extract(reference.value,'$.revision') AND m.archived=0))`
    : '';

  const sets = Object.keys(fields).map((k) => `${k}=?`);
  const [updated] = await rows(
    `UPDATE job_applications SET ${sets.join(',')},revision=revision+1,updated_at=unixepoch() WHERE user_id=? AND id=? AND revision=? ${verifyMaterials} RETURNING ${applicationColumns}`,
    [...Object.values(fields), owner, id, rev, ...(event ? [event.materials] : [])]
  );
  return updated ? saved(updated) : conflict();
}
async function bindCreateRequest(
  owner: string,
  request: string,
  hash: string,
  id: string,
  record: TrackerResult
) {
  await db.execute({
    sql: `INSERT INTO application_create_requests(user_id,request_id,request_hash,job_id)
    SELECT ?,?,?,id FROM job_applications WHERE id=? AND user_id=?
    ON CONFLICT DO NOTHING`,
    args: [owner, request, hash, id, owner],
  });
  const [bound] = await rows(
    'SELECT job_id,request_hash FROM application_create_requests WHERE user_id=? AND request_id=?',
    [owner, request]
  );
  return bound?.job_id === id && bound.request_hash === hash ? record : conflict();
}
async function replayCreate(owner: string, key: string, hash: string) {
  const [prior] = await rows(
    'SELECT job_id,request_hash FROM application_create_requests WHERE user_id=? AND request_id=?',
    [owner, key]
  );
  if (!prior) return null;
  if (prior.request_hash !== hash) return conflict();
  return saved(await application(owner, String(prior.job_id)));
}
function matchesPatch(record: Item, patch: Changes) {
  function normalized(value: unknown) {
    return value ? canonical(String(value)) : '';
  }
  return Object.entries(patch).every(([key, value]) =>
    key === 'url' ? normalized(value) === normalized(record.url) : record[key] === value
  );
}
type Intake = S<'rolepatch_applications_create'> & { expected_revision?: number };
async function reuseIntake(
  owner: string,
  id: string,
  input: Intake,
  bulk: boolean,
  hash: string
): Promise<TrackerResult> {
  const { request_id, expected_revision, ...patch } = input;
  const record = await application(owner, id);
  if (matchesPatch(record, patch))
    return bindCreateRequest(owner, request_id, hash, id, saved(record));
  if (bulk && expected_revision)
    return updateApplication(owner, id, expected_revision, patch, undefined, {
      key: request_id,
      hash,
    });
  const revision = Number(record.revision);
  return {
    ok: false,
    code: 'conflict',
    id,
    revision,
    error: `This job is already tracked as ${id} at revision ${revision}. Open the existing application and update it to change its details.`,
  };
}
async function createApplication(
  owner: string,
  input: Intake,
  bulk: boolean
): Promise<TrackerResult> {
  const { request_id, expected_revision, ...patch } = input;
  validateIdentity(patch);
  if (!patch.url && !patch.manual_id && !patch.external_job_id)
    return invalid('Provide a URL, board identity, or explicit manual_id.');
  const hash = await fingerprint(patch);
  const retry = await replayCreate(owner, request_id, hash);
  if (retry) return retry;
  const existing = await matchIdentity(owner, patch);
  if (existing) return reuseIntake(owner, existing, input, bulk, hash);
  if (expected_revision !== undefined) return conflict();
  const fields = {
    ...prepared({ status: 'discovered', ...patch }),
    id: crypto.randomUUID(),
    user_id: owner,
    create_key: request_id,
    create_hash: hash,
    event_source: 'user_reported',
  };
  const names = Object.keys(fields);
  const [insert] = await rows(
    `INSERT INTO job_applications (${names.join(',')}) VALUES (${names.map(() => '?').join(',')}) ON CONFLICT DO NOTHING RETURNING ${applicationColumns}`,
    Object.values(fields)
  );
  if (insert) return saved(insert);
  const raced = await replayCreate(owner, request_id, hash);
  if (raced) return raced;
  const racedIdentity = await matchIdentity(owner, patch);
  return racedIdentity ? reuseIntake(owner, racedIdentity, input, bulk, hash) : conflict();
}
async function eventAdd(owner: string, input: S<'rolepatch_application_events_add'>) {
  const [retry] = await rows(
    `SELECT ${eventColumns} FROM application_events WHERE user_id=? AND job_id=? AND request_key=?`,
    [owner, input.application_id, input.request_id]
  );
  if (retry)
    return retry.revision === input.expected_revision + 1 &&
      retry.note === input.note &&
      retry.material_versions === JSON.stringify(input.material_versions) &&
      (!input.status || retry.status === input.status)
      ? saved(retry)
      : conflict();
  await updateApplication(
    owner,
    input.application_id,
    input.expected_revision,
    input.status ? { status: input.status } : {},
    { note: input.note, key: input.request_id, materials: JSON.stringify(input.material_versions) }
  );
  const [event] = await rows(
    `SELECT ${eventColumns} FROM application_events WHERE user_id=? AND job_id=? AND request_key=?`,
    [owner, input.application_id, input.request_id]
  );
  return event ? saved(event) : conflict();
}
async function getApplication(owner: string, id: string): Promise<TrackerResult> {
  const record = await application(owner, id);
  // Return provenance and receipt IDs only; receipt fields can contain private application answers.
  const receipts = await rows(
    `SELECT id,provider,status,created_at,
    CASE WHEN EXISTS(SELECT 1 FROM json_each(CASE WHEN json_valid(fields_json) THEN fields_json ELSE '[]' END) field
       WHERE json_extract(field.value,'$.source')='system' AND json_extract(field.value,'$.label')='Browser runner mode'
         AND json_extract(field.value,'$.value')='Guarded browser submit') THEN 'browser_receipt'
         ELSE 'user_reported_receipt' END AS source
    FROM application_receipts WHERE user_id=? AND job_id=? ORDER BY created_at DESC,id DESC LIMIT 100`,
    [owner, id]
  );
  return { ok: true, id, revision: Number(record.revision), record, submission_receipts: receipts };
}
async function listEvents(owner: string, input: S<'rolepatch_application_events_list'>) {
  await application(owner, input.application_id);
  const where = ['user_id=?', 'job_id=?'];
  const args: Value[] = [owner, input.application_id];
  pageAfter(where, args, 'revision', input.cursor);
  return page(
    await rows(
      `SELECT ${eventColumns} FROM application_events WHERE ${where.join(' AND ')} ORDER BY revision DESC,id DESC LIMIT ?`,
      [...args, input.limit + 1]
    ),
    input.limit,
    'revision'
  );
}
async function deleteApplication(owner: string, input: S<'rolepatch_applications_delete'>) {
  if (!input.permanent)
    return updateApplication(owner, input.id, input.expected_revision, { status: 'archived' });
  if (input.confirm_id !== input.id)
    return invalid('Permanent deletion requires confirm_id matching id.');
  await application(owner, input.id);
  const [removed] = await rows(
    `DELETE FROM job_applications WHERE user_id=? AND id=? AND revision=?
    AND NOT EXISTS(SELECT 1 FROM application_material_versions WHERE job_id=job_applications.id)
    AND NOT EXISTS(SELECT 1 FROM recruiter_reply_events WHERE job_id=job_applications.id)
    RETURNING id,revision`,
    [owner, input.id, input.expected_revision]
  );
  return removed ? saved(removed) : conflict();
}
async function material(owner: string, id: string, revision?: number) {
  const args: Value[] = [owner, id];
  if (revision) args.push(revision);
  const [row] = await rows(
    `SELECT ${materialColumns} FROM application_material_versions WHERE user_id=? AND id=? ${revision ? 'AND revision=?' : ''} ORDER BY revision DESC LIMIT 1`,
    args
  );
  return row ?? missing();
}
async function listMaterials(owner: string, input: S<'rolepatch_materials_list'>) {
  await application(owner, input.application_id);
  const where = [
    'm.user_id=?',
    'm.job_id=?',
    'NOT EXISTS(SELECT 1 FROM application_material_versions n WHERE n.user_id=m.user_id AND n.id=m.id AND n.revision>m.revision)',
  ];
  if (!input.include_archived) where.push('m.archived=0');
  const args: Value[] = [owner, input.application_id];
  pageAfter(where, args, 'created_at', input.cursor);
  return page(
    await rows(
      `SELECT ${materialColumns} FROM application_material_versions m WHERE ${where.join(' AND ')} ORDER BY created_at DESC,id DESC LIMIT ?`,
      [...args, input.limit + 1]
    ),
    input.limit,
    'created_at'
  );
}
type MaterialInput = S<'rolepatch_materials_upsert'>;
function sameMaterial(previous: Item, input: MaterialInput) {
  return (
    previous.application_id === input.application_id &&
    previous.kind === input.kind &&
    previous.title === input.title &&
    previous.reference_type === (input.reference_type ?? null) &&
    previous.reference_id === (input.reference_id ?? null) &&
    (input.reference_id || previous.content === input.content)
  );
}
function validateMaterialInput(input: MaterialInput) {
  if ((input.id === undefined) !== (input.expected_revision === undefined))
    return invalid('Editing requires an id and expected_revision.');
  if (!input.id && !input.request_id) return invalid('Creating a material requires request_id.');
  if ((input.reference_type === undefined) !== (input.reference_id === undefined))
    return invalid('Supply reference_type and reference_id together.');
  if ((input.content !== undefined) === (input.reference_id !== undefined))
    return invalid('Choose either content or an existing document reference.');
}
async function materialContent(owner: string, input: MaterialInput) {
  let content = input.content;
  if (input.reference_type && input.reference_id) {
    const sources = {
      tailored_resume: ['tailored_resumes', 'source'],
      cover_letter: ['cover_letters', 'content'],
      resume_version: ['career_resume_versions', 'markdown'],
    } as const;
    if (input.kind !== (input.reference_type === 'cover_letter' ? 'cover_letter' : 'resume'))
      return invalid('Material kind must match the linked document.');
    const [table, col] = sources[input.reference_type];
    const savedOnly = input.reference_type === 'resume_version' ? 'AND saved=1' : '';
    const [doc] = await rows(
      `SELECT ${col} AS content FROM ${table} WHERE id=? AND user_id=? ${savedOnly}`,
      [input.reference_id, owner]
    );
    if (!doc) return missing();
    content = String(doc.content);
  }
  return content;
}
async function saveMaterial(owner: string, input: S<'rolepatch_materials_upsert'>) {
  validateMaterialInput(input);
  await application(owner, input.application_id);
  const id = input.id ?? `material-${await fingerprint({ owner, request: input.request_id })}`;
  if (!input.id) {
    const [previous] = await rows(
      `SELECT ${materialColumns} FROM application_material_versions WHERE user_id=? AND id=? AND revision=1`,
      [owner, id]
    );
    if (previous) return sameMaterial(previous, input) ? saved(previous) : conflict();
  }
  if (input.id) {
    const prior = await material(owner, id);
    if (prior.application_id !== input.application_id || prior.revision !== input.expected_revision)
      return conflict();
  }
  return insertMaterial(owner, id, input);
}
async function insertMaterial(owner: string, id: string, input: MaterialInput) {
  const content = await materialContent(owner, input);
  const [insert] = await rows(
    `INSERT INTO application_material_versions(user_id,job_id,id,revision,kind,title,content,reference_type,reference_id)
    SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM job_applications WHERE id=? AND user_id=?)
    ON CONFLICT DO NOTHING RETURNING ${materialColumns}`,
    [
      owner,
      input.application_id,
      id,
      (input.expected_revision ?? 0) + 1,
      input.kind,
      input.title,
      content!,
      input.reference_type ?? null,
      input.reference_id ?? null,
      input.application_id,
      owner,
    ]
  );
  return insert ? saved(insert) : conflict();
}
async function deleteMaterial(owner: string, input: S<'rolepatch_materials_delete'>) {
  const prior = await material(owner, input.id);
  if (prior.revision !== input.expected_revision) return conflict();
  if (!input.permanent) {
    if (prior.archived) return saved(prior);
    const [archive] = await rows(
      `INSERT INTO application_material_versions(user_id,job_id,id,revision,kind,title,content,reference_type,reference_id,archived)
      SELECT user_id,job_id,id,revision+1,kind,title,content,reference_type,reference_id,1 FROM application_material_versions WHERE user_id=? AND id=? AND revision=?
      ON CONFLICT DO NOTHING RETURNING ${materialColumns}`,
      [owner, input.id, input.expected_revision]
    );
    return archive ? saved(archive) : conflict();
  }
  if (input.confirm_id !== input.id)
    return invalid('Permanent deletion requires confirm_id matching id.');
  const result = await db.execute({
    sql: `DELETE FROM application_material_versions WHERE user_id=? AND id=?
    AND (SELECT max(v.revision) FROM application_material_versions v WHERE v.user_id=? AND v.id=?)=?
    AND NOT EXISTS(SELECT 1 FROM application_events e,json_each(e.material_versions) j WHERE e.user_id=? AND e.job_id=? AND json_extract(j.value,'$.id')=?)`,
    args: [
      owner,
      input.id,
      owner,
      input.id,
      input.expected_revision,
      owner,
      prior.application_id,
      input.id,
    ],
  });
  return result.rowsAffected
    ? { ok: true as const, id: input.id, revision: input.expected_revision }
    : conflict();
}
function errorResult(error: unknown): TrackerResult {
  if (error instanceof TrackerError) return { ok: false, code: error.code, error: error.message };
  if (error instanceof z.ZodError)
    return {
      ok: false,
      code: 'invalid_input',
      error: error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '),
    };
  if (error instanceof Error && /constraint failed/i.test(error.message))
    return {
      ok: false,
      code: 'conflict',
      error: 'A linked record, duplicate identity, or newer revision prevents this change.',
    };
  return {
    ok: false,
    code: 'storage_error',
    error: 'The tracker is unavailable. Retry with the same request ID.',
  };
}
async function importApplications(owner: string, args: unknown) {
  const { items } = z.strictObject({ items: z.array(z.unknown()).min(1).max(100) }).parse(args);
  const outcomes: TrackerResult[] = [];
  for (const item of items) {
    try {
      const input =
        trackerSchemas.rolepatch_applications_bulk_upsert.shape.items.element.parse(item);
      if ('id' in input) {
        const { id, expected_revision, ...patch } = input;
        outcomes.push(await updateApplication(owner, id, expected_revision, patch));
      } else outcomes.push(await createApplication(owner, input, true));
    } catch (error) {
      outcomes.push(errorResult(error));
    }
  }
  return { ok: true as const, outcomes };
}
export async function performTracker(
  owner: string,
  name: string,
  args: unknown
): Promise<TrackerResult> {
  try {
    switch (name) {
      case 'rolepatch_applications_list':
        return await listApplications(owner, trackerSchemas[name].parse(args));
      case 'rolepatch_applications_get':
        return await getApplication(owner, trackerSchemas[name].parse(args).id);
      case 'rolepatch_applications_create':
        return await createApplication(owner, trackerSchemas[name].parse(args), false);
      case 'rolepatch_applications_update': {
        const { id, expected_revision, ...patch } = trackerSchemas[name].parse(args);
        return await updateApplication(owner, id, expected_revision, patch);
      }
      case 'rolepatch_applications_delete':
        return await deleteApplication(owner, trackerSchemas[name].parse(args));
      case 'rolepatch_application_events_list':
        return await listEvents(owner, trackerSchemas[name].parse(args));
      case 'rolepatch_application_events_add':
        return await eventAdd(owner, trackerSchemas[name].parse(args));
      case 'rolepatch_materials_list':
        return await listMaterials(owner, trackerSchemas[name].parse(args));
      case 'rolepatch_materials_get': {
        const input = trackerSchemas[name].parse(args);
        return saved(await material(owner, input.id, input.revision));
      }
      case 'rolepatch_materials_upsert':
        return await saveMaterial(owner, trackerSchemas[name].parse(args));
      case 'rolepatch_materials_delete':
        return await deleteMaterial(owner, trackerSchemas[name].parse(args));
      case 'rolepatch_applications_bulk_upsert':
        return await importApplications(owner, args);
      default:
        return invalid('Unknown tracker operation.');
    }
  } catch (error) {
    return errorResult(error);
  }
}
