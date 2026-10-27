'use client';

import { WordCountPageView } from './page-view';
import { useMemo, useState } from 'react';

interface Stats {
  characters: number;
  charactersNoSpace: number;
  words: number;
  lines: number;
  sentences: number;
  paragraphs: number;
  bullets: number;
  readingSeconds: number;
}

function analyze(text: string): Stats {
  const characters = text.length;
  const charactersNoSpace = text.replace(/\s+/g, '').length;
  const words = (text.match(/\S+/g) ?? []).length;
  const lines = text.split(/\n/).length;
  const sentences = (text.match(/[^.!?\n]+[.!?]+/g) ?? []).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  const bullets = text.split(/\n/).filter((l) => /^\s*[-*•]/.test(l)).length;
  // 230 words/min is the common skim rate for resumes / bullet copy.
  const readingSeconds = Math.round((words / 230) * 60);
  return {
    characters,
    charactersNoSpace,
    words,
    lines,
    sentences,
    paragraphs,
    bullets,
    readingSeconds,
  };
}

export function useWordCountPageSourceState() {
  const [text, setText] = useState('');
  const stats = useMemo(() => (text.length > 0 ? analyze(text) : null), [text]);

  return { text, setText, stats };
}

export default function WordCountPage() {
  return <WordCountPageView {...useWordCountPageSourceState()} />;
}
