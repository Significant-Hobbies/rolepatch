'use client';

import { Button } from '@saas-maker/ui/components/button';
import { Input } from '@saas-maker/ui/components/input';
import { useState } from 'react';
import { renameResume } from '@/lib/actions/resume-actions';
import { localRenameResume } from '@/lib/local-storage';

interface Props {
  resumeId: string;
  name: string;
  isGuest: boolean;
  onSaved: (name: string) => void;
  onError: (error: string) => void;
}

export function ResumeNameEditor({ resumeId, name, isGuest, onSaved, onError }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function commit() {
    if (saving || draft === null) return;
    const next = draft.trim();
    onError('');
    setSaving(true);
    try {
      if (!next) {
        onError('Resume name cannot be empty.');
        return;
      }
      if (next === name) return;
      if (isGuest) localRenameResume(resumeId, next);
      else {
        const issue = await renameResume(resumeId, next);
        if (issue) {
          onError(issue.error);
          return;
        }
      }
      onSaved(next);
    } catch {
      onError('Could not rename this resume. Try again.');
    } finally {
      setSaving(false);
      setDraft(null);
    }
  }
  return draft === null ? (
    <Button
      variant="ghost"
      type="button"
      onClick={() => setDraft(name)}
      className="text-sm font-medium text-gray-700 truncate hover:text-blue-600 transition-colors"
      title="Click to rename"
    >
      {name}
    </Button>
  ) : (
    <Input
      aria-label="Resume name"
      ref={(el) => el?.focus()}
      value={draft}
      readOnly={saving}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        else if (e.key === 'Escape' && !saving) setDraft(null);
      }}
      className="text-sm font-medium text-gray-700 px-1 py-0 border border-gray-300 rounded outline-none focus:border-blue-400 w-48"
    />
  );
}
