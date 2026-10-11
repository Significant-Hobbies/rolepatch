// @vitest-environment node
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { PDFParse } from 'pdf-parse';
import { POST } from '@/app/api/resume/route';

const fixture = vi.hoisted(() => ({
  master:
    '# Ada Example\nada@example.org\n\n## Experience\n### Example Co\n- Built scheduling APIs with Node.js request validation.\n- Built React screens and tested keyboard navigation.\n\n## Projects\n### Reader\n- Released an accessible reading queue with saved filters.\n\n## Education\nBSc Computer Science, Example University, 2022.\n',
  jd: 'Seeking a TypeScript platform engineer to build scheduling APIs with request validation and accessible customer screens. Maintain production services and testing.',
}));
vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: async () => 'synthetic-owner' }));
vi.mock('@/lib/actions/job-actions', () => ({ getJobApplication: vi.fn() }));
vi.mock('@/lib/actions/resume-actions', () => ({
  getResume: vi.fn(),
  listResumes: async () => [{ id: 'synthetic-master', name: 'Master', source: fixture.master }],
}));
vi.mock('@/lib/actions/resume-history-actions', () => ({ recordResumeHistory: vi.fn() }));
vi.mock('@/lib/public-job-extraction', () => ({ extractPublicJob: async () => fixture.jd }));
vi.mock('@/lib/actions/tailor-action', () => ({
  tailorResumeForClient: async (master: string) => ({
    success: true,
    data: {
      tailored: master.replace(
        '## Experience',
        '## Summary\nSoftware engineer building Node.js scheduling APIs and React screens. Brings hands-on experience testing keyboard navigation and releasing an accessible reading queue.\n\n## Experience'
      ),
      changes: [{ snippet: 'Summary', reason: 'Synthetic grounded summary fixture.' }],
    },
  }),
}));

// Opt-in acceptance probe uses existing local Chrome; never a paid browser binding.
it('returns a real readable PDF from job link plus owned master through the API', {
  skip: !process.env.PUPPETEER_EXECUTABLE_PATH || !process.env.ROLEPATCH_PDF_EVIDENCE_DIR,
  timeout: 30_000,
}, async () => {
  const pdfRenderer = await import('@/lib/pdf');
  // Vitest's VM cannot resolve the renderer's Function-based dynamic imports.
  // Execute the unchanged renderer in native Node with the same HTML and Chrome.
  const renderSpy = vi.spyOn(pdfRenderer, 'renderPdf').mockImplementation(async (html) => {
    const child = spawn(
      process.execPath,
      [join(process.cwd(), 'src/__tests__/fixtures/render-pdf.mjs')],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    const output: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on('data', (data: Buffer) => output.push(data));
    child.stderr.on('data', (data: Buffer) => errors.push(data));
    const completion = new Promise<number | null>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
    child.stdin.end(html);
    if ((await completion) !== 0) throw new Error(Buffer.concat(errors).toString());
    return new Uint8Array(Buffer.from(Buffer.concat(output).toString(), 'base64'));
  });
  try {
    const response = await POST(
      new Request('http://localhost:3000/api/resume', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          job_url: 'https://example.com/jobs/platform',
          format: 'pdf',
          save_to_history: false,
        }),
      })
    );
    expect(response.status).toBe(200);
    const output = await response.json();
    expect(output).toMatchObject({
      ok: true,
      persisted: false,
      requires_review: true,
      pdf: { mime_type: 'application/pdf' },
    });
    const bytes = Buffer.from(output.pdf.data_base64, 'base64');
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    const parser = new PDFParse({ data: bytes });
    try {
      const result = await parser.getText();
      for (const text of [
        'Ada Example',
        'ada@example.org',
        'Node.js request validation',
        'accessible reading queue',
        'BSc Computer Science',
        'Example University, 2022',
      ])
        expect(result.text).toContain(text);
      const screenshots = await parser.getScreenshot({
        imageBuffer: true,
        imageDataUrl: false,
        desiredWidth: 1100,
      });
      for (const page of screenshots.pages)
        await writeFile(
          join(
            process.env.ROLEPATCH_PDF_EVIDENCE_DIR!,
            `tailored-resume-page-${page.pageNumber}.png`
          ),
          page.data
        );
      await writeFile(join(process.env.ROLEPATCH_PDF_EVIDENCE_DIR!, 'tailored-resume.pdf'), bytes);
      await writeFile(
        join(process.env.ROLEPATCH_PDF_EVIDENCE_DIR!, 'tailored-resume.txt'),
        result.text
      );
      await writeFile(
        join(process.env.ROLEPATCH_PDF_EVIDENCE_DIR!, 'tailored-resume.json'),
        JSON.stringify(
          {
            ...output,
            pdf: {
              filename: output.pdf.filename,
              mime_type: output.pdf.mime_type,
              byte_length: bytes.length,
            },
            pages: result.total,
          },
          null,
          2
        )
      );
    } finally {
      await parser.destroy();
    }
  } finally {
    renderSpy.mockRestore();
  }
});
