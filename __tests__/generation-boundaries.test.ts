import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  user: vi.fn(),
  debit: vi.fn(),
  credit: vi.fn(),
  execute: vi.fn(),
}));
vi.mock('ai', () => ({ generateText: mocks.generate }));
vi.mock('@/lib/ai-cloudflare', () => ({
  getAIModel: () => ({}),
  getAIModelRetryOptions: () => ({}),
}));
vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: mocks.user }));
vi.mock('@/lib/actions/token-actions', () => ({
  debitToken: mocks.debit,
  creditTokens: mocks.credit,
}));
vi.mock('@/lib/db', () => ({ db: { execute: mocks.execute } }));
vi.mock('@/lib/analytics', () => ({ trackCoreAction: vi.fn() }));
vi.mock('@/lib/actions/scrape-action', () => ({
  scrapeJobUrl: vi.fn().mockResolvedValue({ text: '' }),
}));

import { generateCoverLetterForClient } from '@/lib/actions/cover-letter-action';
import { generateFitScoreForClient } from '@/lib/actions/fit-score-action';
import { generateInterviewStoriesForClient } from '@/lib/actions/interview-prep-action';

const config = { endpointUrl: '', apiKey: '', model: '' };
const cover = () =>
  generateCoverLetterForClient('QA resume', 'QA job', 'Synthetic', 'job', 'resume', config);
const fit = () => generateFitScoreForClient('QA resume', 'QA job', 'job', config);
const stories = () => generateInterviewStoriesForClient('QA resume', 'QA job', 'job', config);

describe('cover letter and interview generation boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mockResolvedValue(null);
    mocks.debit.mockResolvedValue({ success: true });
    mocks.credit.mockResolvedValue(undefined);
    mocks.execute.mockResolvedValue({ rows: [{}] });
  });

  it('generates a guest cover letter without billing or touching D1', async () => {
    mocks.generate.mockResolvedValue({ text: 'Synthetic letter' });
    expect(await cover()).toEqual({ success: true, data: 'Synthetic letter' });
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.debit).not.toHaveBeenCalled();
  });

  it('rejects another user’s job or resume before charging', async () => {
    mocks.user.mockResolvedValue('qa-user');
    mocks.execute.mockResolvedValue({ rows: [] });
    expect(await cover()).toEqual({
      success: false,
      error: 'Job or resume not found',
      retryable: false,
    });
    expect(mocks.execute.mock.calls[0][0].args).toEqual(['resume', 'job', 'qa-user', 'qa-user']);
    expect(mocks.debit).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('refunds a cover-letter debit once after an AI failure', async () => {
    mocks.user.mockResolvedValue('qa-user');
    mocks.generate.mockRejectedValue(new Error('timeout: private payload'));
    expect(await cover()).toEqual({
      success: false,
      error: 'The AI request took too long. Please try again.',
      retryable: true,
    });
    expect(mocks.credit).toHaveBeenCalledExactlyOnceWith('qa-user', 1, 'refund', 'ai_failure');
    expect(mocks.execute).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['cover letter', cover],
    ['interview stories', stories],
    ['job fit', fit],
  ])('returns a serializable %s failure without private provider text', async (_, run) => {
    mocks.generate.mockRejectedValue(new Error('private provider payload'));
    const result = await run();
    expect(JSON.parse(JSON.stringify(result))).toEqual({
      success: false,
      error: "Couldn't reach the AI service. Please try again in a moment.",
      retryable: true,
    });
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.debit).not.toHaveBeenCalled();
  });

  it('does not leak unexpected auth errors through the result', async () => {
    const failure = new Error('private database details');
    mocks.user.mockRejectedValue(failure);
    await expect(cover()).rejects.toBe(failure);
  });
});
