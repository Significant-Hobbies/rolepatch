// Shared with the Next.js CSP contract tests; keep this policy aligned with next.config.ts.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://us-assets.i.posthog.com https://www.clarity.ms https://scripts.clarity.ms https://challenges.cloudflare.com https://sassmaker.com https://health.sassmaker.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' https://sassmaker.com",
  "connect-src 'self' https: https://cloudflareinsights.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
].join('; ');
