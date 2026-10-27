'use client';

import { SnippetsPageView } from './page-view';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'resume-tailor-snippets';

interface Snippet {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

function loadAll(): Snippet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(snips: Snippet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snips));
}

export function useSnippetsPageSourceState() {
  const [snips, setSnips] = useState<Snippet[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnips(loadAll());
  }, []);

  const submit = useCallback(() => {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;
    setSnips((prev) => {
      const next = editingId
        ? prev.map((s) =>
            s.id === editingId ? { ...s, title: t, body: b, updatedAt: Date.now() } : s
          )
        : [{ id: crypto.randomUUID(), title: t, body: b, updatedAt: Date.now() }, ...prev];
      saveAll(next);
      return next;
    });
    setTitle('');
    setBody('');
    setEditingId(null);
  }, [title, body, editingId]);

  const edit = (s: Snippet) => {
    setTitle(s.title);
    setBody(s.body);
    setEditingId(s.id);
  };

  const remove = (id: string) => {
    setSnips((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveAll(next);
      return next;
    });
  };

  const copy = (s: Snippet) => {
    navigator.clipboard.writeText(s.body).then(() => {
      setCopiedId(s.id);
      window.setTimeout(() => setCopiedId(null), 1200);
    });
  };

  return {
    editingId,
    title,
    setTitle,
    body,
    setBody,
    submit,
    setEditingId,
    snips,
    copy,
    copiedId,
    edit,
    remove,
  };
}

export default function SnippetsPage() {
  return <SnippetsPageView {...useSnippetsPageSourceState()} />;
}
