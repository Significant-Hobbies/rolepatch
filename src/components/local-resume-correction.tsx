'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { careerCredentialIssue } from '@/lib/career-data-privacy';
import { localCorrectResume } from '@/lib/local-storage';
import type { Resume } from '@/lib/types';

interface Props {
  resume: Resume;
  index: number;
  onRefresh: (saved: boolean) => void;
}

export function LocalResumeCorrection({ resume, index, onRefresh }: Props) {
  const [draft, setDraft] = useState<{ original: Resume; name: string; source: string } | null>(
    null
  );
  const [error, setError] = useState('');
  const label = `Local resume ${index + 1}`;
  if (!draft)
    return (
      <Button
        variant="outline"
        className="w-fit"
        onClick={() => {
          setDraft({ original: resume, name: resume.name, source: resume.source });
          setError('');
        }}
      >
        Edit local resume {index + 1}
      </Button>
    );
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const issue =
      careerCredentialIssue(`${label} name`, draft.name) ??
      careerCredentialIssue(label, draft.source);
    if (issue) {
      setError(issue);
      return;
    }
    try {
      if (!localCorrectResume(draft.original, draft.name, draft.source)) {
        onRefresh(false);
        setError('The local resume changed. Cancel and reopen the editor to load its latest copy.');
        return;
      }
      setDraft(null);
      onRefresh(true);
    } catch {
      setError('Could not save in this browser. Your corrections are still in the editor.');
    }
  }
  return (
    <form
      onSubmit={save}
      aria-label={`Edit local resume ${index + 1}`}
      data-clarity-mask=""
      className="mt-2 grid w-full gap-3"
    >
      <label className="grid gap-1 text-sm font-medium">
        Local resume name
        <Input
          value={draft.name}
          required
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Local resume Markdown
        <Textarea
          rows={9}
          value={draft.source}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          onChange={(e) => setDraft({ ...draft, source: e.target.value })}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Save locally</Button>
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            setDraft(null);
            setError('');
            onRefresh(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
