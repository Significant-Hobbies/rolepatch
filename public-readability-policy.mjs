import { PUBLIC_SURFACES, markdownPathForSurface } from './public-surfaces.mjs';
import { discoveryLinkHeader } from './src/lib/agent-surfaces/handler.mjs';

const origin = 'https://rolepatch.com';
export const privatePaths = [
  '/api/',
  '/dashboard',
  '/jobs',
  '/evidence',
  '/resume-builder',
  '/editor',
  '/tailor',
  '/cover-letter',
  '/library',
  '/login',
  '/settings',
];
export const publicCrawlers = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
];
export function publicRobots() {
  return `${[...['*', ...publicCrawlers].map((agent) => `User-agent: ${agent}\nAllow: /\nAllow: /api/ai\nAllow: /api/md\n${privatePaths.map((path) => `Disallow: ${path}`).join('\n')}`), `Sitemap: ${origin}/sitemap.xml`].join('\n\n')}\n`;
}
export function withPublicReadability(next) {
  return async (request, env, ctx) => {
    const response = await next(request, env, ctx);
    const path = new URL(request.url).pathname.replace(/\/$/, '') || '/';
    const surface = PUBLIC_SURFACES.find((item) => item.path === path);
    if (
      !surface ||
      response.status !== 200 ||
      !response.headers.get('Content-Type')?.includes('text/html')
    )
      return response;
    const headers = new Headers(response.headers);
    headers.append('Vary', 'Accept');
    headers.append(
      'Link',
      `<${origin}${markdownPathForSurface(path)}>; rel="alternate"; type="text/markdown", ${discoveryLinkHeader(origin)}`
    );
    headers.delete('Content-Length');
    if (request.method === 'HEAD') return new Response(null, { status: response.status, headers });
    return new globalThis.HTMLRewriter()
      .on('link[rel="alternate"][type="text/markdown"]', {
        element(element) {
          element.remove();
        },
      })
      .on('meta[name="ai-summary"]', {
        element(element) {
          element.remove();
        },
      })
      .on('head', {
        element(element) {
          element.append(
            `<link rel="alternate" type="text/markdown" href="${origin}${markdownPathForSurface(path)}"><meta name="ai-summary" content="${surface.description.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">`,
            { html: true }
          );
        },
      })
      .transform(new Response(response.body, { status: response.status, headers }));
  };
}
