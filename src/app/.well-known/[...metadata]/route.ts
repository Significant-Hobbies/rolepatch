import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Better Auth owns authorization discovery; expose its issuer-inserted root routes. */
export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  if (path === '/.well-known/oauth-protected-resource/api/resume') {
    const { baseURL } = await getAuth().$context;
    return Response.json(
      {
        resource: `${new URL(baseURL).origin}/api/resume`,
        authorization_servers: [baseURL],
        scopes_supported: ['resume'],
        bearer_methods_supported: ['header'],
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (
    ![
      '/.well-known/oauth-protected-resource',
      '/.well-known/oauth-protected-resource/api/mcp',
      '/.well-known/oauth-authorization-server/api/auth',
      '/.well-known/openid-configuration/api/auth',
      '/.well-known/oauth-authorization-server',
    ].includes(path)
  )
    return new Response('Not found', { status: 404 });
  return getAuth().handler(request);
}
