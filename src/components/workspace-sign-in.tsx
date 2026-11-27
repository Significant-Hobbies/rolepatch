'use client';

import { Button } from '@saas-maker/ui/components/button';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { captureAuthFailure } from '@/lib/foundry-monitoring';

export function WorkspaceSignIn({ returnTo, retry }: { returnTo: string; retry: boolean }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(retry);

  async function signIn() {
    setPending(true);
    setFailed(false);
    try {
      const callbackURL = returnTo.includes('#') ? returnTo : returnTo + window.location.hash;
      const errorCallbackURL = `/sign-in?${new URLSearchParams({ returnTo: callbackURL, error: '1' })}`;
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL,
        errorCallbackURL,
      });
      if (result.error) throw result.error;
    } catch (error) {
      setFailed(true);
      captureAuthFailure({
        projectSlug: 'resume-tailor',
        provider: 'google',
        stage: 'signin',
        reason: error instanceof Error ? error.message : 'Google sign-in could not start',
        source: 'workspace-sign-in',
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Button type="button" className="min-h-11 w-full" disabled={pending} onClick={signIn}>
        {pending ? 'Connecting to Google…' : 'Continue with Google'}
      </Button>
      {failed && <p role="alert">Google sign-in didn’t finish. Try again.</p>}
    </div>
  );
}
