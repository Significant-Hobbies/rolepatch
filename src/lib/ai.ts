// Wrapper that prefers Cloudflare Workers AI binding (free 10k Neurons/day)
// and falls back to the user-configured external OpenAI-compatible endpoint.
export { getAIModel } from './ai-cloudflare';
