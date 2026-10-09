'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { authClient } from '@/lib/auth-client';
import { consentResumeOAuth, getResumeOAuthRequest } from '@/lib/actions/resume-oauth-actions';

export function ResumeOAuthConsent() {
  const { userId, isPending } = useAuth();
  const [query, setQuery] = useState('');
  const [request, setRequest] = useState<Awaited<ReturnType<typeof getResumeOAuthRequest>> | null>(
    null
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const query = window.location.search.slice(1);
    if (!new URLSearchParams(query).has('sig')) return;
    setQuery(query);
    let cancelled = false;
    getResumeOAuthRequest(query)
      .then((result) => {
        if (!cancelled) setRequest(result);
      })
      .catch(() => {
        if (!cancelled) setError('Could not read this connection request. Try again.');
      });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!query) return null;
  async function decide(accept: boolean) {
    setPending(true);
    setError('');
    try {
      const result = await consentResumeOAuth(query, accept);
      if (result.ok) window.location.assign(result.redirect_uri);
      else setError(result.error);
    } catch {
      setError('Could not finish connecting. Try again.');
    } finally {
      setPending(false);
    }
  }
  async function signIn() {
    setPending(true);
    setError('');
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.href,
      });
      if (result.error) setError('Google sign-in could not start. Try again.');
    } catch {
      setError('Google sign-in could not start. Try again.');
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      aria-labelledby="resume-oauth-heading"
      className="border border-[var(--border)] rounded-xl p-6 bg-[var(--card)]/30 space-y-4"
    >
      <h2 id="resume-oauth-heading" className="text-xl font-bold">
        Connect your resume
      </h2>
      {!request && !error && <p role="status">Checking connection request…</p>}
      {request?.ok && (
        <>
          <p>
            <strong>{request.client_name}</strong> wants to connect to RolePatch.
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Client-provided name. Return address:{' '}
            <span className="break-all">{request.callback_origin}</span>
          </p>
          <p className="text-sm">
            This connection can read your master resumes, use your credits to prepare a resume, and
            save versions to Jobs History when requested. It cannot submit applications.
          </p>
          {request.scopes.includes('offline_access') && (
            <p className="text-sm">
              It can renew access for up to seven days while your sign-in session remains active.
              Disconnect and sign out in Settings to revoke this session’s connections.
            </p>
          )}
          {userId && request.signed_in ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending || isPending}
                onClick={() => decide(true)}
                className="product-primary-action px-5 py-2.5 rounded-lg font-medium disabled:opacity-40"
              >
                {pending ? 'Working…' : 'Allow resume access'}
              </button>
              <button
                type="button"
                disabled={pending || isPending}
                onClick={() => decide(false)}
                className="px-5 py-2.5 rounded-lg border border-[var(--border)] font-medium disabled:opacity-40"
              >
                Cancel connection
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={pending || isPending}
              onClick={signIn}
              className="product-primary-action px-5 py-2.5 rounded-lg font-medium disabled:opacity-40"
            >
              Sign in with Google to continue
            </button>
          )}
        </>
      )}
      {(error || (request && !request.ok)) && (
        <p role="alert">{error || (request && !request.ok ? request.error : '')}</p>
      )}
      <a href="/settings" className="text-sm underline">
        Back to Settings
      </a>
    </section>
  );
}
