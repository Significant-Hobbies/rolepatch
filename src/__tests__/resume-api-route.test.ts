// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tailorResumeFromReference } from '@/lib/actions/resume-assistant-actions';
import { renderResumePdfDraft } from '@/lib/resume-pdf-draft';
vi.mock('@/lib/actions/resume-assistant-actions', () => ({ tailorResumeFromReference: vi.fn() }));
vi.mock('@/lib/resume-pdf-draft', () => ({ renderResumePdfDraft: vi.fn() }));
const request = (value: unknown, headers?: Record<string, string>) =>
  new Request('https://rolepatch.com/api/resume', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(value),
  });
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
});
describe('plain JSON resume API', () => {
  it('returns a resume and its history directly without JSON-RPC', async () => {
    const result = {
      ok: true,
      markdown: '# Alex',
      persisted: true,
      requires_review: true,
      history: { saved: true, view_url: '/tailor/job?version=v1' },
    };
    vi.mocked(tailorResumeFromReference).mockResolvedValue(
      result as Awaited<ReturnType<typeof tailorResumeFromReference>>
    );
    const { POST } = await import('@/app/api/resume/route');
    const response = await POST(
      request({ resume_id: 'master', jd_text: 'Supplied job description' })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(tailorResumeFromReference).toHaveBeenCalledWith(
      { resume_id: 'master', jd_text: 'Supplied job description' },
      true
    );
  });
  it.each([
    ['sign_in_required', 401],
    ['not_found', 404],
    ['generation_failed', 502],
    ['pdf_render_failed', 502],
    ['invalid_input', 400],
  ])('returns HTTP status for %s', async (code, status) => {
    vi.mocked(tailorResumeFromReference).mockResolvedValue({
      ok: false,
      code,
      error: 'Expected failure',
    });
    const { POST } = await import('@/app/api/resume/route');
    expect((await POST(request({}))).status).toBe(status);
  });
  it('returns render-only PDF JSON with private no-store metadata without generation', async () => {
    const result = {
      ok: true,
      draft_id: 'draft',
      requires_review: true,
      persisted: false,
      markdown: '# Ada Example resume text',
      pdf: {
        filename: 'tailored-resume.pdf',
        mime_type: 'application/pdf',
        data_base64: 'JVBERi0xLjcK',
      },
    };
    vi.mocked(renderResumePdfDraft).mockResolvedValue(
      result as Awaited<ReturnType<typeof renderResumePdfDraft>>
    );
    const { POST } = await import('@/app/api/resume/route');
    const input = { operation: 'render_pdf', resume_markdown: result.markdown };
    const response = await POST(request(input));
    expect(await response.json()).toEqual(result);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(renderResumePdfDraft).toHaveBeenCalledWith({ resume_markdown: result.markdown });
    expect(tailorResumeFromReference).not.toHaveBeenCalled();
  });
  it('rejects cross-origin browser mutations before generation', async () => {
    const { POST } = await import('@/app/api/resume/route');
    expect((await POST(request({}, { origin: 'https://other.example' }))).status).toBe(403);
    expect((await POST(request({}, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
    expect(tailorResumeFromReference).not.toHaveBeenCalled();
  });
  it('bounds streamed bytes and rejects malformed JSON before generation', async () => {
    const { POST } = await import('@/app/api/resume/route');
    expect((await POST(request({ text: 'é'.repeat(50_001) }))).status).toBe(413);
    expect(
      (
        await POST(
          new Request('https://rolepatch.com/api/resume', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{bad',
          })
        )
      ).status
    ).toBe(400);
    expect(tailorResumeFromReference).not.toHaveBeenCalled();
  });
});
