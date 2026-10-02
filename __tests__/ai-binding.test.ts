import { generateObject, generateText } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const state = vi.hoisted(() => ({
  used: 0,
  contextError: null as unknown,
  contextCalls: 0,
  binding: { marker: 'receiver', run: vi.fn() },
  fetch: vi.fn(async (_url: string, init?: RequestInit) => {
    const { neurons } = JSON.parse(String(init?.body)) as { neurons: number };
    state.used += neurons;
    return Response.json({
      allowed: true,
      used: state.used,
      remaining: 9_500 - state.used,
      retryAfter: 0,
      dayKey: new Date().toISOString().slice(0, 10),
    });
  }),
  namespace: {
    idFromName: (name: string) => name,
    get: () => ({ fetch: state.fetch }),
  },
}));

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => {
    state.contextCalls += 1;
    if (state.contextError) throw state.contextError;
    return { env: { AI: state.binding, NEURON_BUDGET: state.namespace } };
  },
}));

import { getAIModel } from '@/lib/ai-cloudflare';
import { toUserFacingAIError } from '@/lib/ai';
import { SharedAiBudgetDenied } from '@/lib/shared-ai-budget';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

describe('Workers AI shared daily budget', () => {
  beforeEach(() => {
    state.used = 0;
    state.contextError = null;
    state.contextCalls = 0;
    state.binding.run.mockReset();
    state.fetch.mockClear();
  });

  it('uses the existing 70B model and defaults omitted output tokens to 512', async () => {
    state.binding.run.mockResolvedValue({
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
    expect(state.binding.run).toHaveBeenCalledOnce();
    expect(state.binding.run.mock.calls[0][0]).toBe(MODEL);
    expect(state.binding.run.mock.calls[0][1].max_tokens).toBe(512);
    expect(state.fetch).toHaveBeenCalledOnce();
  });

  it('reserves each provider retry before invoking the binding and preserves its receiver', async () => {
    let receiver: unknown;
    state.binding.run.mockImplementation(function (this: unknown) {
      receiver = this;
      if (state.binding.run.mock.calls.length === 1) {
        throw Object.assign(new Error('synthetic retryable limit'), { code: 3036 });
      }
      return Promise.resolve({
        choices: [
          { message: { role: 'assistant', content: 'Synthetic answer.' }, finish_reason: 'stop' },
        ],
      });
    });
    const result = await generateText({
      model: getAIModel({ endpointUrl: '', apiKey: '', model: '' }),
      prompt: 'Synthetic retry fixture: café ⚓',
      maxOutputTokens: 512,
      maxRetries: 1,
    });
    expect(result.text).toBe('Synthetic answer.');
    expect(state.binding.run).toHaveBeenCalledTimes(2);
    expect(state.fetch).toHaveBeenCalledTimes(2);
    expect(receiver).toBe(state.binding);
    expect(state.binding.run.mock.calls.every(([, input]) => input.max_tokens === 512)).toBe(true);
  });

  it('denies oversized output before debit and inference', async () => {
    const model = getAIModel({ endpointUrl: '', apiKey: '', model: '' });
    await expect(
      generateText({
        model,
        prompt: 'Synthetic bound fixture',
        maxOutputTokens: 8_193,
        maxRetries: 0,
      })
    ).rejects.toSatisfy((error: unknown) => {
      const normalized = toUserFacingAIError(error);
      return normalized instanceof SharedAiBudgetDenied;
    });
    expect(state.fetch).not.toHaveBeenCalled();
    expect(state.binding.run).not.toHaveBeenCalled();
  });

  it.each([null, [], 'bad receipt'])('fails closed on malformed receipt %j', async (payload) => {
    state.fetch.mockResolvedValueOnce(Response.json(payload));
    await expect(
      generateText({
        model: getAIModel({ endpointUrl: '', apiKey: '', model: '' }),
        prompt: 'Synthetic denial fixture',
        maxRetries: 0,
      })
    ).rejects.toSatisfy((error: unknown) => {
      const normalized = toUserFacingAIError(error);
      return normalized instanceof SharedAiBudgetDenied;
    });
    expect(state.binding.run).not.toHaveBeenCalled();
  });

  it('does not fall through to the configured external endpoint when context raises a budget denial', () => {
    const denial = new SharedAiBudgetDenied();
    state.contextError = denial;
    expect(() => getAIModel({ endpointUrl: '', apiKey: '', model: 'configured-model' })).toThrow(
      denial
    );
    expect(toUserFacingAIError(denial)).toBe(denial);
    expect(state.binding.run).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it('preserves explicit user BYOK selection ahead of the binding and shared budget', () => {
    const model = getAIModel({
      endpointUrl: 'https://example.invalid/v1',
      apiKey: 'synthetic-test-key',
      model: 'user-selected-model',
    });
    expect(model).toMatchObject({ modelId: 'user-selected-model' });
    expect(state.contextCalls).toBe(0);
    expect(state.binding.run).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
  });
});
