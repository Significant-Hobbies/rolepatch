import { handleModelsRequest } from '@saas-maker/ai/server';

import { getCurrentUserId } from '@/lib/auth-utils';

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const body = await req.json();
  return Response.json(await handleModelsRequest(body));
}
