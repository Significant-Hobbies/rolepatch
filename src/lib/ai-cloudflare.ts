import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createAIModel } from '@saas-maker/ai/server';
import type { LanguageModel } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';

import type { AIProviderConfig } from './types';

/**
 * Default Workers AI model for text generation. ~64 Neurons/inference.
 * 10k Neurons/day free quota → ~150 inferences/day before overage.
 */
const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/**
 * Returns a LanguageModel that uses the Cloudflare Workers AI binding when
 * available. Falls back to the user-configured external provider (e.g. Vercel
 * AI Gateway, OpenAI-compatible endpoint) if the binding is missing or the
 * user explicitly configured an `endpointUrl`.
 *
 * Selection order:
 *   1. User-supplied endpointUrl + apiKey  → external provider (BYO key)
 *   2. env.AI binding present              → Workers AI (free 10k Neurons/day)
 *   3. Throw — no provider available
 */
export function getAIModel(aiConfig: AIProviderConfig): LanguageModel {
  // Honour explicit user config first — lets users plug in their own keys.
  if (aiConfig.endpointUrl && aiConfig.apiKey) {
    return createAIModel(aiConfig);
  }

  // Fall back to Workers AI binding when no external endpoint is configured.
  try {
    const { env } = getCloudflareContext();
    const ai = (env as unknown as { AI?: Ai }).AI;
    if (ai) {
      const workersai = createWorkersAI({ binding: ai });
      const modelId = aiConfig.model?.startsWith('@cf/')
        ? aiConfig.model
        : DEFAULT_WORKERS_AI_MODEL;
      // workers-ai-provider model IDs are typed against a static union; cast
      // because we accept any user-supplied @cf/ model.
      return workersai(modelId as Parameters<typeof workersai>[0]);
    }
  } catch {
    // getCloudflareContext throws outside the Workers runtime (e.g. local
    // `next dev` without `wrangler dev`). Fall through to the external path.
  }

  // No binding and no user config — surface a clear error.
  if (!aiConfig.endpointUrl) {
    throw new Error(
      'No AI provider available. Configure an endpoint in Settings or deploy to Cloudflare Workers with the AI binding.',
    );
  }

  return createAIModel(aiConfig);
}

// Workers AI binding type stub (avoids requiring @cloudflare/workers-types).
interface Ai {
  run(model: string, inputs: unknown, options?: unknown): Promise<unknown>;
}
