'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/components/auth-provider';
import { createJobApplication } from '@/lib/actions/job-actions';
import { scrapeJobUrlSafe } from '@/lib/actions/scrape-action';
import { localListResumes, localSaveJob } from '@/lib/local-storage';

interface NewJobButtonProps {
  resumes: { id: string; name: string }[];
}

export function NewJobButton({ resumes: serverResumes }: NewJobButtonProps) {
  const router = useRouter();
  const { isGuest } = useAuth();
  const [resumes, setResumes] = useState(serverResumes);
  const [open, setOpen] = useState(false);
  const [resumeId, setResumeId] = useState('');
  const [url, setUrl] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualCompany, setManualCompany] = useState('');
  const [manualRole, setManualRole] = useState('');
  const [manualJd, setManualJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // For guests, supplement with localStorage resumes
  useEffect(() => {
    if (isGuest) {
      const localResumes = localListResumes().map((r) => ({ id: r.id, name: r.name }));
      setResumes(localResumes);
    }
  }, [isGuest]);

  const close = useCallback(() => {
    if (loading) return;
    setOpen(false);
    setUrl('');
    setManualMode(false);
    setManualCompany('');
    setManualRole('');
    setManualJd('');
    setError('');
  }, [loading]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  function handleOpen() {
    if (resumes.length === 0) {
      setToast('Create a resume first before adding a job.');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    setResumeId(resumes[0].id);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!resumeId || (!manualMode && !trimmedUrl)) return;

    setLoading(true);
    setError('');
    try {
      const manualText = manualJd.trim();
      if (manualMode || manualText.length > 0) {
        if (manualText.length < 50) {
          setError('Paste at least a few sentences from the job description to continue.');
          return;
        }
        const company = manualCompany.trim() || 'Unknown Company';
        const role = manualRole.trim() || 'Untitled Role';
        let jobId: string;
        if (isGuest) {
          jobId = crypto.randomUUID();
          localSaveJob(jobId, company, role, resumeId, trimmedUrl, manualText, manualText);
        } else {
          jobId = await createJobApplication(
            resumeId,
            trimmedUrl,
            company,
            role,
            manualText,
            manualText
          );
        }
        close();
        router.push(`/tailor/${jobId}`);
        return;
      }

      const scrape = await scrapeJobUrlSafe(trimmedUrl);
      if (!scrape.ok) {
        setManualMode(true);
        setError(scrape.message);
        return;
      }

      const scraped = scrape.data;
      let jobId: string;
      if (isGuest) {
        jobId = crypto.randomUUID();
        localSaveJob(
          jobId,
          scraped.company,
          scraped.role,
          resumeId,
          trimmedUrl,
          scraped.html,
          scraped.text
        );
      } else {
        jobId = await createJobApplication(
          resumeId,
          trimmedUrl,
          scraped.company,
          scraped.role,
          scraped.html,
          scraped.text
        );
      }
      close();
      router.push(`/tailor/${jobId}`);
    } catch (err) {
      setManualMode(true);
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't read that posting. Paste the job description text manually to continue."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) handleOpen();
        else close();
      }}
    >
      <SheetTrigger asChild>
        <Button>+ Add Job</Button>
      </SheetTrigger>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <SheetContent
        className="overflow-y-auto"
        onEscapeKeyDown={(event) => {
          if (loading) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (loading) event.preventDefault();
        }}
      >
        <SheetHeader>
          <SheetTitle>Add Job Application</SheetTitle>
          <SheetDescription>Paste a job description or read a posting URL.</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {' '}
          <form onSubmit={handleSubmit} className="space-y-4">
            {resumes.length > 0 && (
              <div>
                <label htmlFor="new-job-resume" className="mb-2 block text-sm font-medium">
                  Master resume
                </label>
                <select
                  id="new-job-resume"
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs disabled:opacity-50"
                  disabled={resumes.length === 1}
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="new-job-url" className="mb-2 block text-sm font-medium">
                {manualMode ? 'Job URL (optional)' : 'Job URL'}
              </label>
              <Input
                id="new-job-url"
                ref={inputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://boards.greenhouse.io/..."
                className="w-full"
              />
            </div>

            <Button
              type="button"
              onClick={() => {
                setManualMode(!manualMode);
                setError('');
              }}
              variant="link"
              className="px-0"
            >
              {manualMode ? 'Read a posting URL instead' : 'Paste the description instead'}
            </Button>

            {manualMode && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="new-job-company" className="mb-2 block text-sm font-medium">
                      Company
                    </label>
                    <Input
                      id="new-job-company"
                      value={manualCompany}
                      onChange={(event) => setManualCompany(event.target.value)}
                      placeholder="Company name"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-job-role" className="mb-2 block text-sm font-medium">
                      Role
                    </label>
                    <Input
                      id="new-job-role"
                      value={manualRole}
                      onChange={(event) => setManualRole(event.target.value)}
                      placeholder="Role title"
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="new-job-jd" className="mb-2 block text-sm font-medium">
                    Job description
                  </label>
                  <Textarea
                    id="new-job-jd"
                    value={manualJd}
                    onChange={(event) => setManualJd(event.target.value)}
                    placeholder="Paste the job description here"
                    className="min-h-32"
                  />
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="text-sm text-red-700 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" onClick={close} disabled={loading} variant="outline">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || (manualMode ? manualJd.trim().length < 50 : !url.trim())}
              >
                {loading ? 'Saving...' : manualMode ? 'Save pasted JD' : 'Add Job'}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
