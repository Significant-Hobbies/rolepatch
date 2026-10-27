import { gzipSync, gunzipSync } from 'node:zlib';
import { afterEach, expect, test, vi } from 'vitest';
import { withPublicReadability } from '../../public-readability-policy.mjs';

afterEach(() => vi.unstubAllGlobals());
const html =
  '<!doctype html><html><head><link rel="alternate" type="text/markdown" href="/index.md"><meta name="ai-summary" content="Public home"></head><body>Public home</body></html>';

test('compressed homepage keeps its bytes and advertises discovery without parsing gzip', async () => {
  const rewrite = vi.fn(() => {
    throw new Error('Encoded HTML must not be parsed');
  });
  vi.stubGlobal('HTMLRewriter', rewrite);
  const encoded = gzipSync(html);
  const handle = withPublicReadability(
    async () =>
      new Response(encoded, {
        headers: {
          'content-type': 'text/html',
          'content-encoding': 'gzip',
          'content-length': String(encoded.length),
        },
      })
  );
  const response = await handle(new Request('https://rolepatch.com/'), {}, {});
  expect(Buffer.from(await response.arrayBuffer())).toEqual(encoded);
  expect(gunzipSync(encoded).toString()).toBe(html);
  expect(response.headers.get('content-encoding')).toBe('gzip');
  expect(response.headers.get('link')).toContain('https://rolepatch.com/index.md');
  expect(response.headers.get('vary')).toContain('Accept');
  expect(response.headers.has('content-length')).toBe(false);
  expect(rewrite).not.toHaveBeenCalled();
});

test('HEAD has no body and unrelated, non-HTML, or non-200 responses pass through', async () => {
  const response = new Response(html, { headers: { 'content-type': 'text/html' } });
  const head = await withPublicReadability(async () => response)(
    new Request('https://rolepatch.com/', { method: 'HEAD' }),
    {},
    {}
  );
  expect(await head.text()).toBe('');
  expect(head.headers.get('link')).toContain('text/markdown');
  for (const [path, status, type] of [
    ['/dashboard', 200, 'text/html'],
    ['/', 404, 'text/html'],
    ['/', 200, 'application/json'],
  ] as const) {
    const original = new Response('payload', { status, headers: { 'content-type': type } });
    expect(
      await withPublicReadability(async () => original)(
        new Request(`https://rolepatch.com${path}`),
        {},
        {}
      )
    ).toBe(original);
  }
});

test('identity HTML replaces old metadata and preserves the body', async () => {
  const selectors: string[] = [];
  let added = '';
  const removed = vi.fn();
  class Rewriter {
    on(selector: string, handler: { element: (element: object) => void }) {
      selectors.push(selector);
      handler.element({
        remove: removed,
        append: (text: string) => {
          added = text;
        },
      });
      return this;
    }
    transform(response: Response) {
      return response;
    }
  }
  vi.stubGlobal('HTMLRewriter', Rewriter);
  const response = await withPublicReadability(
    async () => new Response(html, { headers: { 'content-type': 'text/html' } })
  )(new Request('https://rolepatch.com/'), {}, {});
  expect(selectors).toEqual([
    'link[rel="alternate"][type="text/markdown"]',
    'meta[name="ai-summary"]',
    'head',
  ]);
  expect(removed).toHaveBeenCalledTimes(2);
  expect(added).toContain('https://rolepatch.com/index.md');
  expect(added).toContain('name="ai-summary"');
  expect(await response.text()).toBe(html);
});
