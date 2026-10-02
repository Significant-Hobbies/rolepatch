import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import {
  documentCacheRequest,
  isDocumentRequest,
  DOCUMENT_CLIENT_CACHE_CONTROL,
} from '../html-cache.mjs';

describe('build-scoped marketing HTML cache', () => {
  it('cannot reuse old HTML when a new build removes the old chunks', async () => {
    const request = new Request('https://rolepatch.com/pricing?plan=guest');
    const assets = (buildId: string) => ({ fetch: vi.fn(async () => new Response(buildId)) });
    const oldKey = await documentCacheRequest(request, assets('old-build'));
    const newKey = await documentCacheRequest(request, assets('new-build'));
    expect(oldKey?.url).toBe(
      'https://rolepatch.com/__rolepatch_html_cache/old-build/pricing?plan=guest'
    );
    expect(newKey?.url).toBe(
      'https://rolepatch.com/__rolepatch_html_cache/new-build/pricing?plan=guest'
    );
    const cache = new Map([[oldKey?.url, '<script src="old-build.js"></script>']]);
    expect(cache.get(newKey?.url)).toBeUndefined();
  });

  it('reads only public build metadata and retains request conditions', async () => {
    const assets = { fetch: vi.fn(async (_request: Request) => new Response('build-one\n')) };
    const request = new Request('https://rolepatch.com/tools', {
      headers: { 'if-none-match': '"one"', cookie: 'preference=compact' },
    });
    const key = await documentCacheRequest(request, assets);
    expect(assets.fetch.mock.calls[0][0].url).toBe('https://rolepatch.com/BUILD_ID');
    expect(assets.fetch.mock.calls[0][0].headers.has('cookie')).toBe(false);
    expect(key?.headers.get('if-none-match')).toBe('"one"');
  });

  it('bypasses the cache for missing, invalid or unavailable build metadata', async () => {
    const request = new Request('https://rolepatch.com/pricing');
    expect(await documentCacheRequest(request, undefined)).toBeNull();
    for (const response of [
      new Response('', { status: 404 }),
      new Response('<html>fallback</html>'),
      new Response(''),
    ]) {
      expect(await documentCacheRequest(request, { fetch: async () => response })).toBeNull();
    }
    expect(
      await documentCacheRequest(request, {
        fetch: async () => {
          throw new Error('unavailable');
        },
      })
    ).toBeNull();
  });

  it('never serves document HTML to RSC, prefetch or authorization-bearing requests', () => {
    expect(isDocumentRequest(new Request('https://rolepatch.com/tools'))).toBe(true);
    const variants: Record<string, string>[] = [
      { rsc: '1' },
      { 'next-router-prefetch': '1' },
      { 'next-router-state-tree': '[]' },
      { accept: 'text/x-component' },
      { authorization: 'Bearer example' },
    ];
    for (const headers of variants) {
      expect(isDocumentRequest(new Request('https://rolepatch.com/tools', { headers }))).toBe(
        false
      );
    }
    expect(DOCUMENT_CLIENT_CACHE_CONTROL).toBe('public, max-age=0, must-revalidate');
  });

  it('uses the same versioned key for cache reads and writes', () => {
    const worker = readFileSync('worker.mjs', 'utf8');
    expect(worker).toContain('documentCacheRequest(request, env.ASSETS)');
    expect(worker).toContain('cache.match(cacheRequest)');
    expect(worker).toContain('cache.put(cacheRequest, cacheable.clone())');
    expect(worker).not.toContain('cache.match(request)');
  });
});
