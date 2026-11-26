import { toNextJsHandler } from 'better-auth/next-js';

import { getAuth } from '@/lib/auth';

export const { GET, POST } = toNextJsHandler((request) => {
  const url = new URL(request.url);
  // Better Auth defaults an omitted scope to every scope in the client's registration.
  if (
    request.method === 'GET' &&
    url.pathname.replace(/\/$/, '') === '/api/auth/oauth2/authorize' &&
    url.searchParams.get('redirect_uri') ===
      'https://chatgpt.com/connector_platform_oauth_redirect' &&
    !url.searchParams.has('scope')
  ) {
    url.searchParams.set('scope', 'offline_access resume');
    return getAuth().handler(new Request(url, request));
  }
  return getAuth().handler(request);
});
