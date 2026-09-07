import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  user: vi.fn(),
  debit: vi.fn(),
  credit: vi.fn(),
  execute: vi.fn(),
}));
vi.mock('ai', () => ({ generateObject: mocks.generate }));
vi.mock('@/lib/ai-cloudflare', () => ({ getAIModel: () => ({}) }));
vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: mocks.user }));
vi.mock('@/lib/actions/token-actions', () => ({
  debitToken: mocks.debit,
  creditTokens: mocks.credit,
}));
vi.mock('@/lib/actions/stash-actions', () => ({ listStashEntries: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/actions/achievement-evidence-actions', () => ({
  listAchievementEvidence: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/analytics', () => ({ trackActivated: vi.fn(), trackCoreAction: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { execute: mocks.execute } }));

import { tailorResumeForClient } from '@/lib/actions/tailor-action';
import { getAIErrorDiagnostics } from '@/lib/ai-error-diagnostics';

const config = { endpointUrl: '', apiKey: '', model: '' };
describe('tailoring server action boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue(null);
    mocks.debit.mockResolvedValue({ success: true, balance: 2 });
    mocks.credit.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns a serializable friendly provider failure without leaking provider payloads', async () => {
    mocks.generate.mockRejectedValue(
      Object.assign(new Error('429 private resume and token'), { statusCode: 429 })
    );
    const result = await tailorResumeForClient('resume', 'job', config, '');
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      success: false,
      error: 'The AI service is busy right now. Please wait a moment and try again.',
      retryable: true,
    });
    expect(mocks.debit).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('private resume');
  });

  it('refunds a signed-in debit once when generation fails', async () => {
    mocks.user.mockResolvedValue('synthetic-user');
    mocks.generate.mockRejectedValue(new Error('timeout'));
    expect((await tailorResumeForClient('resume', 'job', config, '')).success).toBe(false);
    expect(mocks.credit).toHaveBeenCalledExactlyOnceWith(
      'synthetic-user',
      1,
      'refund',
      'ai_failure'
    );
  });

  it('reports insufficient tokens without generating or refunding', async () => {
    mocks.user.mockResolvedValue('synthetic-user');
    mocks.debit.mockResolvedValue({ success: false, error: 'insufficient_tokens' });
    expect(await tailorResumeForClient('resume', 'job', config, '')).toEqual({
      success: false,
      error: 'No tokens remaining. Purchase more to continue.',
      retryable: false,
    });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.credit).not.toHaveBeenCalled();
  });

  it('preserves successful output and does not write guest data', async () => {
    const output = {
      tailored: '# Synthetic resume',
      changes: [{ snippet: 'Synthetic', reason: 'Relevant' }],
    };
    mocks.generate.mockResolvedValue({ object: output });
    expect(await tailorResumeForClient('resume', 'job', config, '')).toEqual({
      success: true,
      data: output,
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('leaves unexpected auth failures to the framework rather than leaking them', async () => {
    const failure = new Error('private database connection details');
    mocks.user.mockRejectedValue(failure);
    await expect(tailorResumeForClient('resume', 'job', config, '')).rejects.toBe(failure);
  });
});

describe('AI diagnostics', () => {
  it('allows only bounded numeric codes and known error names', () => {
    expect(
      getAIErrorDiagnostics({
        name: 'AI_APICallError',
        statusCode: 503,
        code: 4006,
        cause: { name: 'TypeError', message: 'secret' },
        responseBody: 'private',
      })
    ).toEqual({ type: 'AI_APICallError', statusCode: 503, code: 4006, causeType: 'TypeError' });
    expect(
      getAIErrorDiagnostics({
        name: 'private',
        code: 'secret',
        statusCode: Number.POSITIVE_INFINITY,
        cause: { name: 'private' },
      })
    ).toEqual({ type: 'unknown', code: null, statusCode: null, causeType: 'unknown' });
    expect(getAIErrorDiagnostics(null)).toEqual({
      type: 'unknown',
      code: null,
      statusCode: null,
      causeType: null,
    });
  });
});
