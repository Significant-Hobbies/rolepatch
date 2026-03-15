import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @ai-sdk/openai before importing the module under test
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn((config: { baseURL: string; apiKey: string }) => ({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  })),
}));

import { getAIProvider } from '@/lib/ai';

describe('getAIProvider', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear relevant env vars before each test
    delete process.env.AI_BASE_URL;
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns default values when no config or env vars', () => {
    const { provider, model } = getAIProvider();

    expect(model).toBe('auto');
    expect(provider).toEqual({
      baseURL: 'https://free-ai-gateway.sarthakagrawal927.workers.dev/v1',
      apiKey: '',
    });
  });

  it('uses env vars when set', () => {
    process.env.AI_BASE_URL = 'https://custom.api/v1';
    process.env.AI_API_KEY = 'sk-test-key';
    process.env.AI_MODEL = 'gpt-4o';

    const { provider, model } = getAIProvider();

    expect(model).toBe('gpt-4o');
    expect(provider).toEqual({
      baseURL: 'https://custom.api/v1',
      apiKey: 'sk-test-key',
    });
  });

  it('explicit config overrides env vars', () => {
    process.env.AI_BASE_URL = 'https://env.api/v1';
    process.env.AI_API_KEY = 'sk-env-key';
    process.env.AI_MODEL = 'gpt-4o';

    const { provider, model } = getAIProvider({
      baseURL: 'https://override.api/v1',
      apiKey: 'sk-override-key',
      model: 'claude-3-opus',
    });

    expect(model).toBe('claude-3-opus');
    expect(provider).toEqual({
      baseURL: 'https://override.api/v1',
      apiKey: 'sk-override-key',
    });
  });

  it('partial config falls back to env vars then defaults', () => {
    process.env.AI_API_KEY = 'sk-env-key';

    const { provider, model } = getAIProvider({ model: 'custom-model' });

    expect(model).toBe('custom-model');
    expect(provider).toEqual({
      baseURL: 'https://free-ai-gateway.sarthakagrawal927.workers.dev/v1',
      apiKey: 'sk-env-key',
    });
  });
});
