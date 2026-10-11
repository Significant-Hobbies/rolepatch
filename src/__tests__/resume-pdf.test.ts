// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { renderPdf } from '@/lib/pdf';
import { MAX_PDF_BYTES, renderResumePdf } from '@/lib/resume-pdf';
import { renderResumePdfDraft } from '@/lib/resume-pdf-draft';
import { RESUME_MCP_TOOLS, callResumeMcpTool } from '@/lib/resume-mcp';

vi.mock('@/lib/pdf', () => ({ renderPdf: vi.fn() }));
vi.mock('@/lib/actions/resume-assistant-actions', () => ({
  listResumeAssistantProfiles: vi.fn(),
  tailorResumeFromReference: vi.fn(),
}));
const source = '# Ada Example\n\n## Experience\n- Built scheduling APIs.\n';
const bytes = new TextEncoder().encode('%PDF-1.7\nsynthetic bounded fixture\n%%EOF\n');
const oversizedPdf = new Uint8Array(MAX_PDF_BYTES + 1);
oversizedPdf.set(new TextEncoder().encode('%PDF-1.7'));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(renderPdf).mockResolvedValue(bytes);
});

it('returns exact named PDF bytes, sanitizing active HTML and remote images', async () => {
  const pdf = await renderResumePdf(
    `${source}\n<script>fetch('https://example.com/leak')</script>\n![avatar](https://example.com/avatar.png)\n[unsafe](javascript:alert(1))`
  );
  expect(pdf).toEqual({
    filename: 'tailored-resume.pdf',
    mime_type: 'application/pdf',
    data_base64: Buffer.from(bytes).toString('base64'),
  });
  const html = vi.mocked(renderPdf).mock.calls[0][0];
  expect(html).toContain("default-src 'none'");
  expect(html).not.toMatch(/<script|<img|href="javascript:/);
  expect(html).toContain('&lt;script&gt;');
});

it.each([new Uint8Array(), new TextEncoder().encode('<html>renderer error</html>'), oversizedPdf])(
  'rejects empty, invalid-signature and oversized renderer output',
  async (output) => {
    vi.mocked(renderPdf).mockResolvedValue(output);
    expect(await renderResumePdfDraft({ resume_markdown: source })).toMatchObject({
      ok: false,
      code: 'pdf_render_failed',
      markdown: source,
      persisted: false,
      retryable: true,
    });
  }
);

it('bounds render-only inputs and rejects generation/history fields without invoking renderer', async () => {
  for (const raw of [
    { resume_markdown: 'x'.repeat(40001) },
    { resume_markdown: ' '.repeat(20) },
    { resume_markdown: source, save_to_history: true },
    { resume_markdown: source, job_url: 'https://example.com/job' },
    { resume_id: 'owned' },
    { operation: 'render_pdf', resume_markdown: source },
  ]) {
    expect(await renderResumePdfDraft(raw)).toMatchObject({ ok: false, code: 'invalid_input' });
  }
  expect(renderPdf).not.toHaveBeenCalled();
});

it('returns recoverable text without leaking renderer errors and retries only rendering', async () => {
  vi.mocked(renderPdf).mockRejectedValueOnce(new Error('private internal browser path'));
  const failed = await renderResumePdfDraft({ resume_markdown: source });
  expect(failed).toMatchObject({ ok: false, code: 'pdf_render_failed', markdown: source });
  expect(JSON.stringify(failed)).not.toContain('private internal');
  expect(
    await callResumeMcpTool('rolepatch_render_resume_pdf', { resume_markdown: source })
  ).toMatchObject({
    ok: true,
    requires_review: true,
    persisted: false,
    pdf: { mime_type: 'application/pdf' },
  });
});

it('discovers PDF format and strict render-only retry tool while preserving Markdown default', () => {
  expect(
    RESUME_MCP_TOOLS.find((tool) => tool.name === 'rolepatch_tailor_resume')?.inputSchema.properties
      ?.format
  ).toMatchObject({
    enum: ['markdown', 'html', 'pdf'],
    default: 'markdown',
  });
  expect(
    RESUME_MCP_TOOLS.find((tool) => tool.name === 'rolepatch_render_resume_pdf')
  ).toMatchObject({
    inputSchema: { required: ['resume_markdown'], additionalProperties: false },
    annotations: { readOnlyHint: true },
  });
});
