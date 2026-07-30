export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

import { AchievementEvidenceBank } from '@/components/achievement-evidence-bank';
import { listAchievementEvidence } from '@/lib/actions/achievement-evidence-actions';

export const metadata: Metadata = {
  title: 'Achievement Evidence Bank',
  description:
    'Save quantified achievement evidence once, then reuse it in tailored resumes, cover letters, interview stories, proof packets, and recruiter replies.',
  alternates: { canonical: 'https://rolepatch.com/evidence' },
};

export default async function EvidencePage() {
  const entries = await listAchievementEvidence();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <AchievementEvidenceBank serverEntries={entries} />
    </main>
  );
}
