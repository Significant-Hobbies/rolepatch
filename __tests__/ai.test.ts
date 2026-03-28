import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.mock is hoisted, so use vi.hoisted to create the mock function
const { mockGoogle } = vi.hoisted(() => ({
  mockGoogle: vi.fn((model: string) => ({ modelId: model })),
}));

vi.mock('@ai-sdk/google', () => ({
  google: mockGoogle,
}));

import { getAIModel } from '@/lib/ai';

describe('getAIModel', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.AI_MODEL;
    mockGoogle.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns gemini-2.5-pro by default when no override or env var', () => {
    getAIModel();
    expect(mockGoogle).toHaveBeenCalledWith('gemini-2.5-pro');
  });

  it('uses AI_MODEL env var when set', () => {
    process.env.AI_MODEL = 'gemini-2.0-flash';
    getAIModel();
    expect(mockGoogle).toHaveBeenCalledWith('gemini-2.0-flash');
  });

  it('modelOverride takes precedence over env var', () => {
    process.env.AI_MODEL = 'gemini-2.0-flash';
    getAIModel('gemini-1.5-pro');
    expect(mockGoogle).toHaveBeenCalledWith('gemini-1.5-pro');
  });

  it('rejects unknown model and falls back to default', () => {
    getAIModel('evil-model-name');
    expect(mockGoogle).toHaveBeenCalledWith('gemini-2.5-pro');
  });
});
