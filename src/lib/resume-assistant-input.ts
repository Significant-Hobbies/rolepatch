import { z } from 'zod';

export const resumeAssistantSchema = z
  .object({
    job_id: z.string().trim().min(1).max(200).optional(),
    source: z.enum(['rolepatch', 'linkedin', 'greenhouse', 'lever', 'ashby']).optional(),
    company: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,119}$/)
      .optional(),
    job_url: z.string().trim().max(2048).optional(),
    jd_text: z.string().trim().min(100).max(15_000).optional(),
    resume_id: z.string().trim().min(1).max(200).optional(),
    resume_markdown: z.string().trim().min(20).max(20_000).optional(),
    company_name: z.string().trim().max(200).optional(),
    role_title: z.string().trim().max(200).optional(),
    save_to_history: z.boolean().optional(),
    format: z.enum(['markdown', 'html']).default('markdown'),
  })
  .strict();
export type ResumeAssistantInput = z.infer<typeof resumeAssistantSchema>;
export const jobReferenceSchema = resumeAssistantSchema
  .pick({ job_id: true, source: true, company: true, job_url: true, jd_text: true })
  .strict();

/** Normalize references without guessing which board owns a bare ID. */
export function resolveJobReference(input: z.infer<typeof jobReferenceSchema>): {
  savedId?: string;
  url?: string;
} {
  if (input.job_url && input.job_id) throw new Error('Choose job_url or job_id, not both.');
  if (input.job_url) return { url: publicJobUrl(input.job_url) };
  if (!input.job_id) {
    if (input.jd_text) return {};
    throw new Error('Provide a job URL, a board-qualified job ID, or the job description.');
  }
  const { job_id: id, source, company } = input;
  if (!source)
    throw new Error('A job ID needs its source. Use a full URL for any other job board.');
  if (source === 'rolepatch') return { savedId: id };
  if (source === 'linkedin') {
    if (!/^\d{1,20}$/.test(id)) throw new Error('LinkedIn job IDs must contain digits only.');
    return { url: `https://www.linkedin.com/jobs/view/${id}/` };
  }
  if (!company)
    throw new Error(`${source} IDs need the company board slug, or use the full job URL.`);
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) throw new Error('Invalid job ID. Use the full job URL.');
  const prefix = {
    greenhouse: 'https://job-boards.greenhouse.io',
    lever: 'https://jobs.lever.co',
    ashby: 'https://jobs.ashbyhq.com',
  }[source];
  return { url: `${prefix}/${company}/${source === 'greenhouse' ? 'jobs/' : ''}${id}` };
}

export function publicJobUrl(raw: string): string {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !['80', '443'].includes(url.port))
  )
    throw new Error('Use a public HTTP(S) job URL without credentials or a custom port.');
  // Reject IP literals, single-label hosts and local/reserved names. The hosted
  // extraction path uses the fixed public reader origin, never direct egress.
  if (
    host.includes(':') ||
    /^[\d.]+$/.test(host) ||
    !host.includes('.') ||
    /\.(localhost|local|internal|test|invalid|example)$/.test(host)
  )
    throw new Error('Use a public job-board hostname.');
  url.hash = '';
  return url.href;
}
