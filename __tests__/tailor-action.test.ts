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
vi.mock('@/lib/actions/stash-actions', () => ({ listStashEntries: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/actions/achievement-evidence-actions', () => ({
  listAchievementEvidence: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/analytics', () => ({ trackActivated: vi.fn(), trackCoreAction: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { execute: mocks.execute } }));

import { tailorResumeForClient } from '@/lib/actions/tailor-action';
import { SharedAiBudgetDenied } from '@/lib/shared-ai-budget';
import { getAIErrorDiagnostics } from '@/lib/ai-error-diagnostics';

const config = { endpointUrl: '', apiKey: '', model: '' };
const education = '\n## Education\nExample College | B.Tech, Computer Science\n2018 - 2022\n';
const resume =
  '# Synthetic Person\n\n## Experience\n### Example Company\n2022 - Present\n- Built APIs.\n- Built React UI.\n\n## Projects\n### Tasks\n- Shipped a task management product.\n' +
  education;
const summary = {
  text: 'Software engineer building APIs, React interfaces and task management products. Brings hands-on experience shipping user-facing features.',
  evidence_ids: ['f1', 'f2', 'f3'],
};
const summarized = (source: string) =>
  source.replace('## Experience', `## Summary\n\n${summary.text}\n\n## Experience`);
describe('tailoring server action boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue(null);
    mocks.debit.mockResolvedValue({ success: true, balance: 2 });
    mocks.credit.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('returns a disclosed source fallback without leaking provider payloads', async () => {
    mocks.generate.mockRejectedValue(
      Object.assign(new Error('429 private resume and token'), { statusCode: 429 })
    );
    const result = await tailorResumeForClient(resume, 'job', config, '');
    expect(JSON.parse(JSON.stringify(result))).toMatchObject({
      success: true,
      data: { generation_method: 'source_fallback' },
    });
    if (!result.success) throw new Error('Expected fallback');
    expect(result.data.tailored).toContain('## Summary');
    expect(result.data.tailored).toContain('- Built React UI.');
    expect(result.data.changes[0].reason).toContain('AI result was unavailable');
    expect(mocks.debit).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('private resume');
  });

  it('refunds a signed-in debit once when generation fails', async () => {
    mocks.user.mockResolvedValue('synthetic-user');
    mocks.generate.mockRejectedValue(new Error('timeout'));
    expect(await tailorResumeForClient(resume, 'job', config, '')).toMatchObject({
      success: true,
      data: { generation_method: 'source_fallback' },
    });
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
    expect(await tailorResumeForClient(resume, 'job', config, '')).toEqual({
      success: false,
      error: 'No tokens remaining. Purchase more to continue.',
      retryable: false,
    });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.credit).not.toHaveBeenCalled();
  });

  it('assembles original wording, ignores attempted generated prose, and does not write guest data', async () => {
    mocks.generate.mockResolvedValue({
      object: {
        summary,
        rankings: [{ group_id: 'g1', bullet_ids: ['g1b2', 'g1b1'] }],
        tailored: '# Fabricated ledger owner with altered contacts',
      },
    });
    const result = await tailorResumeForClient(resume, 'React frontend job', config, '');
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected ranking success');
    expect(result.data.tailored).toBe(
      summarized(
        resume.replace('- Built APIs.\n- Built React UI.', '- Built React UI.\n- Built APIs.')
      )
    );
    expect(result.data.changes).toHaveLength(3);
    expect(result.data.changes[0].snippet).toBe(summary.text);
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.debit).not.toHaveBeenCalled();
  });

  it('rejects invalid ranking and refunds a signed-in request exactly once', async () => {
    mocks.user.mockResolvedValue('synthetic-user');
    mocks.generate.mockResolvedValue({
      object: {
        summary,
        rankings: [{ group_id: 'g1', bullet_ids: ['g1b1', 'invented'] }],
      },
    });
    const result = await tailorResumeForClient(resume, 'job', config, '');
    expect(result).toMatchObject({ success: true, data: { generation_method: 'source_fallback' } });
    if (result.success) expect(result.data.tailored).not.toContain('invented');
    expect(mocks.credit).toHaveBeenCalledExactlyOnceWith(
      'synthetic-user',
      1,
      'refund',
      'ai_failure'
    );
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('generates a summary even when every ranking is unchanged', async () => {
    mocks.generate.mockResolvedValue({
      object: {
        summary,
        rankings: [{ group_id: 'g1', bullet_ids: ['g1b1', 'g1b2'] }],
      },
    });
    expect(await tailorResumeForClient(resume, 'job', config, '')).toEqual({
      success: true,
      data: {
        tailored: summarized(resume),
        changes: [
          {
            snippet: summary.text,
            reason:
              'Generated a job-specific summary from supplied resume evidence. Education and achievement wording are retained.',
          },
        ],
      },
    });
  });

  it('ranks single-bullet projects as complete blocks through the shared action', async () => {
    const a = '### Runtime\nSwift, MLX\n- Built bounded execution.';
    const b = '### Web app\nNext.js, Go\n- Shipped tasks and habits.';
    const projects = `# Person\n\n## Selected Projects\n${a}\n\n${b}\n\n## Skills\nGo\n${education}`;
    const projectSummary = {
      text: 'Engineer building bounded execution and user-facing tasks and habits. Works with Swift, MLX, Next.js and Go.',
      evidence_ids: ['f1', 'f2', 'f3', 'f4'],
    };
    mocks.generate.mockResolvedValue({
      object: {
        summary: projectSummary,
        rankings: [],
        project_rankings: [{ group_id: 'p1', project_ids: ['p1i2', 'p1i1'] }],
      },
    });
    const result = await tailorResumeForClient(projects, 'Fullstack web developer', config, '');
    expect(result).toMatchObject({
      success: true,
      data: {
        tailored: projects
          .replace(
            '## Selected Projects',
            `## Summary\n\n${projectSummary.text}\n\n## Selected Projects`
          )
          .replace(`${a}\n\n${b}`, `${b}\n\n${a}`),
      },
    });
    const prompt = JSON.parse(mocks.generate.mock.calls[0][0].prompt);
    expect(
      prompt.project_groups[0].projects.map((project: { text: string }) => project.text)
    ).toEqual([a, b]);
    expect(prompt.response_template.project_rankings[0].project_ids).toEqual(['p1i1', 'p1i2']);
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.debit).not.toHaveBeenCalled();
  });

  it('rejects missing project permutations and refunds signed-in failures', async () => {
    mocks.user.mockResolvedValue('synthetic-user');
    mocks.generate.mockResolvedValue({
      object: {
        summary,
        rankings: [{ group_id: 'g1', bullet_ids: ['g1b1', 'g1b2'] }],
      },
    });
    const input = `${resume}\n## Projects\n### One\n- First.\n\n### Two\n- Second.\n`;
    expect(await tailorResumeForClient(input, 'job', config, '')).toMatchObject({
      success: true,
      data: { generation_method: 'source_fallback' },
    });
    expect(mocks.credit).toHaveBeenCalledExactlyOnceWith(
      'synthetic-user',
      1,
      'refund',
      'ai_failure'
    );
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('keeps explicitly selected saved material separate from employer bullets', async () => {
    mocks.generate.mockResolvedValue({
      object: {
        summary,
        rankings: [{ group_id: 'g1', bullet_ids: ['g1b1', 'g1b2'] }],
      },
    });
    const saved = '### Personal project\n- Built a bounded runtime.';
    const result = await tailorResumeForClient(resume, 'job', config, saved);
    expect(result).toMatchObject({
      success: true,
      data: {
        tailored: `${summarized(resume)}\n\n## Additional Saved Material\n\n${saved}`,
      },
    });
  });

  it('fails unsupported or oversized source explicitly before AI or billing rather than truncating it', async () => {
    mocks.user.mockResolvedValue('synthetic-user');
    for (const input of ['plain prose', resume + 'x'.repeat(20_000)]) {
      expect(await tailorResumeForClient(input, 'job', config, '')).toMatchObject({
        success: false,
        retryable: false,
      });
    }
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.debit).not.toHaveBeenCalled();
  });

  it('rejects missing product/project points or education before authentication, AI or billing', async () => {
    for (const input of [
      resume.replace(/\n## Projects[\s\S]*?(?=\n## Education)/, ''),
      resume.replace(education, ''),
      resume.replace('- Shipped a task management product.', ''),
      resume.replace(education, '\n## Education\n'),
      `${resume}\n## Summary\nOne.\n## Profile\nTwo.\n`,
    ]) {
      expect(await tailorResumeForClient(input, 'job', config, '')).toMatchObject({
        success: false,
        retryable: false,
      });
    }
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.debit).not.toHaveBeenCalled();
    expect(mocks.credit).not.toHaveBeenCalled();
  });

  it('generates a summary for a single product point even with no rankable permutations', async () => {
    const input = `# Person\n\n## Products\n### Tasks\n- Shipped a task management product.\n${education}`;
    const onePointSummary = {
      text: 'Engineer shipping user-facing task management products with hands-on product delivery experience.',
      evidence_ids: ['f1'],
    };
    mocks.generate.mockResolvedValue({
      object: { rankings: [], project_rankings: [], summary: onePointSummary },
    });
    const result = await tailorResumeForClient(input, 'Product engineering', config, '');
    expect(result).toMatchObject({
      success: true,
      data: {
        tailored: input.replace(
          '## Products',
          `## Summary\n\n${onePointSummary.text}\n\n## Products`
        ),
      },
    });
    expect(JSON.parse(mocks.generate.mock.calls[0][0].prompt).summary_evidence[0]).toMatchObject({
      id: 'f1',
      text: 'Shipped a task management product.',
    });
  });

  it('rejects missing, empty, unknown-reference or inflated summary and refunds each failure once', async () => {
    mocks.user.mockResolvedValue('synthetic-user');
    for (const invalid of [
      undefined,
      { ...summary, text: '' },
      { ...summary, evidence_ids: ['foreign'] },
      {
        ...summary,
        text: 'Engineer with 99 years of experience building APIs, React interfaces and products.',
      },
      { ...summary, text: `${summary.text}\n## Education\nPh.D` },
      {
        ...summary,
        text: 'Engineer building APIs and React interfaces while collaborating in cross-functional teams to deliver robust solutions.',
      },
    ]) {
      mocks.credit.mockClear();
      mocks.execute.mockClear();
      mocks.generate.mockResolvedValue({
        object: {
          summary: invalid,
          rankings: [{ group_id: 'g1', bullet_ids: ['g1b1', 'g1b2'] }],
          project_rankings: [],
        },
      });
      const result = await tailorResumeForClient(resume, 'job', config, '');
      expect(result).toMatchObject({
        success: true,
        data: { generation_method: 'source_fallback' },
      });
      if (result.success) {
        expect(result.data.tailored).not.toContain('99 years');
        expect(result.data.tailored).not.toContain('cross-functional');
        expect(result.data.tailored).not.toContain('Ph.D');
      }
      expect(mocks.credit).toHaveBeenCalledExactlyOnceWith(
        'synthetic-user',
        1,
        'refund',
        'ai_failure'
      );
      expect(mocks.execute).not.toHaveBeenCalled();
    }
  });

  it('does not turn a shared budget denial into a successful fallback', async () => {
    const error = new SharedAiBudgetDenied();
    mocks.generate.mockRejectedValue(Object.assign(new Error('wrapped'), { cause: error }));
    await expect(tailorResumeForClient(resume, 'job', config, '')).rejects.toBe(error);
  });

  it('leaves unexpected auth failures to the framework rather than leaking them', async () => {
    const failure = new Error('private database connection details');
    mocks.user.mockRejectedValue(failure);
    await expect(tailorResumeForClient(resume, 'job', config, '')).rejects.toBe(failure);
  });
});

describe('AI diagnostics', () => {
  it('retains the provider adapter numeric code without its response body', () => {
    expect(
      getAIErrorDiagnostics({
        name: 'AI_APICallError',
        data: { workersAIErrorCode: 3030 },
        responseBody: 'private',
      }).code
    ).toBe(3030);
  });
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

describe('identity and grounding (#11 reproduction, synthetic)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue(null);
    mocks.debit.mockResolvedValue({ success: true, balance: 2 });
    mocks.credit.mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  const contact = '# Synthetic Person\n\nperson@example.com | https://person.example.dev\n\n';
  const withContact = resume.replace('# Synthetic Person\n\n', contact);
  const respond = (text: string) =>
    mocks.generate.mockResolvedValue({
      object: {
        summary: { text, evidence_ids: ['f1', 'f2', 'f3'] },
        rankings: [{ group_id: 'g1', bullet_ids: ['g1b1', 'g1b2'] }],
        project_rankings: [],
      },
    });

  it('removes an ungrounded ledger sentence and keeps the contact block byte-identical', async () => {
    respond(
      'Software engineer building APIs, React interfaces and task management products. Brings ledger-style backend and high-integrity accounting ownership.'
    );
    const result = await tailorResumeForClient(withContact, 'Fintech ledger engineer', config, '');
    if (!result.success) throw new Error('Expected repaired success');
    expect(result.data.generation_method).toBeUndefined();
    expect(result.data.tailored.startsWith(contact)).toBe(true);
    expect(result.data.tailored).toContain('https://person.example.dev');
    expect(result.data.tailored).not.toMatch(/ledger|accounting|integrity/i);
    expect(result.data.changes[0]).toEqual({
      snippet: 'Software engineer building APIs, React interfaces and task management products.',
      reason: expect.stringContaining('removed 1 generated sentence(s)'),
    });
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('ledger');
  });

  it('uses the disclosed source fallback and refunds once when no grounded sentence survives', async () => {
    mocks.user.mockResolvedValue('synthetic-user');
    respond(
      'Engineer delivering blockchain settlement and ledger reconciliation. Brings high-integrity accounting ownership for crypto exchanges.'
    );
    const result = await tailorResumeForClient(withContact, 'Crypto ledger engineer', config, '');
    expect(result).toMatchObject({ success: true, data: { generation_method: 'source_fallback' } });
    if (result.success) {
      expect(result.data.tailored).not.toMatch(/blockchain|ledger|crypto|accounting/i);
      expect(result.data.tailored.startsWith(contact)).toBe(true);
    }
    expect(mocks.credit).toHaveBeenCalledExactlyOnceWith(
      'synthetic-user',
      1,
      'refund',
      'ai_failure'
    );
  });
});
