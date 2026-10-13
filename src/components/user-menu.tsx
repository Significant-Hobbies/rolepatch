'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { captureAuthFailure } from '@/lib/foundry-monitoring';

// Guest navigation does not need the authenticated dropdown or sidebar primitives.
const SignedInUserMenu = dynamic(() =>
  import('./signed-in-user-menu').then((module) => module.SignedInUserMenu)
);

export function UserMenu({ sidebar = false }: { sidebar?: boolean }) {
  const { data: session, isPending } = authClient.useSession();
  if (!session?.user) {
    function handleSignIn() {
      authClient.signIn
        .social({ provider: 'google', callbackURL: '/resume-builder' })
        .then((result) => {
          if (result?.error)
            captureAuthFailure({
              projectSlug: 'resume-tailor',
              provider: 'google',
              stage: 'signin',
              reason: result.error.message ?? 'Google sign-in failed',
              source: 'user-menu',
            });
        })
        .catch((error: unknown) =>
          captureAuthFailure({
            projectSlug: 'resume-tailor',
            provider: 'google',
            stage: 'signin',
            reason: error instanceof Error ? error.message : 'Google sign-in failed',
            source: 'user-menu',
          })
        );
    }
    return (
      <Button variant="outline" disabled={isPending} onClick={handleSignIn}>
        Sign in
      </Button>
    );
  }
  return (
    <Suspense
      fallback={
        <Button
          variant="ghost"
          size={sidebar ? 'default' : 'icon'}
          className={sidebar ? 'h-12 w-full' : undefined}
          disabled
          aria-label="Loading account menu"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            {(session.user.name ?? '?')
              .split(/\s+/)
              .map((part) => part[0])
              .slice(0, 2)
              .join('')}
          </span>
        </Button>
      }
    >
      <SignedInUserMenu user={session.user} sidebar={sidebar} />
    </Suspense>
  );
}
