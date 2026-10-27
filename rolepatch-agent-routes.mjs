import { createAgentSurfaceHandler } from './src/lib/agent-surfaces/handler.mjs';
import { markdownResponse, wantsMarkdown } from './src/lib/agent-surfaces/http.mjs';
import { publicRobots } from './public-readability-policy.mjs';
import { markdownPathForSurface, PUBLIC_SURFACES } from './public-surfaces.mjs';

function buildCatalog(origin) {
  return {
    name: 'RolePatch',
    version: '1',
    url: origin,
    description:
      'Evidence-bound resume tailoring and a review-first application workspace for one specific job.',
    llms: `${origin}/llms.txt`,
    llmsFull: `${origin}/llms-full.txt`,
    sitemap: `${origin}/sitemap.xml`,
    robots: `${origin}/robots.txt`,
    openapi: `${origin}/openapi.json`,
    markdown: {
      suffix: '.md',
      negotiation: true,
      direct: `${origin}/api/md/{path}`,
      catalog: `${origin}/api/md/_catalog`,
    },
    surfaces: PUBLIC_SURFACES.map((surface) => ({
      id: surface.id,
      url: new URL(surface.path, origin).toString(),
      md: new URL(markdownPathForSurface(surface.path), origin).toString(),
      kind: 'static',
      description: surface.description,
    })),
    auth: {
      public: true,
      notes:
        'Only the cataloged pages are public agent surfaces. User-specific app and API routes are excluded.',
    },
  };
}

function renderCatalogMarkdown(origin) {
  const rows = PUBLIC_SURFACES.map((surface) => {
    const page = new URL(surface.path, origin).toString();
    const markdown = new URL(markdownPathForSurface(surface.path), origin).toString();
    return `- [${surface.title}](${page}) — [Markdown](${markdown})`;
  }).join('\n');

  return `# RolePatch public agent catalog

The JSON representation is available from this URL when requested without a Markdown Accept header.

## Public surfaces

${rows}

## Discovery

- [LLM index](${origin}/llms.txt)
- [Full agent brief](${origin}/llms-full.txt)
- [Sitemap](${origin}/sitemap.xml)
- [Robots policy](${origin}/robots.txt)
`;
}

export async function handleRolePatchAgentRoutes(request, loadMarkdown) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return null;
  const manifest = {
    name: 'RolePatch',
    origin: 'https://rolepatch.com',
    summary: PUBLIC_SURFACES[0].description,
    openapi: 'https://rolepatch.com/openapi.json',
    pages: {},
    catalog: buildCatalog('https://rolepatch.com'),
    negotiation: true,
    trainingAllowed: true,
    excludedPaths: [
      '/api',
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
    ],
  };
  const path = new URL(request.url).pathname;
  if (path === '/robots.txt' && ['GET', 'HEAD'].includes(request.method))
    return new Response(request.method === 'HEAD' ? null : publicRobots(), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  if (path === '/api/ai.md' || (path === '/api/ai' && wantsMarkdown(request)))
    return markdownResponse(renderCatalogMarkdown(manifest.origin), request, {
      'Content-Location': `${manifest.origin}/api/ai`,
    });
  const handle = createAgentSurfaceHandler({
    manifest,
    listMarkdownRoutes: () => PUBLIC_SURFACES.map((surface) => ({ ...surface, kind: 'static' })),
    loadMarkdown,
  });
  let response;
  try {
    response = await handle(request);
  } catch (error) {
    console.error(
      'Public Markdown rendering failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
    const unavailable = markdownResponse('# Markdown temporarily unavailable\n', request, {
      'Cache-Control': 'no-store',
    });
    return new Response(unavailable.body, { status: 503, headers: unavailable.headers });
  }
  if (response) return response;
  if (!path.startsWith('/api/') && wantsMarkdown(request) && !/\.[a-z0-9]+$/i.test(path))
    return new Response(
      request.method === 'HEAD' ? null : '# Not found\n\nNo public document exists at this path.\n',
      {
        status: 404,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, follow',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  return null;
}
