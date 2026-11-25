import { z } from 'zod';

export const careerKinds = [
  'identity',
  'employment',
  'project',
  'achievement',
  'education',
  'skill',
  'answer',
  'note',
] as const;
export const verificationStatuses = [
  'unverified',
  'user_confirmed',
  'document_supported',
  'disputed',
] as const;
const key = z.string().trim().min(1).max(160);
const short = z.string().max(400);
const prose = z.string().max(8000);
const links = z.array(z.url({ protocol: /^https?$/ }).max(2048)).max(24);
export const careerData = z.strictObject({
  original_text: prose.optional(),
  approved_wording: prose.optional(),
  summary: prose.optional(),
  context: prose.optional(),
  individual_contribution: prose.optional(),
  technical_decisions: prose.optional(),
  impact: prose.optional(),
  team_outcome: prose.optional(),
  metric: short.optional(),
  metric_is_estimate: z.boolean().optional(),
  start_date: short.optional(),
  end_date: short.optional(),
  technologies: z.array(short).max(100).optional(),
  employer: short.optional(),
  role: short.optional(),
  institution: short.optional(),
  credential: short.optional(),
  related_role_id: key.optional(),
  related_project_id: key.optional(),
  source_urls: links.optional(),
  verification_status: z.enum(verificationStatuses).optional(),
  value: prose.optional(),
});
export type CareerData = z.infer<typeof careerData>;
/** A draft summary is separate from the approved claim. Adding a citation does
 * not change the claim; losing a relied-on document requires another review. */
export function careerClaimChanged(before: CareerData, after: CareerData) {
  const lostEvidence =
    before.verification_status === 'document_supported' &&
    before.source_urls?.some((link) => !after.source_urls?.includes(link));
  if (lostEvidence) return true;
  return (Object.keys(careerData.shape) as (keyof CareerData)[]).some(
    (key) =>
      !['summary', 'source_urls', 'verification_status'].includes(key) &&
      JSON.stringify(before[key]) !== JSON.stringify(after[key])
  );
}
export type CareerKind = (typeof careerKinds)[number];
export interface CareerRecord {
  id: string;
  profile_id: string;
  kind: CareerKind;
  title: string;
  data: CareerData;
  revision: number;
  sensitive: boolean;
  archived_at: number | null;
}
export interface CareerProfile {
  id: string;
  name: string;
  source: string;
  revision: number;
  is_default: boolean;
  archived_at: number | null;
}
const profile = { profile_id: key };
const revision = { expected_revision: z.number().int().positive() };
const sensitive = {
  include_sensitive: z
    .boolean()
    .optional()
    .describe('Explicitly include sensitive answers. Requires separate consent.'),
};
const page = { limit: z.number().int().min(1).max(100).optional(), cursor: key.optional() };
const kinds = z.array(z.enum(careerKinds)).min(1).max(8).optional();
const writeFields = {
  id: key.describe('Stable caller-chosen record ID, reused on retry.'),
  kind: z.enum(careerKinds),
  title: z.string().trim().min(1).max(400),
  data: careerData,
  clear_fields: z.array(careerData.keyof()).max(25).optional(),
  reconfirm: z
    .boolean()
    .optional()
    .describe(
      'Set only after reviewing a materially changed previously verified claim together with its new verification_status.'
    ),
  sensitive: z.boolean().optional(),
  restore: z
    .boolean()
    .optional()
    .describe(
      'Restore an archived record using its expected_revision. Supply the existing kind and title, and an empty data object to preserve the record.'
    ),
  expected_revision: revision.expected_revision.optional(),
};
export const careerSchemas = {
  rolepatch_profiles_list: z.strictObject({ ...page, include_archived: z.boolean().optional() }),
  rolepatch_profiles_get: z.strictObject({
    query: z.string().max(300).optional(),
    include_archived: z.boolean().optional(),
    profile_id: key.optional(),
    sections: kinds,
    ...page,
    ...sensitive,
    legacy_sources: z
      .boolean()
      .optional()
      .describe(
        'Return a separate page of account-wide original sources instead of profile records.'
      ),
  }),
  rolepatch_profiles_create: z.strictObject({
    name: key,
    source: z.string().max(100000).optional(),
    is_default: z.boolean().optional(),
    request_id: key,
  }),
  rolepatch_profiles_update: z.strictObject({
    restore: z.boolean().optional().describe('Restore an archived profile to the active list.'),
    ...profile,
    ...revision,
    name: key.optional(),
    is_default: z.boolean().optional(),
    source: z.string().max(100000).optional(),
  }),
  rolepatch_profiles_archive: z.strictObject({ ...profile, ...revision }),
  rolepatch_career_records_list: z.strictObject({
    ...profile,
    ...page,
    ...sensitive,
    sections: kinds,
    query: z.string().max(300).optional(),
    include_archived: z.boolean().optional(),
  }),
  rolepatch_career_records_get: z.strictObject({ ...profile, id: key, ...sensitive }),
  rolepatch_career_records_upsert: z.strictObject({ ...profile, ...writeFields, ...sensitive }),
  rolepatch_career_records_bulk_upsert: z.strictObject({
    ...profile,
    records: z.array(z.strictObject(writeFields)).min(1).max(50),
    ...sensitive,
  }),
  rolepatch_career_records_delete: z.strictObject({
    ...profile,
    id: key,
    ...revision,
    ...sensitive,
    permanent: z.boolean().optional(),
    confirm_id: key.optional(),
  }),
};
export type CareerToolName = keyof typeof careerSchemas;
export const careerTools = (Object.keys(careerSchemas) as CareerToolName[]).map((name) => {
  const descriptions: Record<CareerToolName, string> = {
    rolepatch_profiles_list:
      'List named career profiles with their IDs, default selection and revisions.',
    rolepatch_profiles_get:
      'Read a named profile or the explicit default, master Markdown and a page of structured career records. Optionally read original account sources.',
    rolepatch_profiles_create:
      'Create a named profile with an optional master. Reuse request_id to replay the same create.',
    rolepatch_profiles_update: 'Edit a profile or select the default using the last read revision.',
    rolepatch_profiles_archive:
      'Archive a profile while retaining its linked records and submitted versions.',
    rolepatch_career_records_list:
      'Search and filter career records within one profile. Continue from next_cursor.',
    rolepatch_career_records_get: 'Read one owned career record by profile and record ID.',
    rolepatch_career_records_upsert:
      'Create or patch one career record. Omitted data fields retain their values. Use clear_fields for explicit removal. Use an explicit stable ID. Revisions are required for edits. Preserve original text when editing approved wording.',
    rolepatch_career_records_bulk_upsert:
      'Import up to 50 records in order with per-item results. Put referenced roles or projects first.',
    rolepatch_career_records_delete:
      'Archive a record, or permanently delete an unreferenced record with permanent=true and confirm_id matching id.',
  };
  return {
    name,
    description: descriptions[name],
    inputSchema: z.toJSONSchema(careerSchemas[name], { target: 'draft-7' }),
    annotations: {
      readOnlyHint: /(list|get)$/.test(name),
      destructiveHint: /(archive|delete|update|upsert)$/.test(name),
      openWorldHint: false,
    },
  };
});
