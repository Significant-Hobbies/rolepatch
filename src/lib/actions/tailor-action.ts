'use server';

import { generateObject } from 'ai';
import { z } from 'zod';

import { formatEvidenceForPrompt, rankEvidenceForJob } from '@/lib/achievement-evidence';
import { listAchievementEvidence } from '@/lib/actions/achievement-evidence-actions';
import { listStashEntries } from '@/lib/actions/stash-actions';
import { creditTokens, debitToken } from '@/lib/actions/token-actions';
import { AIServiceError, getAIModel, toUserFacingAIError } from '@/lib/ai';
import { getAIErrorDiagnostics } from '@/lib/ai-error-diagnostics';
import { trackActivated, trackCoreAction } from '@/lib/analytics';
import { getCurrentUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { groundTailorChanges, normalizeTailoredMarkdown } from '@/lib/tailor-changes';
import type { AIProviderConfig, TailorChange } from '@/lib/types';

const tailorSchema = z.object({
  tailored: z.string().min(1).max(40_000).describe('The complete modified Markdown resume'),
  changes: z
    .array(
      z.object({
        snippet: z
          .string()
          .min(1)
          .max(240)
          .describe('A short excerpt from the tailored resume that was added or modified'),
        reason: z
          .string()
          .min(1)
          .max(240)
          .describe('Why this edit was made — concise, human-readable'),
        jd_match: z
          .string()
          .max(120)
          .optional()
          .describe('The JD keyword, skill, or requirement this edit targets'),
      })
    )
    .max(8)
    .describe('One entry per meaningful edit, grounded in the job description'),
});

interface TailorResult {
  tailored: string;
  changes: TailorChange[];
}

type TailorActionResult =
  | { success: true; data: TailorResult }
  | { success: false; error: string; retryable: boolean };

/** Expected failures must be values: Next redacts thrown errors in production. */
export async function tailorResumeForClient(
  resumeSource: string,
  jdText: string,
  aiConfig: AIProviderConfig,
  stashContent?: string
): Promise<TailorActionResult> {
  try {
    return {
      success: true,
      data: await tailorResume(resumeSource, jdText, aiConfig, stashContent),
    };
  } catch (error) {
    if (error instanceof AIServiceError) {
      return { success: false, error: error.message, retryable: error.retryable };
    }
    if (
      error instanceof Error &&
      [
        'No tokens remaining. Purchase more to continue.',
        'Authentication required to generate.',
      ].includes(error.message)
    ) {
      return { success: false, error: error.message, retryable: false };
    }
    throw error;
  }
}

const MAX_RESUME_CHARS = 20_000;
const MAX_JD_CHARS = 15_000;
const MAX_STASH_CHARS = 10_000;

async function tailorResume(
  resumeSource: string,
  jdText: string,
  aiConfig: AIProviderConfig,
  stashContent?: string
): Promise<TailorResult> {
  resumeSource = resumeSource.slice(0, MAX_RESUME_CHARS);
  jdText = jdText.slice(0, MAX_JD_CHARS);
  if (stashContent !== undefined) stashContent = stashContent.slice(0, MAX_STASH_CHARS);
  // Debit token before AI call
  const userId = await getCurrentUserId();
  let debited = false;
  if (userId) {
    const result = await debitToken('tailor', 'pending');
    if (!result.success) {
      throw new Error(
        result.error === 'insufficient_tokens'
          ? 'No tokens remaining. Purchase more to continue.'
          : 'Authentication required to generate.'
      );
    }
    debited = true;
  }

  try {
    let stashSection = '';
    const hasExplicitStashContent = stashContent !== undefined;
    if (stashContent?.trim()) {
      stashSection = `\n\n## Additional Content Available (not currently in resume):\nThe following are extra content blocks the user has stashed. You may incorporate any of these into the tailored resume if they are relevant to the job description. Only use them if they genuinely strengthen the resume for this specific role.\n\n${stashContent}`;
    }

    const stashEntries = hasExplicitStashContent ? [] : await listStashEntries();
    if (stashEntries.length > 0) {
      const formatted = stashEntries
        .map((e) => `### [${e.category}] ${e.label}\n${e.content}`)
        .join('\n\n');
      stashSection = `\n\n## Additional Content Available (not currently in resume):\nThe following are extra content blocks the user has stashed. You may incorporate any of these into the tailored resume if they are relevant to the job description. Only use them if they genuinely strengthen the resume for this specific role.\n\n${formatted}`;
    }

    if (!hasExplicitStashContent && userId) {
      const evidenceEntries = await listAchievementEvidence();
      const rankedEvidence = rankEvidenceForJob(evidenceEntries, jdText.slice(0, 120), jdText)
        .filter((entry) => entry.quality !== 'weak')
        .slice(0, 6);
      if (rankedEvidence.length > 0) {
        stashSection += `\n\n## Achievement Evidence (verified proof points):\nUse only when relevant and truthful. Prefer strong quantified items.\n\n${formatEvidenceForPrompt(rankedEvidence)}`;
      }
    }

    const { object } = await generateObject({
      model: getAIModel(aiConfig),
      maxOutputTokens: Math.min(
        8192,
        Math.max(2048, Math.ceil((resumeSource.length + stashSection.length) / 3) + 1000)
      ),
      abortSignal: AbortSignal.timeout(90_000),
      schema: tailorSchema,
      system: `You are a resume tailoring expert. You receive a Markdown resume and a job description. Modify the resume content to better match the job while keeping the Markdown structure intact. Only modify content (summary, experience bullets, skills). Do not change headings or structure. Return valid Markdown with actual newline characters separating headings, paragraphs, and bullets. Never replace newlines with HTML <br> tags.

CRITICAL — never fabricate. Every skill, tool, technology, metric, role, or accomplishment in your output MUST already appear in the base resume or in the stashed/achievement content provided. You may rephrase, reframe, reorder, and emphasize what is already there using the job's language, but you must NOT invent or add anything the candidate has not demonstrated. Specifically: do not add a skill to the Skills list just because the job description mentions it — only keep and reorder skills the resume or stash already supports. If the resume lacks something the job wants, leave it out rather than inventing it. A tailored-but-truthful resume is the goal; an impressive-but-fabricated one is a failure.

Return a JSON object with:
- "tailored": the complete modified Markdown resume
- "changes": zero to eight actual edits. Copy each "snippet" literally from a new or modified phrase in the tailored resume (3-25 words, maximum 240 characters). Give one short "reason" (maximum 240 characters) and optionally the relevant "jd_match". Never put commentary inside a snippet or describe an edit you did not make. If the resume already fits, keep it and return an empty changes array. Do not manufacture edits to meet a quota.`,
      prompt: `## Base Resume (Markdown):\n${resumeSource}\n\n## Job Description:\n${jdText}${stashSection}\n\n## Instructions:\n- Emphasize relevant experience and skills that match the JD\n- Reword bullet points to use keywords from the JD ONLY where the resume/stash already supports that claim\n- Reorder existing skills to prioritize those mentioned in the JD — do NOT add new skills the resume/stash does not already contain\n- If any stashed content is highly relevant to the JD, incorporate it naturally into the appropriate resume section\n- Keep it honest — never fabricate skills, tools, technologies, metrics, or experience. If the candidate lacks something the JD asks for, omit it rather than invent it\n- For every edit you make, record a changes entry tying it back to the JD`,
    });

    // Analytics: core action + first-tailor activation. Best-effort, never
    // allowed to fail the request.
    trackCoreAction('tailor_completed', userId ?? undefined);
    if (userId) {
      try {
        const prior = await db.execute({
          sql: 'SELECT 1 FROM tailored_resumes WHERE user_id = ? LIMIT 1',
          args: [userId],
        });
        if (prior.rows.length === 0) {
          trackActivated(userId);
        }
      } catch {
        // Activation check is best-effort.
      }
    }

    const tailored = normalizeTailoredMarkdown(object.tailored);
    return {
      tailored,
      changes: groundTailorChanges(resumeSource, tailored, object.changes ?? []),
    };
  } catch (err) {
    // Never log provider payloads: they may contain resume text or credentials.
    console.error('tailor_generation_failed', getAIErrorDiagnostics(err));
    // Refund token on AI failure
    if (debited && userId) {
      await creditTokens(userId, 1, 'refund', 'ai_failure');
    }
    // Surface a user-facing, retryable error — never a raw provider stack.
    throw toUserFacingAIError(err);
  }
}
