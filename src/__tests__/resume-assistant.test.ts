// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resumeAssistantSchema,
  resolveJobReference,
  publicJobUrl,
} from '@/lib/resume-assistant-input';
import { getCurrentUserId } from '@/lib/auth-utils';
import { getJobApplication } from '@/lib/actions/job-actions';
import { getResume, listResumes } from '@/lib/actions/resume-actions';
import { tailorResumeForClient } from '@/lib/actions/tailor-action';
import { recordResumeHistory } from '@/lib/actions/resume-history-actions';
import { extractPublicJob } from '@/lib/public-job-extraction';
import { tailorResumeFromReference } from '@/lib/actions/resume-assistant-actions';

vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: vi.fn() }));
vi.mock('@/lib/actions/job-actions', () => ({ getJobApplication: vi.fn() }));
vi.mock('@/lib/actions/resume-actions', () => ({ getResume: vi.fn(), listResumes: vi.fn() }));
vi.mock('@/lib/actions/tailor-action', () => ({ tailorResumeForClient: vi.fn() }));
vi.mock('@/lib/actions/resume-history-actions', () => ({ recordResumeHistory: vi.fn() }));
vi.mock('@/lib/public-job-extraction', () => ({ extractPublicJob: vi.fn() }));
const resume =
  '# Alex Morgan\n\n## Experience\nBuilt TypeScript services and reduced incidents 34%.\n';
const jd =
  'Seeking a platform engineer to maintain TypeScript services, improve production reliability, and collaborate on incident reviews. '.repeat(
    2
  );
const parse = (value: unknown) => resumeAssistantSchema.parse(value);

describe('job references', () => {
  it.each([
    ['linkedin', '123', undefined, 'https://www.linkedin.com/jobs/view/123/'],
    ['greenhouse', '123', 'acme', 'https://job-boards.greenhouse.io/acme/jobs/123'],
    ['lever', 'abc-def', 'acme', 'https://jobs.lever.co/acme/abc-def'],
    ['ashby', 'abc-def', 'acme', 'https://jobs.ashbyhq.com/acme/abc-def'],
  ])('resolves %s IDs without a search', (source, job_id, company, url) => {
    expect(resolveJobReference(parse({ source, job_id, company }))).toEqual({ url });
  });
  it('requires a source and company context for ambiguous IDs', () => {
    expect(() => resolveJobReference(parse({ job_id: '123' }))).toThrow('source');
    expect(() => resolveJobReference(parse({ source: 'greenhouse', job_id: '123' }))).toThrow(
      'company'
    );
    expect(() =>
      resolveJobReference(parse({ job_id: '123', job_url: 'https://example.com/jobs/123' }))
    ).toThrow('not both');
  });
  it('preserves arbitrary board paths and query IDs, drops fragments', () => {
    expect(publicJobUrl('https://careers.example.com/opening?id=123#apply')).toBe(
      'https://careers.example.com/opening?id=123'
    );
  });
  it.each([
    'file:///etc/passwd',
    'http://localhost/job',
    'http://127.0.0.1/job',
    'http://[::1]/job',
    'http://169.254.169.254/job',
    'http://service.internal/job',
    'https://user:pass@example.com/job',
    'https://example.com:8443/job',
  ])('rejects unsafe URL %s', (url) => {
    expect(() => publicJobUrl(url)).toThrow();
  });
});

describe('portable resume actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue(null);
    vi.mocked(tailorResumeForClient).mockResolvedValue({
      success: true,
      data: { tailored: resume, changes: [] },
    });
    vi.mocked(extractPublicJob).mockResolvedValue(jd);
  });
  it('returns an unsaved guest draft without reading cloud profiles', async () => {
    const output = await tailorResumeFromReference({
      jd_text: jd,
      resume_markdown: resume,
      format: 'html',
    });
    expect(output).toMatchObject({
      ok: true,
      persisted: false,
      requires_review: true,
      markdown: resume,
    });
    expect(output).toHaveProperty('html');
    expect(getResume).not.toHaveBeenCalled();
    expect(listResumes).not.toHaveBeenCalled();
    expect(getJobApplication).not.toHaveBeenCalled();
    expect(tailorResumeForClient).toHaveBeenCalledWith(
      resume.trim(),
      jd.trim(),
      { endpointUrl: '', apiKey: '', model: '' },
      ''
    );
  });
  it('requires guest base text on every call and blocks saved IDs', async () => {
    expect(await tailorResumeFromReference({ jd_text: jd })).toMatchObject({
      code: 'resume_required',
    });
    expect(
      await tailorResumeFromReference({ jd_text: jd, resume_id: 'someone-else' })
    ).toMatchObject({ code: 'sign_in_required' });
    expect(
      await tailorResumeFromReference({
        source: 'rolepatch',
        job_id: 'saved',
        resume_markdown: resume,
      })
    ).toMatchObject({ code: 'sign_in_required' });
    expect(tailorResumeForClient).not.toHaveBeenCalled();
  });
  it('checks ownership before extraction or token generation', async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue('owner');
    vi.mocked(getResume).mockResolvedValue(null);
    expect(
      await tailorResumeFromReference({
        resume_id: 'not-owned',
        job_url: 'https://example.com/job',
      })
    ).toMatchObject({ code: 'not_found' });
    expect(extractPublicJob).not.toHaveBeenCalled();
    expect(tailorResumeForClient).not.toHaveBeenCalled();
  });
  it('uses only a saved job returned by the existing owner-scoped action', async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue('owner');
    vi.mocked(getJobApplication).mockResolvedValue(null);
    expect(
      await tailorResumeFromReference({
        source: 'rolepatch',
        job_id: 'not-owned',
        resume_markdown: resume,
      })
    ).toMatchObject({ code: 'not_found' });
    expect(tailorResumeForClient).not.toHaveBeenCalled();
  });
  it('asks for a choice instead of guessing among cloud resumes', async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue('owner');
    vi.mocked(listResumes).mockResolvedValue([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ] as Awaited<ReturnType<typeof listResumes>>);
    expect(await tailorResumeFromReference({ jd_text: jd })).toMatchObject({
      code: 'choose_resume',
      profiles: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
    });
    expect(tailorResumeForClient).not.toHaveBeenCalled();
  });
  it('accepts pasted descriptions when a site is unavailable', async () => {
    vi.mocked(extractPublicJob).mockRejectedValue(new Error('blocked'));
    expect(
      await tailorResumeFromReference({
        job_url: 'https://example.com/job',
        resume_markdown: resume,
      })
    ).toMatchObject({ code: 'extraction_failed' });
    expect(
      await tailorResumeFromReference({
        job_url: 'https://example.com/job',
        jd_text: jd,
        resume_markdown: resume,
      })
    ).toMatchObject({ ok: true });
    expect(extractPublicJob).toHaveBeenCalledTimes(1);
  });
  it('returns actionable reference errors before generation', async () => {
    expect(
      await tailorResumeFromReference({ job_id: '123', resume_markdown: resume })
    ).toMatchObject({ code: 'invalid_reference', error: expect.stringContaining('source') });
    expect(
      await tailorResumeFromReference({ jd_text: jd, resume_markdown: resume, extra: true })
    ).toMatchObject({ code: 'invalid_input' });
    expect(tailorResumeForClient).not.toHaveBeenCalled();
  });
  it('propagates expected AI failures without a false draft', async () => {
    vi.mocked(tailorResumeForClient).mockResolvedValue({
      success: false,
      error: 'No tokens remaining. Purchase more to continue.',
      retryable: false,
    });
    expect(await tailorResumeFromReference({ jd_text: jd, resume_markdown: resume })).toMatchObject(
      { ok: false, code: 'generation_failed', retryable: false }
    );
  });
});

describe('optional persisted API/MCP history', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue('owner');
    vi.mocked(getResume).mockResolvedValue({
      id: 'master',
      name: 'Master',
      source: resume,
      created_at: 1,
      updated_at: 1,
    });
    vi.mocked(tailorResumeForClient).mockResolvedValue({
      success: true,
      data: { tailored: resume, changes: [] },
    });
    vi.mocked(recordResumeHistory).mockResolvedValue({
      id: 'version',
      job_id: 'job',
      resume_id: 'master',
      saved: true,
      view_url: '/tailor/job?version=version',
    });
  });
  it('saves authenticated plain API outputs with owned master and job metadata', async () => {
    const output = await tailorResumeFromReference(
      { resume_id: 'master', jd_text: jd, company_name: 'Example Co', role_title: 'Engineer' },
      true
    );
    expect(output).toMatchObject({
      ok: true,
      persisted: true,
      draft_id: 'version',
      history: { saved: true },
    });
    expect(recordResumeHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        resume_id: 'master',
        source: resume,
        company: 'Example Co',
        role: 'Engineer',
      })
    );
  });
  it('keeps default MCP drafts unsaved and respects explicit opt-out', async () => {
    expect(await tailorResumeFromReference({ resume_id: 'master', jd_text: jd })).toMatchObject({
      persisted: false,
    });
    expect(
      await tailorResumeFromReference(
        { resume_id: 'master', jd_text: jd, save_to_history: false },
        true
      )
    ).toMatchObject({ persisted: false });
    expect(recordResumeHistory).not.toHaveBeenCalled();
  });
  it('keeps ordinary guest API calls stateless but rejects explicit cloud saving', async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);
    expect(
      await tailorResumeFromReference({ resume_markdown: resume, jd_text: jd }, true)
    ).toMatchObject({ ok: true, persisted: false });
    expect(
      await tailorResumeFromReference(
        { resume_markdown: resume, jd_text: jd, save_to_history: true },
        true
      )
    ).toMatchObject({ code: 'sign_in_required' });
    expect(recordResumeHistory).not.toHaveBeenCalled();
  });
  it('returns generated text and explicit unsaved warning when history storage fails', async () => {
    vi.mocked(recordResumeHistory).mockRejectedValue(new Error('database failed'));
    expect(
      await tailorResumeFromReference({ resume_id: 'master', jd_text: jd }, true)
    ).toMatchObject({
      ok: true,
      persisted: false,
      markdown: resume,
      history: { saved: false, error: expect.stringContaining('could not be saved') },
    });
    expect(tailorResumeForClient).toHaveBeenCalledTimes(1);
  });
  it('does not write a successful version when AI fails', async () => {
    vi.mocked(tailorResumeForClient).mockResolvedValue({
      success: false,
      error: 'Unavailable',
      retryable: true,
    });
    expect(
      await tailorResumeFromReference({ resume_id: 'master', jd_text: jd }, true)
    ).toMatchObject({ code: 'generation_failed' });
    expect(recordResumeHistory).not.toHaveBeenCalled();
  });
});
