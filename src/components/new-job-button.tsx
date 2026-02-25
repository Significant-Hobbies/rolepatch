'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { scrapeJobUrl } from '@/lib/actions/scrape-action';
import { createJobApplication } from '@/lib/actions/job-actions';

interface NewJobButtonProps {
  resumes: { id: string; name: string }[];
}

export function NewJobButton({ resumes }: NewJobButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resumeId, setResumeId] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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
  }, [open]);

  function close() {
    if (loading) return;
    setOpen(false);
    setUrl('');
    setError('');
  }

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
    if (!trimmedUrl || !resumeId) return;

    setLoading(true);
    setError('');
    try {
      const scraped = await scrapeJobUrl(trimmedUrl);
      const jobId = await createJobApplication(
        resumeId,
        trimmedUrl,
        scraped.company,
        scraped.role,
        scraped.html,
        scraped.text,
      );
      close();
      router.push(`/tailor/${jobId}`);
    } catch (err) {
      setError(`Failed to scrape job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
      >
        Add Job
      </button>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Job Application</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {resumes.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resume</label>
                  <select
                    value={resumeId}
                    onChange={(e) => setResumeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job URL</label>
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://boards.greenhouse.io/..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Scraping...' : 'Add Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
