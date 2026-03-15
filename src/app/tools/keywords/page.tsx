'use client';

import { useState } from 'react';
import Link from 'next/link';
import { calculateATSScore, type ATSResult } from '@/lib/ats-score';

function scoreColor(score: number) {
  if (score > 70) return { stroke: '#22c55e', text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
  if (score >= 40) return { stroke: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
}

function ScoreCircle({ score }: { score: number }) {
  const color = scoreColor(score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-bold ${color.text}`}>{score}</span>
        <span className="text-xs text-gray-500">ATS Score</span>
      </div>
    </div>
  );
}

export default function KeywordsToolPage() {
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [result, setResult] = useState<ATSResult | null>(null);

  const canAnalyze = resumeText.trim().length > 0 && jdText.trim().length > 0;

  function handleAnalyze() {
    const r = calculateATSScore(resumeText, jdText);
    setResult(r);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-green-500 flex items-center justify-center text-[10px] font-bold text-white">RP</span>
            <span className="font-bold text-lg tracking-tight text-white">RolePatch</span>
          </Link>
          <Link
            href="/dashboard"
            className="bg-white text-gray-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Free ATS Keyword Checker</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Check how well your resume matches a job description. See matched and missing keywords instantly. Free, no sign-up required.
          </p>
        </div>

        {/* Textareas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Your Resume</label>
            <textarea
              value={resumeText}
              onChange={(e) => { setResumeText(e.target.value); setResult(null); }}
              placeholder="Paste your resume text here..."
              className="input-base min-h-[240px] resize-y font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Job Description</label>
            <textarea
              value={jdText}
              onChange={(e) => { setJdText(e.target.value); setResult(null); }}
              placeholder="Paste the job description here..."
              className="input-base min-h-[240px] resize-y font-mono text-sm"
            />
          </div>
        </div>

        {/* Analyze button */}
        <div className="flex justify-center mb-10">
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl text-lg transition-colors"
          >
            Analyze
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/80 shadow-2xl overflow-hidden p-6 sm:p-8">
            {/* Score + stats */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative flex items-center justify-center mb-4">
                <ScoreCircle score={result.score} />
              </div>
              <p className="text-sm text-gray-500">
                {result.matchedKeywords.length} of {result.totalKeywords} keywords matched
              </p>
            </div>

            {/* Keyword pills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.matchedKeywords.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-400 mb-3">
                    Matched keywords ({result.matchedKeywords.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.matchedKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2.5 py-1 text-xs rounded-full bg-green-500/15 text-green-400 border border-green-500/20"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.missingKeywords.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-400 mb-3">
                    Missing keywords ({result.missingKeywords.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2.5 py-1 text-xs rounded-full bg-red-500/15 text-red-400 border border-red-500/20"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="rounded-xl border border-gray-800 p-8 max-w-xl mx-auto">
            <p className="text-gray-400 mb-4">Let AI fix the gaps automatically.</p>
            <Link
              href="/dashboard"
              className="inline-block bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Try RolePatch free &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
