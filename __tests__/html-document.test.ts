// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { deferPublicDocumentScripts, ensureLeadingHtmlDoctype } from '../html-document.mjs';

const encoder = new TextEncoder();
const decode = (body: Uint8Array) => new TextDecoder().decode(body);

describe('anonymous cached HTML standards mode', () => {
  it('moves the doctype ahead of Next inlineCss polyfills without losing script or content', () => {
    const script = '<script src="/_next/static/chunks/polyfills.js" noModule=""></script>';
    const document = '<!DOCTYPE html><html><head></head><body>Résumé</body></html>';
    const result = decode(ensureLeadingHtmlDoctype(encoder.encode(script + document)));
    expect(result).toBe(`<!DOCTYPE html>${script}${document.slice(15)}`);
    expect(result.match(/<!DOCTYPE html>/g)).toHaveLength(1);
  });
  it('preserves normal documents and does not invent a doctype or move arbitrary content', () => {
    for (const html of [
      '<!DOCTYPE html><html><body>Normal</body></html>',
      '<html><body>No declaration</body></html>',
      '<p>Other prefix</p><!DOCTYPE html><html></html>',
    ]) {
      const original = encoder.encode(html);
      expect(ensureLeadingHtmlDoctype(original)).toBe(original);
    }
  });
});

describe('public document hydration scheduling', () => {
  it('defers only async Next chunks and preserves inline Flight, content and other scripts', () => {
    const html =
      '<!DOCTYPE html><p>Résumé</p>' +
      '<script src="/_next/static/chunks/runtime.js" async=""></script>' +
      '<script src="/_next/static/chunks/client.js" async></script>' +
      '<script>self.__next_f.push([1,"content"])</script>' +
      '<script src="/other.js" async=""></script>' +
      '<script src="/_next/static/chunks/polyfills.js" noModule=""></script>';
    for (const route of ['/pricing', '/tools']) {
      expect(decode(deferPublicDocumentScripts(encoder.encode(html), route))).toBe(
        html
          .replace('runtime.js" async=""', 'runtime.js" defer')
          .replace('client.js" async', 'client.js" defer')
      );
    }
  });
  it('leaves every other route byte-identical', () => {
    const body = encoder.encode('<script src="/_next/static/chunks/client.js" async></script>');
    for (const route of ['/', '/jobs', '/resume-builder', '/tools/keywords', '/pricing/other']) {
      expect(deferPublicDocumentScripts(body, route)).toBe(body);
    }
  });
});
