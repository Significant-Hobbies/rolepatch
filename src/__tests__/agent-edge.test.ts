import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { markdownPathForSurface, PUBLIC_SURFACES } from '../../public-surfaces.mjs';
import { handleRolePatchAgentRoutes } from '../../rolepatch-agent-routes.mjs';
import { publicSourceMarkdown } from '../lib/public-source';
const serve = (request: Request) => handleRolePatchAgentRoutes(request, publicSourceMarkdown);
import sitemap from '../app/sitemap';

const ORIGIN = 'https://preview.rolepatch.test';

function request(path: string, accept?: string) {
  return new Request(new URL(path, ORIGIN), {
    headers: accept ? { accept } : undefined,
  });
}

describe('RolePatch agent surfaces', () => {
  it('links the documented surface template to a real catalog example', () => {
    const docs = readFileSync('src/components/public-docs.tsx', 'utf8');
    expect(docs).toContain("'/api/public/v1/surfaces/home'");
    expect(PUBLIC_SURFACES.some((surface) => surface.id === 'home')).toBe(true);
    expect(docs).toContain('href={href}');
  });

  it('serves truthful Markdown for every cataloged HTML route', async () => {
    for (const surface of PUBLIC_SURFACES) {
      const negotiated = await serve(request(surface.path, 'text/markdown, text/html;q=0.1'));
      expect(negotiated, surface.path).toBeInstanceOf(Response);
      expect(negotiated?.status, surface.path).toBe(200);
      expect(negotiated?.headers.get('content-type'), surface.path).toContain('text/markdown');
      expect(await negotiated?.text(), surface.path).toMatch(/# .+/);

      const markdownPath = markdownPathForSurface(surface.path);
      const explicit = await serve(request(markdownPath));
      expect(explicit, markdownPath).toBeInstanceOf(Response);
      expect(explicit?.status, markdownPath).toBe(200);
      expect(explicit?.headers.get('content-type'), markdownPath).toContain('text/markdown');
    }
  });

  it('catalogs every public surface with same-origin readable Markdown', async () => {
    const response = await serve(request('/api/ai'));
    expect(response).toBeInstanceOf(Response);
    expect(response?.headers.get('content-type')).toContain('application/json');

    const catalog = await response?.json();
    expect(catalog.surfaces).toHaveLength(PUBLIC_SURFACES.length);

    for (const surface of catalog.surfaces) {
      expect(new URL(surface.url).origin).toBe('https://rolepatch.com');
      expect(new URL(surface.md).origin).toBe('https://rolepatch.com');

      const markdown = await serve(request(new URL(surface.md).pathname));
      expect(markdown?.status, surface.id).toBe(200);
      expect(markdown?.headers.get('content-type'), surface.id).toContain('text/markdown');
    }
  });

  it('keeps every cataloged HTML route in the canonical sitemap', () => {
    const sitemapUrls = new Set(sitemap().map((entry) => new URL(entry.url).pathname));

    for (const surface of PUBLIC_SURFACES) {
      expect(sitemapUrls.has(surface.path), surface.path).toBe(true);
    }

    expect(sitemapUrls).toHaveLength(PUBLIC_SURFACES.length);
    expect(sitemapUrls).not.toContain('/llms.txt');
    expect(sitemapUrls).not.toContain('/index.md');
    expect(sitemapUrls).not.toContain('/api/ai');
  });

  it('serves the catalog itself as Markdown when negotiated', async () => {
    const response = await serve(request('/api/ai', 'text/markdown, application/json;q=0.1'));
    expect(response?.status).toBe(200);
    expect(response?.headers.get('content-type')).toContain('text/markdown');
    expect(await response?.text()).toContain('# RolePatch public agent catalog');
  });

  it('never falls through to HTML for an unknown Markdown path', async () => {
    const response = await serve(request('/missing.md'));
    expect(response?.status).toBe(404);
    expect(response?.headers.get('content-type')).toContain('text/markdown');
  });

  it('leaves ordinary HTML requests to the application', async () => {
    expect(await serve(request('/pricing', 'text/html'))).toBeNull();
  });
});
