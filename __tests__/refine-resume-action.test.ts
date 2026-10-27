import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  user: vi.fn(),
  debit: vi.fn(),
  credit: vi.fn(),
  execute: vi.fn(),
}));
vi.mock('ai', () => ({ generateObject: mocks.generate }));
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
import { refineResumeSectionForClient } from '@/lib/actions/refine-resume-action';

const master =
  '# Alex\n\n## Experience\n### Studio\n- Built APIs.\n- Built React interfaces.\n\n## Projects\n### Reader\n- Built a reading queue.\n\n## Education\nBSc, Example College.\n';
const input = {
  masterSource: master,
  currentSource: master.replace(
    '## Experience',
    '## Summary\nSoftware engineer building APIs and React interfaces for users.\n\n## Experience'
  ),
  jdText: 'Build React interfaces.',
  instruction: 'Lead with frontend work',
  target: { kind: 'bullets' as const, groupId: 'g1' },
  aiConfig: { endpointUrl: '', apiKey: '', model: '' },
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue(null);
  mocks.debit.mockResolvedValue({ success: true });
  mocks.generate.mockResolvedValue({ object: { ordered_ids: ['g1b2', 'g1b1'] } });
});
describe('refinement action boundary', () => {
  it('returns a source-preserving guest proposal without cloud writes or billing', async () => {
    const result = await refineResumeSectionForClient(input);
    expect(result).toMatchObject({
      success: true,
      data: {
        tailored: input.currentSource.replace(
          '- Built APIs.\n- Built React interfaces.',
          '- Built React interfaces.\n- Built APIs.'
        ),
      },
    });
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.debit).not.toHaveBeenCalled();
  });
  it('validates bounds and current section before billing', async () => {
    mocks.user.mockResolvedValue('user');
    expect(
      await refineResumeSectionForClient({ ...input, currentSource: 'x'.repeat(30_001) })
    ).toMatchObject({ success: false, retryable: false });
    expect(
      await refineResumeSectionForClient({
        ...input,
        target: { kind: 'bullets', groupId: 'foreign' },
      })
    ).toMatchObject({ success: false, retryable: false });
    expect(mocks.debit).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('refunds invalid permutations once and leaves original draft untouched', async () => {
    mocks.user.mockResolvedValue('user');
    mocks.generate.mockResolvedValue({ object: { ordered_ids: ['g1b1', 'foreign'] } });
    expect(await refineResumeSectionForClient(input)).toMatchObject({
      success: false,
      error: expect.stringContaining('draft is unchanged'),
    });
    expect(mocks.debit).toHaveBeenCalledExactlyOnceWith('tailor', 'refine');
    expect(mocks.credit).toHaveBeenCalledExactlyOnceWith('user', 1, 'refund', 'ai_failure');
  });
  it('does not generate or refund when credits are unavailable', async () => {
    mocks.user.mockResolvedValue('user');
    mocks.debit.mockResolvedValue({ success: false, error: 'insufficient_tokens' });
    expect(await refineResumeSectionForClient(input)).toMatchObject({
      success: false,
      error: 'No tokens remaining. Purchase more to continue.',
    });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.credit).not.toHaveBeenCalled();
  });
});
