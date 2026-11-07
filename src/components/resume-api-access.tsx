'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  createResumeApiAccess,
  disconnectResumeApiAccess,
} from '@/lib/actions/resume-access-actions';
import { authClient } from '@/lib/auth-client';

export function ResumeApiAccess() {
  const { userId, isPending } = useAuth();
  return (
    <AccessControls key={userId ?? 'guest'} signedIn={Boolean(userId)} authPending={isPending} />
  );
}

function AccessControls({ signedIn, authPending }: { signedIn: boolean; authPending: boolean }) {
  const [access, setAccess] = useState<{ token: string; expires_at: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');

  async function create() {
    setPending(true);
    setNotice('');
    setAccess(null);
    setRevealed(false);
    try {
      const result = await createResumeApiAccess();
      if (!result.ok) setNotice(result.error);
      else setAccess({ token: result.token, expires_at: result.expires_at });
    } catch {
      setNotice('Could not connect your account. Try again.');
    } finally {
      setPending(false);
    }
  }

  async function disconnect() {
    setPending(true);
    setNotice('');
    try {
      const result = await disconnectResumeApiAccess();
      if (!result.ok) setNotice(result.error);
      else {
        setAccess(null);
        await authClient.signOut();
        window.location.reload();
      }
    } catch {
      setNotice('Could not disconnect. Try again before treating access as revoked.');
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!access) return;
    try {
      await navigator.clipboard.writeText(access.token);
      setNotice('Token copied. Store it in your client’s secure configuration.');
    } catch {
      setRevealed(true);
      setNotice('Clipboard unavailable. Select and copy the token below.');
    }
  }

  return (
    <details className="border border-[var(--border)] rounded-xl p-6 bg-[var(--card)]/30">
      <summary className="font-semibold cursor-pointer">Connect your resume API</summary>
      <div className="space-y-4 mt-4 text-sm">
        <p>
          Send a job description or a public job reference and get a complete resume from your saved
          master. With one master, you can omit its ID; with several, choose a profile using the MCP
          tools.
        </p>
        <p className="text-[var(--muted-foreground)]">
          Access can read your saved master profiles, use credits to generate resumes, and save
          versions to Jobs History. It expires within 24 hours, or sooner if you sign out of this
          session. It cannot submit applications.
        </p>
        {!signedIn && (
          <p role="status">
            Sign in with Google from the account menu to connect saved resumes. Guest API calls can
            still supply a master as <code>resume_markdown</code>.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="product-primary-action px-5 py-2.5 rounded-lg font-medium disabled:opacity-40"
            disabled={!signedIn || authPending || pending}
            onClick={create}
          >
            {pending ? 'Working…' : 'Create API token'}
          </button>
          {signedIn && (
            <button
              type="button"
              className="px-3 py-2.5 rounded-lg border border-[var(--border)] font-medium disabled:opacity-40"
              disabled={pending}
              onClick={disconnect}
            >
              Disconnect and sign out
            </button>
          )}
        </div>
        {signedIn && (
          <p className="text-[var(--muted-foreground)]">
            Disconnect revokes every token created from this browser session and signs this session
            out. Other signed-in devices keep their access.
          </p>
        )}
        {access && (
          <div className="space-y-3">
            <label className="block font-medium" htmlFor="resume-api-token">
              API token
            </label>
            <input
              id="resume-api-token"
              className="input-base w-full font-mono text-sm"
              type={revealed ? 'text' : 'password'}
              readOnly
              value={access.token}
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="px-3 py-2.5 rounded-lg border border-[var(--border)]"
                onClick={() => setRevealed(!revealed)}
              >
                {revealed ? 'Hide token' : 'Show token'}
              </button>
              <button
                type="button"
                className="px-3 py-2.5 rounded-lg border border-[var(--border)]"
                onClick={copy}
              >
                Copy token
              </button>
            </div>
            <p>
              Expires {new Date(access.expires_at).toLocaleString()}. This page does not store the
              token; copy it before leaving.
            </p>
          </div>
        )}
        <div className="space-y-2">
          <p>
            Use <code>Authorization: Bearer &lt;your token&gt;</code> with:
          </p>
          <code className="block break-all">POST https://rolepatch.com/api/resume</code>
          <p>
            Send <code>jd_text</code> and, if needed, <code>resume_id</code>. The response contains{' '}
            <code>markdown</code> and a History link. Add <code>format: &quot;html&quot;</code> for
            HTML too.
          </p>
          <p>
            For the stdio MCP bridge, set <code>ROLEPATCH_API_TOKEN</code> in secure client
            configuration. For assistants that support OAuth, add this server URL and choose OAuth:
          </p>
          <code className="block break-all">https://rolepatch.com/api/mcp</code>
          <p>
            Sign in with Google and approve resume access when your assistant opens RolePatch. Each
            connection uses your saved master; MCP saves to History only when requested.
          </p>
        </div>
        {notice && (
          <p role="status" aria-live="polite">
            {notice}
          </p>
        )}
      </div>
    </details>
  );
}
