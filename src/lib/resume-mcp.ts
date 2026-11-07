import {
  listResumeAssistantProfiles,
  tailorResumeFromReference,
} from '@/lib/actions/resume-assistant-actions';
import { resolveJobReference, jobReferenceSchema } from '@/lib/resume-assistant-input';

export const RESUME_MCP_TOOLS = [
  {
    name: 'rolepatch_resume_profiles',
    description:
      'List signed-in cloud resume profiles. Guests should provide their base resume as resume_markdown instead.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'rolepatch_resolve_job',
    description:
      'Resolve a public job URL or board-qualified ID. A bare ID needs a source; Greenhouse, Lever and Ashby also need a company board slug. Other boards use their full URL.',
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'string' },
        source: { type: 'string', enum: ['rolepatch', 'linkedin', 'greenhouse', 'lever', 'ashby'] },
        company: { type: 'string' },
        job_url: { type: 'string' },
        jd_text: { type: 'string' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: 'rolepatch_tailor_resume',
    description:
      'Return a complete tailored Markdown resume, grounded change explanations and optional HTML. Provide the base resume and a public job URL/board-qualified ID or pasted job description. Guests are stateless; signed-in callers may use owned saved IDs. Signed-in generation uses one token. The original is preserved, output needs review (unsaved by default; explicitly request save_to_history for owned cloud history), and no application is submitted.',
    inputSchema: {
      type: 'object',
      properties: {
        job_id: { type: 'string' },
        source: { type: 'string', enum: ['rolepatch', 'linkedin', 'greenhouse', 'lever', 'ashby'] },
        company: { type: 'string' },
        job_url: { type: 'string' },
        jd_text: { type: 'string' },
        resume_id: { type: 'string' },
        resume_markdown: { type: 'string' },
        format: { type: 'string', enum: ['markdown', 'html'], default: 'markdown' },
        save_to_history: { type: 'boolean', default: false },
        company_name: { type: 'string' },
        role_title: { type: 'string' },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
];

export async function callResumeMcpTool(name: string, args: unknown) {
  if (name === 'rolepatch_resume_profiles') {
    if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).length)
      return { ok: false, error: 'This tool accepts an empty object.' };
    return listResumeAssistantProfiles();
  }
  if (name === 'rolepatch_tailor_resume') return tailorResumeFromReference(args);
  if (name === 'rolepatch_resolve_job') {
    const parsed = jobReferenceSchema.safeParse(args);
    if (!parsed.success)
      return {
        ok: false,
        error:
          'Invalid reference. Supply job_url or a board-qualified job_id, with company for board-scoped IDs.',
      };
    try {
      return { ok: true, ...resolveJobReference(parsed.data) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Invalid reference.' };
    }
  }
  return { ok: false, error: 'Unknown tool.' };
}
