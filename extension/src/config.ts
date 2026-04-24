// Runtime config for the extension. API base is stored in chrome.storage so
// users can point the extension at localhost or prod without rebuilding.
export const DEFAULT_API_BASE = 'http://localhost:3000';
export const STORAGE_KEY_API_BASE = 'rolepatch_api_base';
export const TAILOR_ENDPOINT = '/api/extension/tailor';

export async function getApiBase(): Promise<string> {
  const stored = await chrome.storage.sync.get(STORAGE_KEY_API_BASE);
  const value = stored[STORAGE_KEY_API_BASE];
  return typeof value === 'string' && value.length > 0 ? value : DEFAULT_API_BASE;
}

export async function setApiBase(base: string): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY_API_BASE]: base });
}
