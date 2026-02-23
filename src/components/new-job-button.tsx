'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { scrapeJobUrl } from '@/lib/actions/scrape-action';
import { createJobApplication } from '@/lib/actions/job-actions';
import type { Resume } from '@/lib/types';

interface NewJobButtonProps {
  resumes: Resume[];
}

export function NewJobButton({ resumes }: NewJobButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resumeId, setResumeId] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleOpen() {
    if (resumes.length === 0) {
      setError('Create a resume first before adding a job.');
      setTimeout(() => setError(''), 3000);
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
      setOpen(false);
      setUrl('');
      router.push(`/tailor/${jobId}`);
    } catch (err) {
      setError(`Failed to scrape job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div>
        <button
          onClick={handleOpen}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Add Job
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border rounded-lg p-4 max-w-md">
      {resumes.length > 1 && (
        <div>
          <label className="block text-sm font-medium mb-1">Resume</label>
          <select
            value={resumeId}
            onChange={(e) => setResumeId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Job URL</label>
        <input
          autoFocus
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://boards.greenhouse.io/..."
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setUrl('');
              setError('');
            }
          }}
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
        >
          {loading ? 'Scraping...' : 'Add Job'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setUrl(''); setError(''); }}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
