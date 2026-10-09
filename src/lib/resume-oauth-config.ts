import { mcp } from '@better-auth/mcp';
import { jwt } from 'better-auth/plugins';

export function resumeOAuthOrigin(baseURL?: string) {
  return new URL(baseURL || 'http://localhost:3000').origin;
}

export function resumeOAuthPlugins(baseURL?: string) {
  const origin = resumeOAuthOrigin(baseURL);
  return [
    jwt({ jwks: { keyPairConfig: { alg: 'ES256' } } }),
    mcp({
      loginPage: '/settings',
      consentPage: '/settings',
      resource: `${origin}/api/mcp`,
      resources: [`${origin}/api/resume`],
      clientRegistrationDefaultResources: [`${origin}/api/resume`],
      scopes: ['offline_access', 'resume'],
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
