import { z } from 'zod';

import { materialKinds, trackerStages } from '@/lib/tracker-vocabulary';
const id = z.string().trim().min(1).max(200);
const small = z.string().max(500);
const amount = z.number().finite().nonnegative().max(1e12);
const date = z.number().int().nonnegative().max(253402300799).describe('Unix timestamp in seconds');
const nullable = <T extends z.ZodType>(field: T) => field.nullable().optional();
const link = z.url({ protocol: /^https?$/ }).max(2048);
const fields = {
  role: small.trim().min(1).optional(),
  company: small.trim().min(1).optional(),
  url: nullable(link),
  board: nullable(id.describe('Board-qualified source such as greenhouse/acme')),
  external_job_id: nullable(id),
  manual_id: nullable(id),
  jd_text: z.string().max(30000).optional(),
  location: nullable(small),
  remote_eligibility: nullable(small),
  india_eligibility: nullable(small),
  salary_min: nullable(amount),
  salary_max: nullable(amount),
  salary_currency: nullable(z.string().regex(/^[A-Z]{3}$/)),
  salary_period: nullable(z.enum(['hour', 'day', 'week', 'month', 'year'])),
  compensation_evidence: nullable(z.string().max(2000)),
  status: z.enum(trackerStages).optional(),
  priority: nullable(z.enum(['low', 'normal', 'high'])),
  applied_at: nullable(date),
  next_action: nullable(small),
  follow_up_at: nullable(date),
  interview_date: nullable(date),
  outcome: nullable(small),
  rejection_reason: nullable(z.string().max(4000)),
  notes: nullable(z.string().max(16000)),
};
const paging = { cursor: id.optional(), limit: z.number().int().min(1).max(100).default(25) };
const revision = z.number().int().min(1);
const create = z.strictObject({
  ...fields,
  company: small.trim().min(1),
  role: small.trim().min(1),
  request_id: id,
});
const update = z.strictObject({ id, expected_revision: revision, ...fields });
const archive = z.strictObject({
  id,
  expected_revision: revision,
  permanent: z.boolean().default(false),
  confirm_id: id.optional(),
});
export const trackerSchemas = {
  rolepatch_applications_list: z.strictObject({
    ...paging,
    query: small.optional(),
    company: small.optional(),
    status: z.enum(trackerStages).optional(),
    priority: fields.priority,
    salary_min: amount.optional(),
    salary_max: amount.optional(),
    salary_currency: fields.salary_currency,
    salary_period: fields.salary_period,
    date_from: date.optional(),
    date_to: date.optional(),
    due_before: date.optional(),
  }),
  rolepatch_applications_get: z.strictObject({ id }),
  rolepatch_applications_create: create,
  rolepatch_applications_update: update,
  rolepatch_applications_delete: archive,
  rolepatch_applications_bulk_upsert: z.strictObject({
    items: z
      .array(z.union([create.extend({ expected_revision: revision.optional() }), update]))
      .min(1)
      .max(100),
  }),
  rolepatch_application_events_list: z.strictObject({ application_id: id, ...paging }),
  rolepatch_application_events_add: z.strictObject({
    application_id: id,
    expected_revision: revision,
    request_id: id,
    status: z.enum(trackerStages).optional(),
    note: z.string().trim().min(1).max(4000),
    material_versions: z.array(z.strictObject({ id, revision })).max(50).default([]),
  }),
  rolepatch_materials_list: z.strictObject({
    application_id: id,
    ...paging,
    include_archived: z.boolean().default(false),
  }),
  rolepatch_materials_get: z.strictObject({ id, revision: revision.optional() }),
  rolepatch_materials_upsert: z.strictObject({
    id: id.optional(),
    expected_revision: revision.optional(),
    request_id: id.optional(),
    application_id: id,
    kind: z.enum(materialKinds),
    title: small.trim().min(1),
    content: z.string().max(60000).optional(),
    reference_type: z.enum(['tailored_resume', 'resume_version', 'cover_letter']).optional(),
    reference_id: id.optional(),
  }),
  rolepatch_materials_delete: archive,
};
export type TrackerName = keyof typeof trackerSchemas;
const descriptions: Record<TrackerName, string> = {
  rolepatch_applications_list:
    'List owned applications by creation time, newest first. Date filters use applied_at; due_before filters active follow-ups; salary bounds filter overlapping ranges.',
  rolepatch_applications_get:
    'Get an owned application including status, compensation, follow-up and revision.',
  rolepatch_applications_create:
    'Save a job without submitting it. Include a stable request_id and URL, board-qualified identity, or manual_id.',
  rolepatch_applications_update:
    'Edit a saved job with its expected revision. Status changes are reported by the user and never submit an application.',
  rolepatch_applications_delete:
    'Archive an application. Permanent deletion requires permanent=true, matching confirm_id, and an application without linked materials or documents.',
  rolepatch_applications_bulk_upsert:
    'Import up to 100 jobs with per-item results. Repeat identical entries safely. For changed existing entries include their expected_revision.',
  rolepatch_application_events_list:
    'Read ordered status and manual events for an owned application. A migration snapshot records the last known stage.',
  rolepatch_application_events_add:
    'Record a user-reported note or stage transition, optionally identifying the exact material_versions used. It does not verify or submit an application.',
  rolepatch_materials_list:
    'List latest material snapshots for this application. Use materials_get with a revision to retrieve historical content.',
  rolepatch_materials_get: 'Read an owned material, optionally at an exact immutable revision.',
  rolepatch_materials_upsert:
    'Save text or snapshot an owned document reference. Create with request_id; revise with id and expected_revision.',
  rolepatch_materials_delete:
    'Archive a material by creating a revision. Permanent deletion requires matching confirm_id and an unlinked submission history.',
};
export const trackerTools = (Object.keys(trackerSchemas) as TrackerName[]).map((name) => ({
  name,
  description: descriptions[name],
  inputSchema: z.toJSONSchema(trackerSchemas[name], { target: 'draft-7', io: 'input' }),
  annotations: {
    readOnlyHint: /_(list|get)$/.test(name),
    destructiveHint: /_(delete|update|upsert|events_add)$/.test(name),
    openWorldHint: false,
  },
}));
