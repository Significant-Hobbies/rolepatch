import { Card, CardContent, CardDescription, CardHeader } from '@saas-maker/ui/components/card';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RolePatchMark } from '@/components/rolepatch-mark';
import { WorkspaceSignIn } from '@/components/workspace-sign-in';
import { hasWorkspaceSession } from '@/lib/workspace-access';
import { workspaceReturnPath } from '@/lib/workspace-return';

export const metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[]; error?: string | string[] }>;
}) {
  const { returnTo, error } = await searchParams;
  const destination = workspaceReturnPath(returnTo);
  if (await hasWorkspaceSession()) redirect(destination);
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <Link href="/" className="mb-4 inline-flex items-center gap-2 font-semibold">
        <RolePatchMark />
        RolePatch
      </Link>
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to RolePatch</h1>
          <CardDescription>
            Sign in to build résumés, track jobs, and see your history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceSignIn returnTo={destination} retry={Boolean(error)} />
        </CardContent>
      </Card>
    </main>
  );
}
