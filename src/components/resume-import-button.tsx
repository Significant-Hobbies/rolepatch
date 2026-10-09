'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { importResumeFromFile } from '@/lib/actions/import-action';
import { localCreateResume } from '@/lib/local-storage';
import { prepareResumeFile } from '@/lib/prepare-resume-file';

const ACCEPTED = '.pdf,.docx,.txt,.md';
const MAX_MB = 5;

export function ResumeImportButton() {
  const router = useRouter();
  const { isGuest, isPending: authPending } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    inputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking same file
    if (!file || authPending) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File too large (max ${MAX_MB}MB)`);
      return;
    }

    startTransition(async () => {
      try {
        const settings = JSON.parse(localStorage.getItem('ai-settings') ?? '{}');
        const aiConfig = {
          endpointUrl: settings.endpointUrl || '',
          apiKey: settings.apiKey || '',
          model: settings.model || '',
        };
        const name = file.name.replace(/\.(pdf|docx?|txt|md)$/i, '') || 'Imported Resume';

        const formData = new FormData();
        formData.append('file', await prepareResumeFile(file));
        formData.append('name', name);

        const result = await importResumeFromFile(formData, aiConfig);
        if (!result.success) {
          setError(result.error);
          return;
        }
        const { id, source } = result;

        const finalId = isGuest ? localCreateResume(name, source) : id;
        router.push(`/resume-builder?resume=${finalId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed');
      }
    });
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={ACCEPTED} onChange={onFile} className="hidden" />
      <Button
        onClick={onClick}
        disabled={isPending || authPending}
        variant="outline"
        title="Import resume from PDF, DOCX, or Markdown"
      >
        {isPending ? 'Importing…' : '↑ Import Resume'}
      </Button>
      {error && (
        <span className="text-xs text-red-500 ml-2" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
