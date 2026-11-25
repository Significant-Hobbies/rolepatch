import { z } from 'zod';

const id = z.string().trim().min(1).max(200);
const requestId = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const markdown = z
  .string()
  .min(1)
  .max(40_000)
  .refine((text) => Boolean(text.trim()));
const revision = z.number().int().positive();
const ids = z.array(id).max(100).default([]);

export const generationInput = z.strictObject({
  request_id: requestId.describe('Reuse for retries of the same request.'),
  profile_id: id.optional().describe('Omit to use your explicitly selected default.'),
  application_id: id.optional(),
  job_url: z
    .url({ protocol: /^https?$/ })
    .max(2048)
    .optional(),
  jd_text: z.string().max(20_000).optional(),
  emphasis: z.string().max(2000).default(''),
  target_pages: z.union([z.literal(1), z.literal(2)]).default(1),
  mode: z.enum(['fixed_wording', 'grounded_rewrite']).default('fixed_wording'),
  pin_ids: ids,
  exclude_ids: ids,
  format: z.enum(['markdown', 'html', 'pdf']).default('markdown'),
  save_to_history: z.boolean().default(false),
});

export const versionInputs = {
  list: z.strictObject({
    profile_id: id.optional(),
    include_archived: z.boolean().default(false),
    cursor: id.optional(),
    limit: z.number().int().min(1).max(100).default(25),
  }),
  get: z.strictObject({ version_id: id }),
  save: z.strictObject({
    request_id: requestId,
    draft_id: id,
    markdown: markdown.optional(),
    approved: z.boolean().default(false),
  }),
  update: z.strictObject({
    request_id: requestId,
    version_id: id,
    expected_revision: revision,
    markdown: markdown.optional(),
    approved: z.boolean().optional(),
  }),
  archive: z.strictObject({ request_id: requestId, version_id: id, expected_revision: revision }),
};
export const renderVersionInput = z.strictObject({ version_id: id });
export type GenerationInput = z.output<typeof generationInput>;

function tool(
  name: string,
  description: string,
  schema: z.ZodType,
  readOnlyHint: boolean,
  destructiveHint = false,
  openWorldHint = false
) {
  const { $schema: _, ...inputSchema } = z.toJSONSchema(schema, { io: 'input' });
  return {
    name,
    description,
    inputSchema,
    annotations: { readOnlyHint, destructiveHint, idempotentHint: true, openWorldHint },
  };
}

export const careerResumeTools = [
  tool(
    'rolepatch_generate_resume',
    'Generate a reviewable resume from your profile or explicit default. Fixed wording is free. A successful AI rewrite costs one credit. Omit a job for a general resume. Unsaved drafts can be recovered by request ID for 24 hours. Set save_to_history explicitly to keep a version.',
    generationInput,
    false,
    false,
    true
  ),
  tool(
    'rolepatch_resume_versions_list',
    'List your saved resume revisions, newest first. Archive hides a series from the default list.',
    versionInputs.list,
    true
  ),
  tool(
    'rolepatch_resume_versions_get',
    'Retrieve an exact saved revision, approval state and source snapshot.',
    versionInputs.get,
    true
  ),
  tool(
    'rolepatch_resume_versions_save',
    'Save a generated draft with its source snapshot. Optional edited Markdown is kept exactly as supplied.',
    versionInputs.save,
    false
  ),
  tool(
    'rolepatch_resume_versions_update',
    'Append a new revision with edited Markdown or explicit approval. Previous versions keep their original content.',
    versionInputs.update,
    false
  ),
  tool(
    'rolepatch_resume_versions_archive',
    'Archive this resume series by appending an archive revision. Exact revisions remain retrievable.',
    versionInputs.archive,
    false,
    true
  ),
];
