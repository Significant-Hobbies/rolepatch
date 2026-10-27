'use client';

import { KeywordsToolPageView } from './page-view';
import { useState } from 'react';

import { type ATSResult, calculateATSScore } from '@/lib/ats-score';

export function useKeywordsToolPageSourceState() {
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [result, setResult] = useState<ATSResult | null>(null);

  const canAnalyze = resumeText.trim().length > 0 && jdText.trim().length > 0;

  function handleAnalyze() {
    const r = calculateATSScore(resumeText, jdText);
    setResult(r);
  }

  return {
    resumeText,
    setResumeText,
    setResult,
    jdText,
    setJdText,
    handleAnalyze,
    canAnalyze,
    result,
  };
}

export default function KeywordsToolPage() {
  return <KeywordsToolPageView {...useKeywordsToolPageSourceState()} />;
}
