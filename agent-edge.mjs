/**
 * RolePatch public discovery handler. Curated per-route Markdown is owned by
 * rolepatch-agent-routes.mjs; this module owns the compact indexes and OpenAPI.
 */

import { markdownPathForSurface, PUBLIC_SURFACES } from './public-surfaces.mjs';

const CANONICAL_ORIGIN = 'https://rolepatch.com';

const INDEX_MD = `# RolePatch

RolePatch is a web app for preparing a serious application to a specific job. It reads the job description, matches its requirements against evidence already supplied by the candidate, and proposes a resume patch for review.

## Evidence rule

The base resume, project stash, and achievement bank are the permitted sources for employer-facing claims. RolePatch may reorder, tighten, or reframe that evidence. It must not add an unsupported skill, tool, employer, metric, scope, role, or accomplishment. An unsupported requirement remains a visible gap.

## Workflow

1. Bring one job description and a base resume.
2. Compare the role's requirements with supplied evidence.
3. Inspect the proposed wording and its word-level diff.
4. Accept, edit, or omit each meaningful change.
5. Use accepted evidence for supporting materials or a reviewed application packet.

## Application assistance

RolePatch can queue a job, prepare a packet, fill supported ATS fields after a user action, and save receipts. CAPTCHA, missing required answers, outstanding file selection, and ambiguous submit states stop the flow. It does not perform unattended bulk submission or bypass human verification.

## Access and pricing

- Guest records can stay in the current browser.
- Google sign-in adds D1-backed account persistence and three starting tokens.
- Signed-in AI operations debit tokens; packs are 10 for $5, 30 for $12, and 100 for $30, with no subscription.
- Public ATS, keyword, bullet, diff, snippet, and word-count tools work without sign-up.

## Current state

RolePatch is live and maintained. Owner-led validation against new real applications is paused because its maker is not currently job hunting. No independently completed live token purchase or broad outcome study is claimed here.

User-specific dashboard and API routes are not public agent surfaces.
`;

const LLMS_TXT = `# RolePatch

> Evidence-bound resume tailoring for a serious application to one specific job. RolePatch may reframe supplied proof, but it must not invent a skill, metric, employer, tool, or accomplishment.

## When to use RolePatch

- Matching a job description against a base resume, project stash, and achievement evidence
- Reviewing a proposed resume patch before accepting it
- Preparing supporting materials from the same supplied proof
- Queueing, reviewed ATS fill, and blocked, failed, or successful receipts

## Boundaries

- No invented qualifications or unsupported claims
- No universal hiring prediction
- No unattended bulk submission, CAPTCHA bypass, or automatic file upload

## Access

- Guest records can stay in the current browser
- Google sign-in adds account persistence and three starting tokens
- Signed-in AI operations use tokens; packs are 10 for $5, 30 for $12, and 100 for $30
- Public browser-local resume tools work without sign-up

## Discovery

- [Home](${CANONICAL_ORIGIN}/)
- [Pricing](${CANONICAL_ORIGIN}/pricing)
- [Free tools](${CANONICAL_ORIGIN}/tools)
- [FAQ](${CANONICAL_ORIGIN}/faq)
- [Public catalog](${CANONICAL_ORIGIN}/api/ai)
- [OpenAPI](${CANONICAL_ORIGIN}/openapi.json)
- [Product brief](${CANONICAL_ORIGIN}/index.md)

User-specific dashboard and API routes are not public agent surfaces.
`;

const LLMS_FULL_TXT = `# RolePatch — full agent brief

RolePatch is an evidence-bound resume tailoring and review-first job application workspace for job seekers preparing a serious application to one specific role.

${INDEX_MD}

## Public surfaces

Every cataloged HTML route has a same-origin Markdown alternate. Read the complete inventory at ${CANONICAL_ORIGIN}/api/ai or the sitemap at ${CANONICAL_ORIGIN}/sitemap.xml.
`;

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
    markdown: { suffix: '.md', negotiation: true },
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
        'Only cataloged pages are public agent surfaces. User-specific app and API routes are excluded.',
    },
  };
}

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'RolePatch public discovery API',
    version: '1.0.0',
    description:
      'Read-only discovery for an evidence-bound resume tailoring and review-first application product. This is not an application-submission API.',
    contact: { name: 'RolePatch', url: CANONICAL_ORIGIN },
  },
  'x-versioning-policy':
    'This discovery contract uses semantic info.version values. Breaking changes publish a new major version and retain the previous contract for at least 90 days with Deprecation and Sunset response headers.',
  servers: [{ url: CANONICAL_ORIGIN }],
  tags: [{ name: 'discovery', description: 'Machine-readable public product surfaces' }],
  paths: {
    '/api/ai': discoveryPath('getAgentCatalog', 'Complete public catalog', 'application/json'),
    '/api/public/v1/surfaces/{id}': {
      get: {
        operationId: 'getPublicSurface',
        tags: ['discovery'],
        summary: 'Look up one public RolePatch surface',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Stable surface id from the public catalog.',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Public surface',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PublicSurface' } },
            },
          },
          404: {
            description: 'No public surface uses that id.',
            content: {
              'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } },
            },
          },
        },
      },
    },
    '/llms.txt': discoveryPath('getLlmsTxt', 'Compact LLM index', 'text/plain'),
    '/llms-full.txt': discoveryPath('getLlmsFullTxt', 'Full LLM product brief', 'text/plain'),
    '/index.md': discoveryPath(
      'getProductBrief',
      'Canonical Markdown product brief',
      'text/markdown'
    ),
    '/sitemap.xml': discoveryPath('getSitemap', 'Public XML sitemap', 'application/xml'),
    '/openapi.json': discoveryPath('getOpenApiSpec', 'This OpenAPI document', 'application/json'),
  },
};

function discoveryPath(operationId, summary, contentType) {
  const schema =
    contentType === 'application/json'
      ? operationId === 'getAgentCatalog'
        ? { $ref: '#/components/schemas/AgentCatalog' }
        : { type: 'object', additionalProperties: true }
      : { type: 'string' };
  return {
    get: {
      operationId,
      tags: ['discovery'],
      summary,
      responses: {
        200: { description: summary, content: { [contentType]: { schema } } },
        404: {
          description: 'The requested discovery surface does not exist.',
          content: {
            'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } },
          },
        },
      },
    },
  };
}

OPENAPI_SPEC.components = {
  schemas: {
    AgentCatalog: {
      type: 'object',
      required: ['name', 'version', 'url', 'llms', 'surfaces'],
      properties: {
        name: { type: 'string' },
        version: { type: 'string' },
        url: { type: 'string', format: 'uri' },
        description: { type: 'string' },
        llms: { type: 'string', format: 'uri' },
        llmsFull: { type: 'string', format: 'uri' },
        sitemap: { type: 'string', format: 'uri' },
        robots: { type: 'string', format: 'uri' },
        openapi: { type: 'string', format: 'uri' },
        markdown: {
          type: 'object',
          required: ['suffix', 'negotiation'],
          properties: {
            suffix: { type: 'string' },
            negotiation: { type: 'boolean' },
          },
        },
        surfaces: {
          type: 'array',
          items: { $ref: '#/components/schemas/PublicSurface' },
        },
      },
    },
    PublicSurface: {
      type: 'object',
      required: ['id', 'url', 'md', 'kind', 'description'],
      properties: {
        id: { type: 'string' },
        url: { type: 'string', format: 'uri' },
        md: { type: 'string', format: 'uri' },
        kind: { type: 'string', const: 'static' },
        description: { type: 'string' },
      },
    },
    Problem: {
      type: 'object',
      required: ['type', 'title', 'status', 'code', 'detail'],
      properties: {
        type: { type: 'string', format: 'uri' },
        title: { type: 'string' },
        status: { type: 'integer' },
        code: { type: 'string' },
        detail: { type: 'string' },
        resolution: { type: 'string' },
      },
    },
  },
};

function markdown404(pathname, origin) {
  return response(
    `# 404 — Not Found\n\n\`${pathname}\` does not exist on ${origin}.\n\n- [Home](${origin}/)\n- [Sitemap](${origin}/sitemap.xml)\n- [Agent index](${origin}/llms.txt)\n- [Public catalog](${origin}/api/ai)\n`,
    'text/markdown; charset=utf-8',
    { status: 404, 'Cache-Control': 'no-store' }
  );
}

/** @param {Request} request */
export function handleAgentEdge(request) {
  const url = new URL(request.url);
  const path = url.pathname || '/';
  const discoveryPaths = new Set([
    '/api/ai',
    '/llms.txt',
    '/llms-full.txt',
    '/index.md',
    '/openapi.json',
    '/openapi.yaml',
  ]);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return discoveryPaths.has(path) || path.startsWith('/api/public/v1/surfaces/')
      ? problem405(path, url.origin)
      : null;
  }

  if (path === '/openapi.json' || path === '/openapi.yaml') {
    return response(JSON.stringify(OPENAPI_SPEC, null, 2), 'application/json; charset=utf-8', {
      'Access-Control-Allow-Origin': '*',
    });
  }
  if (path === '/llms.txt') return response(LLMS_TXT, 'text/plain; charset=utf-8');
  if (path === '/llms-full.txt') return response(LLMS_FULL_TXT, 'text/plain; charset=utf-8');
  if (path === '/index.md') return response(INDEX_MD, 'text/markdown; charset=utf-8');
  if (path === '/api/ai') return json(buildCatalog(url.origin));
  if (path.startsWith('/api/ai/')) return problem404(path, url.origin);
  if (path.startsWith('/api/public/v1/surfaces/')) {
    const surfaceId = decodeURIComponent(path.slice('/api/public/v1/surfaces/'.length));
    const surface = buildCatalog(url.origin).surfaces.find((item) => item.id === surfaceId);
    return surface ? json(surface) : problem404(path, url.origin);
  }
  if (path === '/api' || path === '/api/v1') {
    return problem404(path, url.origin);
  }
  if (path === '/' && wantsMarkdown(request)) {
    return response(INDEX_MD, 'text/markdown; charset=utf-8', {
      Link: '</index.md>; rel="alternate"; type="text/markdown"',
      Vary: 'Accept, Accept-Encoding',
    });
  }
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

function response(body, contentType, extra = {}) {
  const { status = 200, ...headers } = extra;
  return new Response(body, {
    status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

function json(data) {
  return response(`${JSON.stringify(data, null, 2)}\n`, 'application/json; charset=utf-8');
}

function problem404(path, origin) {
  return response(
    `${JSON.stringify(
      {
        type: `${origin}/openapi.json#not-found`,
        title: 'Public API route not found',
        status: 404,
        code: 'PUBLIC_ROUTE_NOT_FOUND',
        detail: `${path} is not a RolePatch public discovery endpoint.`,
        resolution: 'Read /openapi.json or /api/ai for the supported read-only surfaces.',
      },
      null,
      2
    )}\n`,
    'application/problem+json; charset=utf-8',
    { status: 404 }
  );
}

function problem405(path, origin) {
  return response(
    `${JSON.stringify(
      {
        type: `${origin}/openapi.json#method-not-allowed`,
        title: 'Method not allowed',
        status: 405,
        code: 'DISCOVERY_METHOD_NOT_ALLOWED',
        detail: `${path} is a read-only discovery endpoint.`,
        resolution:
          'Use GET or HEAD. RolePatch does not expose public resume or application mutations.',
      },
      null,
      2
    )}\n`,
    'application/problem+json; charset=utf-8',
    { status: 405, Allow: 'GET, HEAD' }
  );
}
