import {
  listResumeAssistantProfiles,
  tailorResumeFromReference,
} from '@/lib/actions/resume-assistant-actions';
import { resolveJobReference, jobReferenceSchema } from '@/lib/resume-assistant-input';
import { renderResumePdfDraft } from '@/lib/resume-pdf-draft';

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
      'Return a complete tailored Markdown resume, grounded change explanations and optional HTML or PDF attachment. Provide a public job URL/board-qualified ID or pasted description. Connected accounts with one owned master may omit resume input; otherwise choose resume_id or supply resume_markdown. Guests are stateless. Signed-in generation uses one token. The original is preserved, output needs review (unsaved by default; explicitly request save_to_history for owned cloud history), and no application is submitted. On PDF failure, keep the returned draft and retry with rolepatch_render_resume_pdf without generating again.',
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
        format: { type: 'string', enum: ['markdown', 'html', 'pdf'], default: 'markdown' },
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
  {
    name: 'rolepatch_render_resume_pdf',
    description:
      'Render supplied Markdown draft text as a PDF attachment without AI generation, generation credits, saved-profile reads or persistence. Use this to retry a failed PDF export. The caller must provide the returned markdown; draft IDs are not stored downloads. Output requires review.',
    inputSchema: {
      type: 'object',
      properties: { resume_markdown: { type: 'string', minLength: 20, maxLength: 40000 } },
      required: ['resume_markdown'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
];

export async function callResumeMcpTool(name: string, args: unknown) {
  if (name === 'rolepatch_render_resume_pdf') return renderResumePdfDraft(args);
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
