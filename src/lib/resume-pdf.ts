import { renderPdf } from '@/lib/pdf';
import { markdownToHtml } from '@/lib/resume-html';

// A generated draft may include the 20k master, 10k stash and generated summary.
export const MAX_PDF_RESUME_CHARS = 40_000;
export const MAX_PDF_BYTES = 2 * 1024 * 1024;

export async function renderResumePdf(source: string) {
  if (!source.trim() || source.length > MAX_PDF_RESUME_CHARS)
    throw new Error('Invalid resume size');
  // The shared formatter escapes raw HTML/images and supplies a no-network CSP.
  const bytes = await renderPdf(markdownToHtml(source, 'Tailored resume'));
  if (
    bytes.byteLength < 20 ||
    bytes.byteLength > MAX_PDF_BYTES ||
    new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-'
  )
    throw new Error('Invalid PDF output');
  return {
    filename: 'tailored-resume.pdf',
    mime_type: 'application/pdf' as const,
    data_base64: Buffer.from(bytes).toString('base64'),
  };
}
