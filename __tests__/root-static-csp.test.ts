import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

import nextConfig from '../next.config';
import { CONTENT_SECURITY_POLICY } from '../security-policy.mjs';

const headersFile = readFileSync(join(process.cwd(), 'landing-astro/public/_headers'), 'utf8');
const workerSource = readFileSync(join(process.cwd(), 'worker.mjs'), 'utf8');
const cacheControl = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

type RootWorker = {
  fetch: (
    request: Request,
    env: { ASSETS: { fetch: (request: Request) => Promise<Response> } },
    ctx: { waitUntil: () => void }
  ) => Promise<Response>;
};

// Execute the actual handler with isolated routing dependencies. This verifies
// response behavior in Node; the production build and Cloudflare smoke are
// separate gates for the real static-asset routing and compression runtime.
function loadWorker() {
  const openNextFetch = vi.fn(async () => new Response('Next response'));
  const sandbox = {
    Request,
    Response,
    Headers,
    URL,
    Blob,
    Uint8Array,
    CompressionStream,
    DecompressionStream,
    console,
    openNext: { fetch: openNextFetch },
    withTiming: (handler: RootWorker['fetch']) => handler,
    handleAgentEdge: () => null,
    handleRolePatchAgentRoutes: () => null,
    isDocumentRequest: () => true,
    documentCacheRequest: async () => null,
    DOCUMENT_CLIENT_CACHE_CONTROL: 'unused',
    DOCUMENT_EDGE_CACHE_CONTROL: 'unused',
    CONTENT_SECURITY_POLICY,
    rolePatchWorker: undefined as RootWorker | undefined,
  };
  const executable = workerSource
    .replace(/^import[\s\S]*?;\r?\n/gm, '')
    .replace(/^export \{[\s\S]*?\} from '\.\/\.open-next\/worker\.js';\r?\n/m, '')
    .replace('export default {', 'globalThis.rolePatchWorker = {');
  runInNewContext(executable, sandbox, { timeout: 1000 });
  if (!sandbox.rolePatchWorker) throw new Error('Worker handler was not loaded');
  return { worker: sandbox.rolePatchWorker, openNextFetch };
}

describe('static Astro homepage CSP parity', () => {
  it('matches the intended Next root policy exactly in the static root rule', async () => {
    const routes = await nextConfig.headers?.();
    const rootPolicy = routes
      ?.find((route) => route.source === '/')
      ?.headers.find((header) => header.key === 'Content-Security-Policy')?.value;
    expect(CONTENT_SECURITY_POLICY).toBe(rootPolicy);
    const rootBlock = headersFile.match(/^\/\r?\n((?:[ \t].*(?:\r?\n|$))*)/m)?.[1] ?? '';
    const policies = rootBlock
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('Content-Security-Policy:'));
    expect(policies).toEqual([`Content-Security-Policy: ${rootPolicy}`]);
  });

  it.each(['identity', 'gzip'])(
    'adds the intended policy to a headerless root asset using %s',
    async (encoding) => {
      const { worker, openNextFetch } = loadWorker();
      const assetFetch = vi.fn(
        async () =>
          new Response('<h1>RolePatch</h1>', {
            headers: { 'content-type': 'text/html', etag: 'test-asset' },
          })
      );
      const response = await worker.fetch(
        new Request('https://rolepatch.com/', { headers: { 'accept-encoding': encoding } }),
        { ASSETS: { fetch: assetFetch } },
        { waitUntil: () => {} }
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('content-security-policy')).toBe(CONTENT_SECURITY_POLICY);
      expect(response.headers.get('cache-control')).toBe(cacheControl);
      expect(response.headers.get('etag')).toBe('test-asset');
      expect(response.headers.get('x-edge-cache')).toBe('ASSET');
      expect(openNextFetch).not.toHaveBeenCalled();
      const body =
        encoding === 'gzip'
          ? await new Response(response.body?.pipeThrough(new DecompressionStream('gzip'))).text()
          : await response.text();
      expect(body).toBe('<h1>RolePatch</h1>');
      expect(response.headers.get('content-encoding')).toBe(encoding === 'gzip' ? 'gzip' : null);
    }
  );

  it('preserves an empty 304 revalidation while attaching the same policy', async () => {
    const { worker, openNextFetch } = loadWorker();
    const response = await worker.fetch(
      new Request('https://rolepatch.com/', { headers: { 'if-none-match': 'test-asset' } }),
      {
        ASSETS: {
          fetch: async () => new Response(null, { status: 304, headers: { etag: 'test-asset' } }),
        },
      },
      { waitUntil: () => {} }
    );
    expect(response.status).toBe(304);
    expect(response.headers.get('content-security-policy')).toBe(CONTENT_SECURITY_POLICY);
    expect(response.headers.get('cache-control')).toBe(cacheControl);
    expect(response.headers.get('etag')).toBe('test-asset');
    expect(await response.text()).toBe('');
    expect(openNextFetch).not.toHaveBeenCalled();
  });

  it('leaves non-root and non-GET requests on the existing Next path', async () => {
    for (const [path, method] of [
      ['/pricing', 'GET'],
      ['/', 'POST'],
    ]) {
      const { worker, openNextFetch } = loadWorker();
      const assetFetch = vi.fn(async () => new Response('unexpected'));
      const response = await worker.fetch(
        new Request(`https://rolepatch.com${path}`, { method }),
        { ASSETS: { fetch: assetFetch } },
        { waitUntil: () => {} }
      );
      expect(await response.text()).toBe('Next response');
      expect(response.headers.get('content-security-policy')).toBeNull();
      expect(assetFetch).not.toHaveBeenCalled();
      expect(openNextFetch).toHaveBeenCalledOnce();
    }
  });
});
