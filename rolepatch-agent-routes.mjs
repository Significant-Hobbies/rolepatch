import {
  markdownPathForSurface,
  PUBLIC_SURFACES,
  renderSurfaceMarkdown,
} from './public-surfaces.mjs';

const surfaceByPath = new Map(PUBLIC_SURFACES.map((surface) => [surface.path, surface]));
const surfaceByMarkdownPath = new Map(
  PUBLIC_SURFACES.map((surface) => [markdownPathForSurface(surface.path), surface])
);

function buildCatalog(origin) {
  return {
    name: 'RolePatch',
    version: '1',
    url: origin,
    llms: `${origin}/llms.txt`,
    llmsFull: `${origin}/llms-full.txt`,
    sitemap: `${origin}/sitemap.xml`,
    robots: `${origin}/robots.txt`,
    markdown: {
      suffix: '.md',
      negotiation: true,
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

/**
 * RolePatch-specific public route coverage that runs before the generated
 * Fleet discovery handler. Keeping this separate means registry refreshes can
 * safely regenerate agent-edge.mjs without deleting curated route Markdown.
 *
 * @param {Request} request
 * @returns {Response | null}
 */
export function handleRolePatchAgentRoutes(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  if (path === '/api/ai') {
    if (wantsMarkdown(request)) {
      return markdown(renderCatalogMarkdown(url.origin), '/api/ai.md');
    }
    return json(buildCatalog(url.origin));
  }
  if (path === '/api/ai.md') {
    return markdown(renderCatalogMarkdown(url.origin), '/api/ai.md');
  }

  const explicitSurface = surfaceByMarkdownPath.get(path);
  if (explicitSurface) {
    return markdown(renderSurfaceMarkdown(explicitSurface, url.origin), path);
  }
  if (path.endsWith('.md')) {
    return text(
      `# Not found\n\nNo public RolePatch Markdown surface exists at ${path}.\n`,
      'text/markdown; charset=utf-8',
      { status: 404 }
    );
  }

  if (wantsMarkdown(request)) {
    const surface = surfaceByPath.get(path);
    if (surface) {
      return markdown(
        renderSurfaceMarkdown(surface, url.origin),
        markdownPathForSurface(surface.path)
      );
    }
  }

  return null;
}

function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function wantsMarkdown(request) {
  const accept = (request.headers.get('accept') || '').toLowerCase();
  if (!accept.includes('text/markdown')) return false;
  if (!accept.includes('text/html')) return true;
  return accept.indexOf('text/markdown') < accept.indexOf('text/html');
}

function markdown(body, alternatePath) {
  return text(body, 'text/markdown; charset=utf-8', {
    Link: `<${alternatePath}>; rel="alternate"; type="text/markdown"`,
    Vary: 'Accept',
  });
}

function text(body, type, extra = {}) {
  const { status = 200, ...headers } = extra;
  return new Response(body, {
    status,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=300',
      ...headers,
    },
  });
}

function json(data) {
  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
