import { z } from 'zod';
import { MAX_PDF_RESUME_CHARS, renderResumePdf } from '@/lib/resume-pdf';

const inputSchema = z
  .object({
    resume_markdown: z
      .string()
      .min(20)
      .max(MAX_PDF_RESUME_CHARS)
      .refine((text) => text.trim().length >= 20),
  })
  .strict();

/** Renders supplied draft text only: no generation, profile reads, credits or writes. */
export async function renderResumePdfDraft(raw: unknown) {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false as const,
      code: 'invalid_input',
      error: 'Supply only resume_markdown (20–40,000 characters) to render a PDF.',
    };
  const draft = {
    draft_id: crypto.randomUUID(),
    requires_review: true as const,
    persisted: false as const,
    markdown: parsed.data.resume_markdown,
  };
  try {
    return { ok: true as const, ...draft, pdf: await renderResumePdf(draft.markdown) };
  } catch {
    return {
      ok: false as const,
      code: 'pdf_render_failed',
      error:
        'PDF export failed. Keep the returned markdown and retry rendering with operation: "render_pdf" on /api/resume or rolepatch_render_resume_pdf. Rendering uses no generation credits; do not repeat tailoring.',
      retryable: true,
      ...draft,
    };
  }
}
