'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  publishScore,
  unpublishScore,
  getShareStateForTailored,
} from '@/lib/actions/share-score-action';

interface ShareScoreButtonProps {
  tailoredId: string;
}

export function ShareScoreButton({ tailoredId }: ShareScoreButtonProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getShareStateForTailored(tailoredId)
      .then((state) => {
        if (cancelled) return;
        setSlug(state.slug);
        setIsPublic(state.isPublic);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tailoredId]);

  const shareUrl = slug ? `${getOrigin()}/badge/${slug}` : '';

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      try {
        const { slug: newSlug } = await publishScore(tailoredId);
        setSlug(newSlug);
        setIsPublic(true);
        try {
          await navigator.clipboard.writeText(`${getOrigin()}/badge/${newSlug}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // clipboard denied — link still usable via the revealed URL
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to share');
      }
    });
  }

  function handleUnpublish() {
    setError(null);
    startTransition(async () => {
      try {
        await unpublishScore(tailoredId);
        setIsPublic(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to unpublish');
      }
    });
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }

  if (isPublic && slug) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          title={shareUrl}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
        >
          {copied ? 'Copied!' : `/badge/${slug}`}
        </button>
        <button
          type="button"
          onClick={handleUnpublish}
          disabled={isPending}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] disabled:opacity-40 transition-colors"
        >
          {isPending ? '…' : 'Unshare'}
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handlePublish}
        disabled={isPending}
        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--border)] text-foreground hover:bg-[var(--muted)] disabled:opacity-40 transition-colors"
      >
        {isPending ? 'Sharing…' : 'Share score'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

function getOrigin() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}
