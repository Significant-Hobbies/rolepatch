'use server';

import { generateText } from 'ai';
import { getAIProvider } from '@/lib/ai';
import type { AIProviderConfig } from '@/lib/types';
import { listStashEntries } from '@/lib/actions/stash-actions';

export async function tailorResume(
  resumeSource: string,
  jdText: string,
  aiConfig?: Partial<AIProviderConfig>,
): Promise<string> {
  const { provider, model } = getAIProvider(aiConfig);

  const stashEntries = await listStashEntries();
  let stashSection = '';
  if (stashEntries.length > 0) {
    const formatted = stashEntries
      .map((e) => `### [${e.category}] ${e.label}\n${e.content}`)
      .join('\n\n');
    stashSection = `\n\n## Additional Content Available (not currently in resume):\nThe following are extra content blocks the user has stashed. You may incorporate any of these into the tailored resume if they are relevant to the job description. Only use them if they genuinely strengthen the resume for this specific role.\n\n${formatted}`;
  }

  const { text } = await generateText({
    model: provider(model),
    system: `You are a resume tailoring expert. You receive a Markdown resume and a job description. Modify the resume content to better match the job while keeping the Markdown structure intact. Only modify content (summary, experience bullets, skills). Do not change headings or structure. Return ONLY the complete modified Markdown, no explanation.`,
    prompt: `## Base Resume (Markdown):\n${resumeSource}\n\n## Job Description:\n${jdText}${stashSection}\n\n## Instructions:\n- Emphasize relevant experience and skills that match the JD\n- Reword bullet points to use keywords from the JD where truthful\n- Reorder skills to prioritize those mentioned in the JD\n- If any stashed content is highly relevant to the JD, incorporate it naturally into the appropriate resume section\n- Keep it honest — do not fabricate experience`,
  });

  return text;
}
