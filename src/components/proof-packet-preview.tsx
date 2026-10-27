'use client';

import { ProofPacketPreviewView } from './proof-packet-preview-view';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { buildProofPacketPreview } from '@/lib/achievement-evidence';
import { localListAchievementEvidence } from '@/lib/local-storage';
import type { AchievementEvidence } from '@/lib/types';

interface Props {
  serverEntries: AchievementEvidence[];
}

export function useProofPacketPreviewSourceState({ serverEntries }: Props) {
  const { isGuest } = useAuth();
  const [entries, setEntries] = useState(serverEntries);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (isGuest) setEntries(localListAchievementEvidence());
  }, [isGuest]);

  const preview = useMemo(() => buildProofPacketPreview(entries), [entries]);
  const hasEvidence = entries.length > 0;
  const shareableCount = preview.shareable.length;
  const needsWorkCount = preview.needsWork.length;

  async function copyProofProfile() {
    try {
      await navigator.clipboard.writeText(formatProofProfileSummary(preview.shareable));
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('failed');
    }
  }

  return { shareableCount, needsWorkCount, copyProofProfile, copyState, hasEvidence, preview };
}

function formatProofProfileSummary(
  items: ReturnType<typeof buildProofPacketPreview>['shareable']
): string {
  const lines = [
    'RolePatch proof profile',
    'Boundary: These proof points are user-reviewed context. Nothing is shared automatically.',
    '',
    'Proof points:',
  ];
  if (items.length === 0) {
    lines.push('- None available');
  } else {
    for (const item of items) {
      lines.push(`- ${item.title} [${item.readiness.label}]: ${item.claim}`);
      if (item.tags.length > 0) lines.push(`  Tags: ${item.tags.join(', ')}`);
      if (item.source_url) lines.push(`  Source: ${item.source_url}`);
      if (item.readiness.missing.length > 0) {
        lines.push(`  Missing: ${item.readiness.missing.join(', ')}`);
      }
    }
  }
  return lines.join('\n');
}

export function ProofPacketPreview(props: Parameters<typeof useProofPacketPreviewSourceState>[0]) {
  return <ProofPacketPreviewView {...useProofPacketPreviewSourceState(props)} />;
}
