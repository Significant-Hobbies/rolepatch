import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { workspaceReturnPath } from '@/lib/workspace-return';

export type WorkspaceSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function hasWorkspaceSession() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true, disableRefresh: true },
  });
  return Boolean(session?.user.id);
}

export async function requireWorkspaceSignIn(path: string, searchParams: WorkspaceSearchParams) {
  if (await hasWorkspaceSession()) return;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const entry of typeof value === 'string' ? [value] : (value ?? [])) {
      query.append(key, entry);
    }
  }
  const search = query.size ? `?${query}` : '';
  const returnTo = workspaceReturnPath(path + search);
  redirect(`/sign-in?${new URLSearchParams({ returnTo })}`);
}
