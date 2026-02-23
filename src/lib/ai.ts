import { createOpenAI } from '@ai-sdk/openai';
import type { AIProviderConfig } from '@/lib/types';

export function getAIProvider(config?: Partial<AIProviderConfig>) {
  const baseURL = config?.baseURL || process.env.AI_BASE_URL || 'https://free-ai-gateway.sarthakagrawal927.workers.dev/v1';
  const apiKey = config?.apiKey || process.env.AI_API_KEY || '';
  const model = config?.model || process.env.AI_MODEL || 'auto';

  const provider = createOpenAI({
    baseURL,
    apiKey,
  });

  return { provider, model };
}
