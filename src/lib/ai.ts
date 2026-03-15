import { google } from '@ai-sdk/google';

export function getAIModel(modelOverride?: string) {
  const model = modelOverride || process.env.AI_MODEL || 'gemini-2.5-pro';
  return google(model);
}
