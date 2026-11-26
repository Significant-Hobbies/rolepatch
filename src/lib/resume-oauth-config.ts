import { resourceScopes } from '@/lib/career-scopes';
import type { BetterAuthPlugin } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { mcp } from '@better-auth/mcp';
import { jwt } from 'better-auth/plugins';

function resumeOAuthOrigin(baseURL?: string) {
  return new URL(baseURL || 'http://localhost:3000').origin;
}

export function resumeOAuthPlugins(baseURL?: string) {
  const origin = resumeOAuthOrigin(baseURL);
  return [
    {
      id: 'chatgpt-legacy-default-scope',
      hooks: {
        before: [
          {
            matcher: (ctx) => ctx.path === '/oauth2/authorize',
            handler: createAuthMiddleware(async (ctx) => {
              // The provider accepts GET query parameters and POST form parameters.
              // Its default for omitted scope is every scope in the client registration.
              const field = ctx.method === 'POST' ? 'body' : 'query';
              const params = ctx[field];
              if (
                params?.redirect_uri === 'https://chatgpt.com/connector_platform_oauth_redirect' &&
                params.scope === undefined
              ) {
                return { context: { [field]: { ...params, scope: 'offline_access resume' } } };
              }
            }),
          },
        ],
      },
    } satisfies BetterAuthPlugin,
    jwt({ jwks: { keyPairConfig: { alg: 'ES256' } } }),
    mcp({
      loginPage: '/settings',
      consentPage: '/settings',
      resource: `${origin}/api/mcp`,
      resources: [`${origin}/api/resume`],
      clientRegistrationDefaultResources: [`${origin}/api/resume`],
      scopes: ['offline_access', ...resourceScopes],
      grantTypes: ['authorization_code', 'refresh_token'],
      // Current ChatGPT clients use DCR. CIMD needs a separate Workers-safe transport.
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      allowPublicClientPrelogin: true,
      accessTokenExpiresIn: 300,
      refreshTokenExpiresIn: 7 * 24 * 60 * 60,
      refreshTokenReuseInterval: 0,
    }),
  ];
}
