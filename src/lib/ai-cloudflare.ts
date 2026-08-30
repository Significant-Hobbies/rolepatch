import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { createWorkersAI, type WorkersAISettings } from 'workers-ai-provider';

import type { AIProviderConfig } from './types';

const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';
type WorkersAiBinding = Extract<WorkersAISettings, { binding: unknown }>['binding'];

/**
 * Build a LanguageModel from a provider config, talking to any
 * OpenAI-compatible endpoint (formerly @saas-maker/ai's createAIModel).
 */
function createAIModel(
  config: AIProviderConfig,
  options?: { headers?: Record<string, string>; name?: string }
): LanguageModel {
  const provider = createOpenAICompatible({
    baseURL: config.endpointUrl.trim().replace(/\/+$/, ''),
    apiKey: config.apiKey,
    name: options?.name ?? 'rolepatch-direct',
    headers: options?.headers,
  });
  return provider.chatModel(config.model);
}

function getDirectBaseUrl(): string {
  const fromEnv = process.env.AI_BASE_URL?.trim();
  if (!fromEnv) throw new Error('AI_BASE_URL is required when no BYOK endpoint is supplied');
  return fromEnv.replace(/\/+$/, '');
}

function getDirectApiKey(): string {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) throw new Error('AI_API_KEY is required when no BYOK key is supplied');
  return apiKey;
}

function getWorkersAIModel(): LanguageModel | null {
  try {
    const { env } = getCloudflareContext({ async: false });
    const binding = (env as { AI?: WorkersAiBinding }).AI;
    return binding ? createWorkersAI({ binding })(DEFAULT_WORKERS_AI_MODEL) : null;
  } catch {
    return null;
  }
}

/**
 * Returns a model for BYOK or the project's direct free-provider/local path.
 *
 * Selection order:
 *   1. User-supplied endpointUrl + apiKey  → external provider (BYO key)
 *   2. Project Workers AI binding           → free, keyless Cloudflare model
 *   3. Otherwise                            → explicit direct runtime config
 */
export function getAIModel(aiConfig: AIProviderConfig): LanguageModel {
  // Honour explicit user config first — lets users plug in their own keys
  // through the Settings UI.
  if (aiConfig.endpointUrl && aiConfig.apiKey) {
    return createAIModel(aiConfig);
  }

  const workersAiModel = getWorkersAIModel();
  if (workersAiModel) return workersAiModel;

  const resolvedModel = aiConfig.model || process.env.AI_MODEL?.trim();
  if (!resolvedModel) throw new Error('AI_MODEL is required when no BYOK model is supplied');

  return createAIModel({
    endpointUrl: getDirectBaseUrl(),
    apiKey: getDirectApiKey(),
    model: resolvedModel,
  });
}
