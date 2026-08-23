/**
 * Portable agent-edge handler — copy or generate into each product.
 * Spec: foundry/ops/docs/agent-indexing-standard.md
 *
 * Usage in worker.mjs (before openNext.fetch):
 *   import { handleAgentEdge } from './agent-edge.mjs'
 *   const agent = handleAgentEdge(request)
 *   if (agent) return agent
 */

/** @type {{ name: string, url: string, llmsTxt: string, llmsFullTxt?: string, indexMd: string, catalog: object }} */
// biome-ignore format: generated payload from apply-agent-surfaces (JSON keys/quotes)
const AGENT_SURFACE = {
  "name": "RolePatch",
  "url": "https://rolepatch.com",
  "llmsFullTxt": "# RolePatch — full agent brief\n\nAI-powered resume tailoring. Score fit against a job description, rewrite bullets for the role, and prep interviews.\n\n## Index\n\n# RolePatch\n\nAI-powered resume tailoring and job-application assistant.\n\n## What it is\n\n- Score resume fit against a job description\n- Rewrite bullets for the role\n- Cover letters, company research, STAR prep\n\n## Who it's for\n\nJob seekers who want reviewed, role-specific application materials — not generic AI fluff.\n\n## Agent entrypoints\n\n- https://rolepatch.com/llms.txt\n- https://rolepatch.com/api/ai\n- https://rolepatch.com/index.md\n\nDashboard routes require auth and are not agent-indexed.\n\n## Product links\n\n- Home: https://rolepatch.com/ — Product landing\n- Pricing: https://rolepatch.com/pricing — Plans and limits\n- Tools: https://rolepatch.com/tools — Public tools\n\n## Machine surfaces\n\n- https://rolepatch.com/llms.txt\n- https://rolepatch.com/llms-full.txt\n- https://rolepatch.com/api/ai\n- https://rolepatch.com/index.md\n- https://rolepatch.com/sitemap.xml\n- https://rolepatch.com/robots.txt\n\n## Contact\n\n- Owner: https://sarthakagrawal.dev\n- Agent email for directory verification: sarthakagrawal@agentmail.to\n",
  "llmsTxt": "# RolePatch\n\n> AI-powered resume tailoring. Score fit against a job description, rewrite bullets for the role, and prep interviews.\n\n## Product\n\n- [Home](https://rolepatch.com/): Product landing\n- [Pricing](https://rolepatch.com/pricing): Plans and limits\n- [Tools](https://rolepatch.com/tools): Public tools\n\n## When to use this\n\n- Tailoring a resume to a specific job description before applying\n- Scoring fit between a resume and a job posting to prioritize applications\n- Generating role-specific cover letters and STAR interview prep stories\n- Discovering public tools for job seekers (fit scoring, resume analysis)\n\n## Machine surfaces\n\n- [Agent catalog](https://rolepatch.com/api/ai): JSON inventory of public surfaces\n- [OpenAPI spec](https://rolepatch.com/openapi.json): Machine-readable API description\n- [Homepage markdown](https://rolepatch.com/index.md): Product brief without JS\n- [This index](https://rolepatch.com/llms.txt)\n",
  "indexMd": "# RolePatch\n\nAI-powered resume tailoring and job-application assistant.\n\n## What it is\n\n- Score resume fit against a job description\n- Rewrite bullets for the role\n- Cover letters, company research, STAR prep\n\n## Who it's for\n\nJob seekers who want reviewed, role-specific application materials — not generic AI fluff.\n\n## Agent entrypoints\n\n- https://rolepatch.com/llms.txt\n- https://rolepatch.com/api/ai\n- https://rolepatch.com/index.md\n\nDashboard routes require auth and are not agent-indexed.\n",
  "catalog": {
    "name": "RolePatch",
    "version": "1",
    "url": "https://rolepatch.com",
    "llms": "https://rolepatch.com/llms.txt",
    "llmsFull": "https://rolepatch.com/llms-full.txt",
    "sitemap": "https://rolepatch.com/sitemap.xml",
    "robots": "https://rolepatch.com/robots.txt",
    "openapi": "https://rolepatch.com/openapi.json",
    "markdown": {
      "suffix": ".md",
      "negotiation": true
    },
    "surfaces": [
      {
        "id": "home",
        "url": "https://rolepatch.com/",
        "md": "https://rolepatch.com/index.md",
        "kind": "static",
        "description": "Product home"
      },
      {
        "id": "pricing",
        "url": "https://rolepatch.com/pricing",
        "md": null,
        "kind": "static",
        "description": "Plans and limits"
      },
      {
        "id": "tools",
        "url": "https://rolepatch.com/tools",
        "md": null,
        "kind": "static",
        "description": "Public tools"
      }
    ],
    "auth": {
      "public": true,
      "notes": "Auth-walled app routes are not agent-indexed unless listed here."
    }
  }
};

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'RolePatch public API',
    version: '1.0.0',
    description:
      'RolePatch is an AI-powered resume tailoring and job-application assistant. The public web API exposes read-only agent surfaces: the agent catalog, llms.txt, sitemap, and markdown alternates.',
    contact: { name: 'RolePatch', url: 'https://rolepatch.com' },
  },
  servers: [{ url: 'https://rolepatch.com' }],
  tags: [{ name: 'agent-surfaces', description: 'Machine-readable public surfaces' }],
  paths: {
    '/api/ai': {
      get: {
        operationId: 'getAgentCatalog',
        tags: ['agent-surfaces'],
        summary: 'Agent catalog',
        description:
          'JSON inventory of public agent surfaces: llms.txt, llms-full.txt, sitemap, robots, and per-page markdown alternates.',
        responses: {
          200: {
            description: 'Agent catalog',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AgentCatalog' } },
            },
          },
        },
      },
    },
    '/llms.txt': {
      get: {
        operationId: 'getLlmsTxt',
        tags: ['agent-surfaces'],
        summary: 'llms.txt index',
        description: 'Compact agent index following the llms.txt convention.',
        responses: { 200: { description: 'Markdown index', content: { 'text/plain': {} } } },
      },
    },
    '/llms-full.txt': {
      get: {
        operationId: 'getLlmsFullTxt',
        tags: ['agent-surfaces'],
        summary: 'Full agent brief',
        description:
          'Full canonical agent brief with product, architecture, and surface inventory.',
        responses: { 200: { description: 'Markdown brief', content: { 'text/plain': {} } } },
      },
    },
    '/sitemap.xml': {
      get: {
        operationId: 'getSitemap',
        tags: ['agent-surfaces'],
        summary: 'Sitemap',
        responses: { 200: { description: 'XML sitemap', content: { 'application/xml': {} } } },
      },
    },
    '/openapi.json': {
      get: {
        operationId: 'getOpenApiSpec',
        tags: ['agent-surfaces'],
        summary: 'OpenAPI specification',
        description: 'This document.',
        responses: {
          200: { description: 'OpenAPI 3.1 spec', content: { 'application/json': {} } },
        },
      },
    },
  },
  components: {
    schemas: {
      AgentCatalog: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          llms: { type: 'string', format: 'uri' },
          llmsFull: { type: 'string', format: 'uri' },
          sitemap: { type: 'string', format: 'uri' },
          robots: { type: 'string', format: 'uri' },
          openapi: { type: 'string', format: 'uri' },
          markdown: {
            type: 'object',
            properties: {
              suffix: { type: 'string' },
              negotiation: { type: 'boolean' },
            },
          },
          surfaces: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                url: { type: 'string', format: 'uri' },
                md: { type: 'string', format: 'uri', nullable: true },
                kind: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

function markdown404(pathname, origin) {
  const body = `# 404 — Not Found

\`${pathname}\` does not exist on ${origin}.

## Where to look next

- [Home](${origin}/)
- [Sitemap](${origin}/sitemap.xml)
- [Agent index](${origin}/llms.txt)
- [Full agent brief](${origin}/llms-full.txt)
- [Agent catalog (JSON)](${origin}/api/ai)
`;
  return new Response(body, {
    status: 404,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

/**
 * @param {Request} request
 * @returns {Response | null}
 */
export function handleAgentEdge(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const path = url.pathname === '' ? '/' : url.pathname;

  // /openapi.json — serve the spec directly.
  if (path === '/openapi.json' || path === '/openapi.yaml') {
    return new Response(JSON.stringify(OPENAPI_SPEC, null, 2), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=3600',
      },
    });
  }

  if (path === '/llms.txt') {
    return text(AGENT_SURFACE.llmsTxt, 'text/plain; charset=utf-8');
  }
  if (path === '/llms-full.txt' && AGENT_SURFACE.llmsFullTxt) {
    return text(AGENT_SURFACE.llmsFullTxt, 'text/plain; charset=utf-8');
  }
  if (path === '/index.md') {
    return text(AGENT_SURFACE.indexMd, 'text/markdown; charset=utf-8');
  }
  if (path === '/api/ai') {
    // Re-bind origin so preview/custom domains stay correct
    const catalog = {
      ...AGENT_SURFACE.catalog,
      url: url.origin,
      llms: `${url.origin}/llms.txt`,
      llmsFull: `${url.origin}/llms-full.txt`,
      sitemap: AGENT_SURFACE.catalog.sitemap
        ? String(AGENT_SURFACE.catalog.sitemap).replace(AGENT_SURFACE.url, url.origin)
        : `${url.origin}/sitemap.xml`,
      openapi: `${url.origin}/openapi.json`,
      surfaces: (AGENT_SURFACE.catalog.surfaces || []).map((s) => ({
        ...s,
        url: s.url ? String(s.url).replace(AGENT_SURFACE.url, url.origin) : s.url,
        md: s.md ? String(s.md).replace(AGENT_SURFACE.url, url.origin) : s.md,
      })),
    };
    return json(catalog);
  }

  // Homepage markdown negotiation
  if ((path === '/' || path === '') && wantsMarkdown(request)) {
    return text(AGENT_SURFACE.indexMd, 'text/markdown; charset=utf-8', {
      Link: '</index.md>; rel="alternate"; type="text/markdown"',
      Vary: 'Accept, Accept-Encoding',
    });
  }

  // Agent-friendly 404: return a markdown recovery body for unknown paths
  // when the client asks for markdown.
  if (wantsMarkdown(request) && !path.includes('.') && !path.startsWith('/api/')) {
    return markdown404(path, url.origin);
  }

  return null;
}

function wantsMarkdown(request) {
  const accept = (request.headers.get('accept') || '').toLowerCase();
  if (!accept.includes('text/markdown')) return false;
  if (!accept.includes('text/html')) return true;
  return accept.indexOf('text/markdown') < accept.indexOf('text/html');
}

function text(body, type, extra = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=300',
      ...extra,
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
