import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';

import type { AIProviderConfig } from './types';
import { createBudgetedWorkersAiBinding, SharedAiBudgetDenied } from './shared-ai-budget';

// The former 3.1 8B model was retired; this model supports structured output.
const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
type FreeAiBinding = { fetch(request: Request): Promise<Response> };
const managedGatewayModels = new WeakSet<object>();
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

function createFreeAiGatewayModel(binding: FreeAiBinding): LanguageModel {
  const provider = createOpenAICompatible({
    name: 'free-ai',
    baseURL: 'https://fleet-gateway.internal/v1',
    apiKey: 'service-binding',
    headers: { 'x-gateway-project-id': 'rolepatch' },
    fetch: (input, init) => binding.fetch(new Request(input, init)),
    supportsStructuredOutputs: false,
  });
  const model = provider.chatModel('auto');
  managedGatewayModels.add(model as object);
  return model;
}

export function getAIModelRetryOptions(model: LanguageModel): { maxRetries?: 0 } {
  return managedGatewayModels.has(model as object) ? { maxRetries: 0 } : {};
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

function getRuntimeEnv():
  | (Cloudflare.Env & { FREE_AI?: FreeAiBinding; NODE_ENV?: string })
  | undefined {
  try {
    const { env } = getCloudflareContext({ async: false });
    return env as Cloudflare.Env & { FREE_AI?: FreeAiBinding; NODE_ENV?: string };
  } catch (error) {
    if (error instanceof SharedAiBudgetDenied) throw error;
    return undefined;
  }
}

/**
 * Returns a model for BYOK or the managed Free AI gateway.
 *
 * Selection order:
 *   1. User-supplied endpointUrl + apiKey  → external provider (BYO key)
 *   2. Free AI service binding              → managed free-provider routing
 *   3. Local Workers AI / explicit runtime  → development-only fallback
 */
export function getAIModel(aiConfig: AIProviderConfig): LanguageModel {
  // Honour explicit user config first — lets users plug in their own keys
  // through the Settings UI.
  if (aiConfig.endpointUrl && aiConfig.apiKey) {
    return createAIModel(aiConfig);
  }

  const runtimeEnv = getRuntimeEnv();
  if (runtimeEnv?.FREE_AI) return createFreeAiGatewayModel(runtimeEnv.FREE_AI);
  if ((runtimeEnv?.NODE_ENV ?? process.env.NODE_ENV) === 'production') {
    throw new Error('Free AI gateway service binding is required in production');
  }
  return getDevelopmentModel(aiConfig, runtimeEnv);
}

function getDevelopmentModel(
  aiConfig: AIProviderConfig,
  runtimeEnv: ReturnType<typeof getRuntimeEnv>
): LanguageModel {
  if (runtimeEnv?.AI) {
    return createWorkersAI({
      binding: createBudgetedWorkersAiBinding(runtimeEnv.AI, runtimeEnv.NEURON_BUDGET),
    })(DEFAULT_WORKERS_AI_MODEL);
  }

  const resolvedModel = aiConfig.model || process.env.AI_MODEL?.trim();
  if (!resolvedModel) throw new Error('AI_MODEL is required when no BYOK model is supplied');

  return createAIModel({
    endpointUrl: getDirectBaseUrl(),
    apiKey: getDirectApiKey(),
    model: resolvedModel,
  });
}
