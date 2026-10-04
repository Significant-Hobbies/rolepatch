import { describe, expect, it } from 'vitest';

import nextConfig from '../../next.config';

const expectedPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://us-assets.i.posthog.com https://www.clarity.ms https://scripts.clarity.ms https://challenges.cloudflare.com https://sassmaker.com https://health.sassmaker.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' https://sassmaker.com",
  "connect-src 'self' https: https://cloudflareinsights.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const expectedRoutes = [
  {
    source: '/',
    headers: [
      ...securityHeaders,
      {
        key: 'Cache-Control',
        value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
      { key: 'CDN-Cache-Control', value: 'public, s-maxage=86400, stale-while-revalidate=604800' },
    ],
  },
  ...['/tools/:path*', '/blog/:path*'].map((source) => ({
    source,
    headers: [
      ...securityHeaders,
      { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
    ],
  })),
  { source: '/(.*)', headers: securityHeaders },
];

describe('First-party footer content security policy', () => {
  it('permits only the approved script/font origins while preserving every other directive', async () => {
    const routes = await nextConfig.headers?.();
    expect(routes).toHaveLength(4);
    for (const route of routes ?? []) {
      expect(route.headers.filter((header) => header.key === 'Content-Security-Policy')).toEqual([
        { key: 'Content-Security-Policy', value: expectedPolicy },
      ]);
    }
  });

  it('preserves all non-CSP security headers, cache headers and route rules', async () => {
    const routes = await nextConfig.headers?.();
    expect(
      routes?.map((route) => ({
        source: route.source,
        headers: route.headers.filter((header) => header.key !== 'Content-Security-Policy'),
      }))
    ).toEqual(expectedRoutes);
  });
});
