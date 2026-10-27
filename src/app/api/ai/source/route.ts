import { publicSourceMarkdown } from '@/lib/public-source';
import { markdownResponse } from '@/lib/agent-surfaces/http.mjs';

export const dynamic = 'force-dynamic';
export function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path') ?? '';
  const body = publicSourceMarkdown(path);
  const response = markdownResponse(
    body ?? '# Not found\n\nNo public document exists at this path.\n',
    request,
    {
      'Content-Location': new URL(body ? path : '/', 'https://rolepatch.com').href,
      'Cache-Control': body ? 'public, max-age=300' : 'no-store',
    }
  );
  return body ? response : new Response(response.body, { status: 404, headers: response.headers });
}
