'use server';

import { getJobApplication } from '@/lib/actions/job-actions';
import { getResume, listResumes } from '@/lib/actions/resume-actions';
import { tailorResumeForClient } from '@/lib/actions/tailor-action';
import { recordResumeHistory } from '@/lib/actions/resume-history-actions';
import { getCurrentUserId } from '@/lib/auth-utils';
import { extractPublicJob } from '@/lib/public-job-extraction';
import { resolveJobReference, resumeAssistantSchema } from '@/lib/resume-assistant-input';
import { markdownToHtml } from '@/lib/resume-html';

export async function listResumeAssistantProfiles() {
  if (!(await getCurrentUserId()))
    return {
      ok: false,
      code: 'sign_in_required',
      error: 'Sign in to list cloud profiles, or supply resume_markdown directly when tailoring.',
    };
  return { ok: true, profiles: (await listResumes()).map(({ id, name }) => ({ id, name })) };
}

/** Returns a portable draft. Guest calls have no D1 writes and no saved IDs. */
export async function tailorResumeFromReference(raw: unknown, historyByDefault = false) {
  const parsed = resumeAssistantSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      code: 'invalid_input',
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  const input = parsed.data;
  let ref: ReturnType<typeof resolveJobReference>;
  try {
    ref = resolveJobReference(input);
  } catch (error) {
    return {
      ok: false,
      code: 'invalid_reference',
      error: error instanceof Error ? error.message : 'Invalid job reference.',
    };
  }
  const userId = await getCurrentUserId();
  if (input.save_to_history === true && !userId)
    return {
      ok: false,
      code: 'sign_in_required',
      error: 'Sign in to save cloud history, or omit save_to_history for a stateless draft.',
    };
  const saveHistory = input.save_to_history ?? (historyByDefault && Boolean(userId));
  if ((input.resume_id || input.source === 'rolepatch') && !userId)
    return {
      ok: false,
      code: 'sign_in_required',
      error:
        'Saved IDs require a signed-in RolePatch session. Otherwise supply resume_markdown and the public job URL or description.',
    };
  if (input.resume_id && input.resume_markdown)
    return {
      ok: false,
      code: 'invalid_input',
      error: 'Choose resume_id or resume_markdown, not both.',
    };
  try {
    const job = ref.savedId ? await getJobApplication(ref.savedId) : null;
    if (ref.savedId && !job) return { ok: false, code: 'not_found', error: 'Saved job not found.' };
    // A saved job uses its linked base unless the caller explicitly chooses another.
    const resumeId = input.resume_id ?? (input.resume_markdown ? undefined : job?.resume_id);
    let resumeSource = input.resume_markdown;
    let historyResumeId = resumeId;
    if (resumeId) {
      const resume = await getResume(resumeId);
      if (!resume) return { ok: false, code: 'not_found', error: 'Resume not found.' };
      resumeSource = resume.source;
    }
    if (!resumeSource && userId) {
      const profiles = await listResumes();
      if (profiles.length !== 1)
        return {
          ok: false,
          code: 'choose_resume',
          error: 'Choose a base resume or supply resume_markdown.',
          profiles: profiles.map(({ id, name }) => ({ id, name })),
        };
      resumeSource = profiles[0].source;
      historyResumeId = profiles[0].id;
    }
    if (!resumeSource)
      return {
        ok: false,
        code: 'resume_required',
        error: 'Supply your base resume_markdown. It is required for each stateless guest call.',
      };
    let jdText = input.jd_text ?? job?.jd_text ?? '';
    if (!jdText.trim() && ref.url) {
      try {
        jdText = await extractPublicJob(ref.url);
      } catch {
        return {
          ok: false,
          code: 'extraction_failed',
          error:
            'Could not read this public posting. Paste jd_text to continue; login and CAPTCHA checks are not bypassed.',
        };
      }
    }
    if (jdText.trim().length < 100)
      return {
        ok: false,
        code: 'description_required',
        error: 'Paste at least 100 characters of jd_text to continue.',
      };
    const result = await tailorResumeForClient(
      resumeSource,
      jdText,
      { endpointUrl: '', apiKey: '', model: '' },
      userId ? undefined : ''
    );
    if (!result.success)
      return {
        ok: false,
        code: 'generation_failed',
        error: result.error,
        retryable: result.retryable,
      };
    const draftId = crypto.randomUUID();
    let history:
      | Awaited<ReturnType<typeof recordResumeHistory>>
      | { saved: false; error?: string } = { saved: false };
    if (saveHistory) {
      try {
        history = await recordResumeHistory({
          resume_id: historyResumeId,
          resume_source: historyResumeId ? undefined : resumeSource,
          job_id: job && jdText.trim() === job.jd_text.trim() ? job.id : undefined,
          job_url: ref.url ?? job?.url ?? '',
          company: input.company_name ?? job?.company ?? '',
          role: input.role_title ?? job?.role ?? '',
          jd_text: jdText,
          source: result.data.tailored,
          changes: result.data.changes,
        });
      } catch {
        history = {
          saved: false,
          error:
            'Your resume was generated but could not be saved to History. Keep this response; generating again uses another token.',
        };
      }
    }
    return {
      ok: true,
      draft_id: history.saved ? history.id : draftId,
      requires_review: true,
      persisted: history.saved,
      history,
      job_url: ref.url ?? job?.url ?? null,
      markdown: result.data.tailored,
      changes: result.data.changes,
      generation_method: result.data.generation_method ?? 'ai',
      ...(input.format === 'html'
        ? { html: markdownToHtml(result.data.tailored, 'Tailored resume') }
        : {}),
    };
  } catch {
    return {
      ok: false,
      code: 'preparation_failed',
      error:
        'Could not prepare the draft. Check the job source and board slug, or paste jd_text. Your base resume has not been changed.',
    };
  }
}
