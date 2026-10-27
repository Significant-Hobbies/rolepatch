'use client';

import { TrueHireProofPreviewView } from './truehire-proof-preview-view';

import type { FormEvent } from 'react';
import { useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { importTrueHireProofEvidence } from '@/lib/actions/achievement-evidence-actions';
import {
  trueHireEvidenceDedupeKey,
  trueHireProofItemToEvidenceInput,
  type TrueHireProofItem,
  type TrueHireProofProfile,
  type TrueHireRoleFitPreview,
} from '@/lib/truehire-proof';
import { localCreateAchievementEvidence, localListAchievementEvidence } from '@/lib/local-storage';

interface PreviewResponse {
  ok: boolean;
  error?: string;
  source_url?: string;
  profile?: TrueHireProofProfile;
  items?: TrueHireProofItem[];
}

interface RoleFitResponse {
  ok: boolean;
  error?: string;
  source_url?: string;
  boundary?: string;
  role_fit?: TrueHireRoleFitPreview;
}

export function useTrueHireProofPreviewSourceState() {
  const { isGuest } = useAuth();
  const [handle, setHandle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRoleFitLoading, setIsRoleFitLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFitError, setRoleFitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [roleFit, setRoleFit] = useState<RoleFitResponse | null>(null);

  async function loadPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = handle.trim();
    if (!value) {
      setError('Enter a TrueHire handle or profile URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotice(null);
    setPreview(null);
    try {
      const response = await fetch(
        `/api/proof/truehire-preview?handle=${encodeURIComponent(value)}`
      );
      const json = (await response.json()) as PreviewResponse;
      if (!response.ok || !json.ok) {
        setError(json.error ?? 'TrueHire preview is unavailable right now.');
        return;
      }
      setPreview(json);
    } catch {
      setError('TrueHire preview is unavailable right now.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRoleFit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = handle.trim();
    const jd = jobDescription.trim();
    if (!value) {
      setRoleFitError('Enter a TrueHire handle or profile URL.');
      return;
    }
    if (jd.length < 40) {
      setRoleFitError('Paste at least 40 characters of job description.');
      return;
    }

    setIsRoleFitLoading(true);
    setRoleFitError(null);
    setRoleFit(null);
    try {
      const params = new URLSearchParams({ handle: value, jd });
      const response = await fetch(`/api/proof/truehire-role-fit?${params.toString()}`);
      const json = (await response.json()) as RoleFitResponse;
      if (!response.ok || !json.ok) {
        setRoleFitError(json.error ?? 'TrueHire role-fit preview is unavailable right now.');
        return;
      }
      setRoleFit(json);
    } catch {
      setRoleFitError('TrueHire role-fit preview is unavailable right now.');
    } finally {
      setIsRoleFitLoading(false);
    }
  }

  async function importPreview() {
    if (!preview?.profile || !preview.items || preview.items.length === 0) return;

    setIsImporting(true);
    setError(null);
    setNotice(null);
    try {
      if (isGuest) {
        const existingKeys = new Set(
          localListAchievementEvidence().map((entry) =>
            trueHireEvidenceDedupeKey({ title: entry.title, situation: entry.situation })
          )
        );
        let imported = 0;
        let skipped = 0;
        for (const item of preview.items) {
          const input = trueHireProofItemToEvidenceInput(item, preview.profile);
          const key = trueHireEvidenceDedupeKey(input);
          if (existingKeys.has(key)) {
            skipped += 1;
            continue;
          }
          localCreateAchievementEvidence(input);
          existingKeys.add(key);
          imported += 1;
        }
        setNotice(`Imported ${imported} proof item${imported === 1 ? '' : 's'} locally.`);
        if (skipped > 0) setNotice(`Imported ${imported}; skipped ${skipped} duplicates.`);
      } else {
        const result = await importTrueHireProofEvidence(preview.profile.handle);
        const summary = `Imported ${result.imported} proof item${
          result.imported === 1 ? '' : 's'
        } from @${result.handle}.`;
        setNotice(
          result.skipped > 0 ? `${summary} Skipped ${result.skipped} duplicates.` : summary
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TrueHire import is unavailable right now.');
    } finally {
      setIsImporting(false);
    }
  }

  return {
    loadPreview,
    handle,
    setHandle,
    isLoading,
    error,
    notice,
    preview,
    importPreview,
    isImporting,
    loadRoleFit,
    jobDescription,
    setJobDescription,
    isRoleFitLoading,
    roleFitError,
    roleFit,
  };
}

export function TrueHireProofPreview() {
  return <TrueHireProofPreviewView {...useTrueHireProofPreviewSourceState()} />;
}
