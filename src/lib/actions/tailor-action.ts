'use server';

import { generateText } from 'ai';
import { getAIProvider } from '@/lib/ai';
import type { AIProviderConfig } from '@/lib/types';

export async function tailorResume(
  resumeSource: string,
  jdText: string,
  aiConfig?: Partial<AIProviderConfig>,
): Promise<string> {
  const { provider, model } = getAIProvider(aiConfig);

  const { text } = await generateText({
    model: provider(model),
    system: `You are a resume tailoring expert. You receive a Typst resume and a job description. Modify the resume content to better match the job while keeping the Typst structure and formatting intact. Only modify content sections (summary, experience bullets, skills). Do not change the Typst layout commands, show/set rules, or formatting. Return ONLY the complete modified Typst source, no explanation.`,
    prompt: `## Base Resume (Typst):\n${resumeSource}\n\n## Job Description:\n${jdText}\n\n## Instructions:\n- Emphasize relevant experience and skills that match the JD\n- Reword bullet points to use keywords from the JD where truthful\n- Reorder skills to prioritize those mentioned in the JD\n- Keep it honest — do not fabricate experience`,
  });

  return text;
}
