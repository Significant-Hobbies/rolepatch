// App Health endpoint telemetry. Only fixed route templates and request
// performance scalars leave this Worker; paths without a trusted template are
// dropped. Delivery uses the official bounded App Health Worker SDK.

import { createAppHealthClient } from '@saas-maker/app-health';

const INGEST_ENDPOINT = 'https://ingest.sassmaker.com/v1/ingest';
const FIXED_ROUTES = new Set([
  '/',
  '/api/ai/models',
  '/api/apply-agent/browser-check',
  '/api/apply-agent/browser-submit',
  '/api/apply-agent/packets',
  '/api/apply-agent/queue',
  '/api/apply-agent/receipts',
  '/api/checkout',
  '/api/extension/apply-packet',
  '/api/extension/fill-receipt',
  '/api/extension/save-job',
  '/api/extension/submission-receipt',
  '/api/extension/tailor',
  '/api/internal/cron/company-watchlist',
  '/api/internal/cron/weekly-digest',
  '/api/internal/email/recruiter-reply',
  '/api/jobs/search',
  '/api/proof/truehire-preview',
  '/api/proof/truehire-role-fit',
  '/api/webhook/dodo-payments',
  '/blog',
  '/dashboard',
  '/evidence',
  '/jobs',
  '/pricing',
  '/privacy',
  '/proof',
  '/settings',
  '/stash',
  '/terms',
  '/tools',
  '/tools/ats-check',
  '/tools/bullet-check',
  '/tools/diff',
  '/tools/keywords',
  '/tools/snippets',
  '/tools/word-count',
  '/blog/rss.xml',
]);

let client;
let clientKey;

export function trustedRouteTemplate(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (FIXED_ROUTES.has(path)) return path;
  if (/^\/api\/apply-agent\/queue\/[^/]+$/.test(path)) {
    return '/api/apply-agent/queue/:id';
  }
  if (/^\/api\/render\/[^/]+$/.test(path)) return '/api/render/:id';
  if (path.startsWith('/api/auth/')) return '/api/auth/:path*';
  if (/^\/badge\/[^/]+$/.test(path)) return '/badge/:slug';
  if (/^\/blog\/[^/]+$/.test(path)) return '/blog/:slug';
  if (/^\/cover-letter\/[^/]+$/.test(path)) return '/cover-letter/:jobId';
  if (/^\/editor\/[^/]+$/.test(path)) return '/editor/:id';
  if (/^\/interview-prep\/[^/]+$/.test(path)) return '/interview-prep/:jobId';
  if (/^\/tailor\/[^/]+$/.test(path)) return '/tailor/:jobId';
  return null;
}

function getClient(env) {
  const key =
    typeof env?.APP_HEALTH_INGEST_KEY === 'string' ? env.APP_HEALTH_INGEST_KEY.trim() : '';
  if (!key) return null;

  if (!client || clientKey !== key) {
    client = createAppHealthClient({
      key,
      environment: 'production',
      endpoint: INGEST_ENDPOINT,
      runtime: 'worker',
      disableTimer: true,
    });
    clientKey = key;
  }
  return client;
}

export function observeRequest(request, response, durationMs, env, ctx) {
  const route = trustedRouteTemplate(new URL(request.url).pathname);
  if (!route) return;

  try {
    const appHealth = getClient(env);
    if (!appHealth) return;
    appHealth.record({
      method: request.method,
      route,
      status_code: response.status,
      duration_ms: Math.max(0, Math.round(durationMs)),
    });
    const delivery = appHealth.flush().catch(() => undefined);
    ctx?.waitUntil(delivery);
  } catch {
    // Endpoint telemetry must never change or fail the application response.
  }
}
