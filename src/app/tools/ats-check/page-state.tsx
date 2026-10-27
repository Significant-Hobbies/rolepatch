'use client';

import { AtsCheckPageView } from './page-view';

import { useMemo, useState } from 'react';

interface Finding {
  severity: 'good' | 'warn' | 'fail';
  label: string;
  detail: string;
}

function analyze(text: string): { score: number; findings: Finding[] } {
  const findings: Finding[] = [];
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean);
  const lines = t.split(/\n/);

  // 1. Length sanity — most one-pager resumes are 350-900 words.
  if (words.length < 200) {
    findings.push({
      severity: 'warn',
      label: 'Too short',
      detail: `Only ${words.length} words — most readable resumes land in 400–900 words.`,
    });
  } else if (words.length > 1300) {
    findings.push({
      severity: 'warn',
      label: 'Probably too long',
      detail: `${words.length} words. ATS happily ingests long text, but recruiters skim — trim to under 1000 if you can.`,
    });
  } else {
    findings.push({
      severity: 'good',
      label: 'Word count looks sane',
      detail: `${words.length} words.`,
    });
  }

  // 2. Section headers — heuristic check for Experience / Education / Skills.
  const lower = t.toLowerCase();
  const sections = ['experience', 'education', 'skills', 'projects'];
  const missing = sections.filter((s) => !lower.includes(s));
  if (missing.length === 0) {
    findings.push({
      severity: 'good',
      label: 'All four standard sections present',
      detail: 'Experience · Education · Skills · Projects.',
    });
  } else {
    findings.push({
      severity: missing.length >= 3 ? 'fail' : 'warn',
      label: `Missing section${missing.length === 1 ? '' : 's'}`,
      detail: `Couldn't find: ${missing.join(', ')}. ATS parsers depend on these labels.`,
    });
  }

  // 3. Contact info — at least an email and either a phone or a LinkedIn-like URL.
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(t);
  const hasPhone = /(?:\+?\d[\s-]?){7,}\d/.test(t);
  const hasLinkedIn = /linkedin\.com\/in\//i.test(t);
  if (hasEmail && (hasPhone || hasLinkedIn)) {
    findings.push({
      severity: 'good',
      label: 'Reachable',
      detail: `Email${hasPhone ? ' + phone' : ''}${hasLinkedIn ? ' + LinkedIn' : ''}.`,
    });
  } else {
    findings.push({
      severity: 'fail',
      label: 'Missing contact info',
      detail: hasEmail
        ? 'Email present but no phone or LinkedIn URL detected.'
        : 'No email detected. ATS reject queues often filter on missing email.',
    });
  }

  // 4. Bullet density — bullets should make up at least 30% of lines if Experience is structured.
  const bulletLines = lines.filter((l) => /^\s*[-*•]/.test(l)).length;
  if (lines.length > 12 && bulletLines / lines.length < 0.2) {
    findings.push({
      severity: 'warn',
      label: 'Few bullet points',
      detail: `Only ${bulletLines} of ${lines.length} lines start with a bullet. ATS skims achievement bullets — convert prose to bullets where you can.`,
    });
  } else if (bulletLines > 0) {
    findings.push({
      severity: 'good',
      label: 'Bulleted achievements present',
      detail: `${bulletLines} bullet point${bulletLines === 1 ? '' : 's'} detected.`,
    });
  }

  // 5. Quantification — does the resume have any numbers?
  const numbers = (t.match(/\d+%|\$\s?\d|\d+\s?(k|m|b)\b|\d{2,}/gi) ?? []).length;
  if (numbers < 4) {
    findings.push({
      severity: 'warn',
      label: 'Not enough quantification',
      detail: `Only ${numbers} numeric mention${numbers === 1 ? '' : 's'} detected. Adding "$3M saved", "12 engineers", "p99 by 40%" lifts both ATS keyword density and recruiter scan signal.`,
    });
  } else {
    findings.push({
      severity: 'good',
      label: 'Numbers and outcomes present',
      detail: `${numbers} quantified mentions.`,
    });
  }

  // 6. ATS-hostile constructs (tables, images, columns hinted by pipes).
  const pipeLines = lines.filter((l) => l.includes('|') && l.split('|').length >= 3).length;
  if (pipeLines >= 3) {
    findings.push({
      severity: 'warn',
      label: 'Many table-like rows',
      detail: `${pipeLines} pipe-delimited rows detected. Some ATS parse them, many flatten them — prefer plain bullets for guaranteed parsing.`,
    });
  }

  // 7. Date formatting — at least one year present.
  const years = (t.match(/\b(19|20)\d{2}\b/g) ?? []).length;
  if (years < 2) {
    findings.push({
      severity: 'warn',
      label: 'Few dates',
      detail: `Only ${years} year${years === 1 ? '' : 's'} mentioned. Roles without start–end dates often get filtered.`,
    });
  } else {
    findings.push({
      severity: 'good',
      label: 'Dates present',
      detail: `${years} years referenced.`,
    });
  }

  // Score: start at 100, deduct for warnings (5) and fails (15).
  let score = 100;
  for (const f of findings) {
    if (f.severity === 'warn') score -= 5;
    if (f.severity === 'fail') score -= 15;
  }
  score = Math.max(0, Math.min(100, score));

  return { score, findings };
}

export function useAtsCheckPageSourceState() {
  const [text, setText] = useState('');
  const result = useMemo(() => (text.trim() ? analyze(text) : null), [text]);

  return { text, setText, result };
}

export default function AtsCheckPage() {
  return <AtsCheckPageView {...useAtsCheckPageSourceState()} />;
}
