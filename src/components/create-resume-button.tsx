'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createResume } from '@/lib/actions/resume-actions';

export function CreateResumeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const id = await createResume(trimmed);
      router.push(`/editor/${id}`);
    } finally {
      setLoading(false);
      setOpen(false);
      setName('');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        New Resume
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Resume name"
        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            setName('');
          }
        }}
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
      >
        {loading ? 'Creating...' : 'Create'}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setName(''); }}
        className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
    </form>
  );
}
