// @vitest-environment node
import { brotliDecompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { encodePublicHtmlResponse } from '../html-encoding.mjs';

const html = '<!DOCTYPE html><html><body>Résumé — all meaningful content.</body></html>';
const response = () =>
  new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-length': String(Buffer.byteLength(html)),
      etag: '"document"',
      vary: 'RSC',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });

describe('public HTML content encoding', () => {
  it('round-trips every decoded byte and retains cache and variant headers', async () => {
    const encoded = await encodePublicHtmlResponse(
      response(),
      new Request('https://rolepatch.com/pricing', {
        headers: { 'accept-encoding': 'gzip, deflate, br' },
      })
    );
    expect(encoded.headers.get('content-encoding')).toBe('br');
    expect(encoded.headers.get('content-length')).toBeNull();
    expect(encoded.headers.get('vary')).toBe('RSC, Accept-Encoding');
    expect(encoded.headers.get('etag')).toBe('W/"document"');
    expect(encoded.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate');
    expect(brotliDecompressSync(Buffer.from(await encoded.arrayBuffer()))).toEqual(
      Buffer.from(html)
    );
  });
  it('honors identity, q=0 and higher gzip preference', async () => {
    for (const accept of ['', 'gzip', 'br;q=0, gzip', 'br;q=0.5, gzip;q=1']) {
      const original = response();
      expect(
        await encodePublicHtmlResponse(
          original,
          new Request('https://rolepatch.com/tools', { headers: { 'accept-encoding': accept } })
        )
      ).toBe(original);
      expect(await original.text()).toBe(html);
    }
  });
  it('leaves other routes, mutations, errors and existing encodings alone', async () => {
    for (const [path, method] of [
      ['/resume-builder', 'GET'],
      ['/tools', 'POST'],
    ]) {
      const original = response();
      expect(
        await encodePublicHtmlResponse(
          original,
          new Request('https://rolepatch.com' + path, {
            method,
            headers: { 'accept-encoding': 'br' },
          })
        )
      ).toBe(original);
    }
    for (const original of [
      new Response('error', { status: 500 }),
      new Response('already encoded', {
        headers: { 'content-type': 'text/html', 'content-encoding': 'gzip' },
      }),
    ])
      expect(
        await encodePublicHtmlResponse(
          original,
          new Request('https://rolepatch.com/pricing', { headers: { 'accept-encoding': 'br' } })
        )
      ).toBe(original);
  });
});
