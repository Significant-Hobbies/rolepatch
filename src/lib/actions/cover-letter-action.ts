'use server';

import { generateText } from 'ai';
import { getAIProvider } from '@/lib/ai';
import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import type { AIProviderConfig, CoverLetter } from '@/lib/types';
import { scrapeJobUrl } from './scrape-action';

async function researchCompany(companyUrl: string): Promise<string> {
  try {
    const result = await scrapeJobUrl(companyUrl);
    return result.text;
  } catch {
    return '';
  }
}

export async function generateCoverLetter(
  resumeSource: string,
  jdText: string,
  company: string,
  jobId: string,
  resumeId: string,
  aiConfig?: Partial<AIProviderConfig>,
): Promise<string> {
  const { provider, model } = getAIProvider(aiConfig);

  // Research company
  let companyResearch = '';
  const domain = company.toLowerCase().replace(/\s+/g, '');
  const searchUrls = [
    `https://www.${domain}.com/about`,
    `https://www.${domain}.com/careers`,
  ];
  for (const url of searchUrls) {
    const research = await researchCompany(url);
    if (research) {
      companyResearch += research + '\n\n';
    }
  }

  const { text } = await generateText({
    model: provider(model),
    system: `You are a professional cover letter writer. Using the candidate's resume, the job description, and research about the company, write a compelling cover letter. Return ONLY the cover letter text, no explanation.`,
    prompt: `## Resume:\n${resumeSource}\n\n## Job Description:\n${jdText}\n\n## Company Research:\n${companyResearch || 'No research available.'}\n\n## Instructions:\n- Connect candidate's experience to the specific role\n- Reference company values/mission where genuine\n- Keep it concise (3-4 paragraphs)\n- Professional but not generic`,
  });

  // Save to DB
  const id = uuid();
  await db.execute({
    sql: `INSERT INTO cover_letters (id, job_id, resume_id, content, company_research)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, jobId, resumeId, text, companyResearch],
  });

  return text;
}

export async function getCoverLetter(jobId: string): Promise<CoverLetter | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM cover_letters WHERE job_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [jobId],
  });
  return (result.rows[0] as unknown as CoverLetter) ?? null;
}

export async function updateCoverLetter(id: string, content: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE cover_letters SET content = ?, updated_at = unixepoch() WHERE id = ?',
    args: [content, id],
  });
}
