import { generateObject } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const binding = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => ({ env: { AI: binding } }),
}));
import { getAIModel } from '@/lib/ai-cloudflare';

describe('Workers AI structured-output adapter', () => {
  beforeEach(() => binding.run.mockReset());

  it('uses the supported keyless model and validates native JSON output through the real SDK', async () => {
    binding.run.mockResolvedValue({
      response: { tailored: '# Riley Example' },
      usage: { prompt_tokens: 20, completion_tokens: 10 },
    });
    const result = await generateObject({
      model: getAIModel({ endpointUrl: '', apiKey: '', model: '' }),
      schema: z.object({ tailored: z.string() }),
      prompt: 'Synthetic resume',
      maxRetries: 0,
    });
    expect(result.object).toEqual({ tailored: '# Riley Example' });
    expect(binding.run).toHaveBeenCalledOnce();
    expect(binding.run.mock.calls[0][0]).toBe('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    expect(binding.run.mock.calls[0][1].response_format).toMatchObject({
      type: 'json_schema',
      json_schema: { type: 'object', required: ['tailored'] },
    });
  });

  it('preserves an explicit user provider selection', () => {
    const model = getAIModel({
      endpointUrl: 'https://example.invalid/v1',
      apiKey: 'synthetic-test-key',
      model: 'user-selected-model',
    });
    expect(model).toMatchObject({ modelId: 'user-selected-model' });
    expect(binding.run).not.toHaveBeenCalled();
  });
});
