// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ensureLeadingHtmlDoctype } from '../html-document.mjs';

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
