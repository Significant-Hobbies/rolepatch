'use server';

import { getJobApplication } from '@/lib/actions/job-actions';
import { getResume, listResumes } from '@/lib/actions/resume-actions';
import { tailorResumeForClient } from '@/lib/actions/tailor-action';
import { recordResumeHistory } from '@/lib/actions/resume-history-actions';
import { getCurrentUserId } from '@/lib/auth-utils';
import { extractPublicJob } from '@/lib/public-job-extraction';
import {
  type ResumeAssistantInput,
  resolveJobReference,
  resumeAssistantSchema,
} from '@/lib/resume-assistant-input';
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

type ResumeAssistantFailure = {
  ok: false;
  code: string;
  error: string;
  profiles?: { id: string; name: string }[];
  retryable?: boolean;
};
type JobReference = ReturnType<typeof resolveJobReference>;
type SavedJob = Awaited<ReturnType<typeof getJobApplication>>;

function failure(code: string, error: string): ResumeAssistantFailure {
  return { ok: false, code, error };
}

function sessionFailure(
  input: ResumeAssistantInput,
  userId: string | null
): ResumeAssistantFailure | null {
  if (input.save_to_history === true && !userId)
    return failure(
      'sign_in_required',
      'Sign in to save cloud history, or omit save_to_history for a stateless draft.'
    );
  if ((input.resume_id || input.source === 'rolepatch') && !userId)
    return failure(
      'sign_in_required',
      'Saved IDs require a signed-in RolePatch session. Otherwise supply resume_markdown and the public job URL or description.'
    );
  if (input.resume_id && input.resume_markdown)
    return failure('invalid_input', 'Choose resume_id or resume_markdown, not both.');
  return null;
}

async function resolveResumeSource(
  input: ResumeAssistantInput,
  job: SavedJob,
  userId: string | null
): Promise<
  | { failure: ResumeAssistantFailure }
  | { failure?: undefined; resumeSource: string; historyResumeId: string | undefined }
> {
  // A saved job uses its linked base unless the caller explicitly chooses another.
  const resumeId = input.resume_id ?? (input.resume_markdown ? undefined : job?.resume_id);
  let resumeSource = input.resume_markdown;
  let historyResumeId = resumeId;
  if (resumeId) {
    const resume = await getResume(resumeId);
    if (!resume) return { failure: failure('not_found', 'Resume not found.') };
    resumeSource = resume.source;
  }
  if (!resumeSource && userId) {
    const profiles = await listResumes();
    if (profiles.length !== 1)
      return {
        failure: {
          ...failure('choose_resume', 'Choose a base resume or supply resume_markdown.'),
          profiles: profiles.map(({ id, name }) => ({ id, name })),
        },
      };
    resumeSource = profiles[0].source;
    historyResumeId = profiles[0].id;
  }
  if (!resumeSource)
    return {
      failure: failure(
        'resume_required',
        'Supply your base resume_markdown. It is required for each stateless guest call.'
      ),
    };
  return { resumeSource, historyResumeId };
}

async function resolveJobDescription(
  input: ResumeAssistantInput,
  job: SavedJob,
  ref: JobReference
): Promise<{ failure: ResumeAssistantFailure } | { failure?: undefined; jdText: string }> {
  let jdText = input.jd_text ?? job?.jd_text ?? '';
  if (!jdText.trim() && ref.url) {
    try {
      jdText = await extractPublicJob(ref.url);
    } catch {
      return {
        failure: failure(
          'extraction_failed',
          'Could not read this public posting. Paste jd_text to continue; login and CAPTCHA checks are not bypassed.'
        ),
      };
    }
  }
  if (jdText.trim().length < 100)
    return {
      failure: failure(
        'description_required',
        'Paste at least 100 characters of jd_text to continue.'
      ),
    };
  return { jdText };
}

async function saveDraftHistory(
  entry: Parameters<typeof recordResumeHistory>[0]
): Promise<Awaited<ReturnType<typeof recordResumeHistory>> | { saved: false; error?: string }> {
  try {
    return await recordResumeHistory(entry);
  } catch {
    return {
      saved: false,
      error:
        'Your resume was generated but could not be saved to History. Keep this response; generating again uses another token.',
    };
  }
}

/** Returns a portable draft. Guest calls have no D1 writes and no saved IDs. */
export async function tailorResumeFromReference(raw: unknown, historyByDefault = false) {
  const parsed = resumeAssistantSchema.safeParse(raw);
  if (!parsed.success)
    return failure(
      'invalid_input',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    );
  const input = parsed.data;
  let ref: JobReference;
  try {
    ref = resolveJobReference(input);
  } catch (error) {
    return failure(
      'invalid_reference',
      error instanceof Error ? error.message : 'Invalid job reference.'
    );
  }
  const userId = await getCurrentUserId();
  const rejected = sessionFailure(input, userId);
  if (rejected) return rejected;
  const saveHistory = input.save_to_history ?? (historyByDefault && Boolean(userId));
  try {
    const job = ref.savedId ? await getJobApplication(ref.savedId) : null;
    if (ref.savedId && !job) return failure('not_found', 'Saved job not found.');
    const resumeResult = await resolveResumeSource(input, job, userId);
    if (resumeResult.failure) return resumeResult.failure;
    const { resumeSource, historyResumeId } = resumeResult;
    const jdResult = await resolveJobDescription(input, job, ref);
    if (jdResult.failure) return jdResult.failure;
    const { jdText } = jdResult;
    const result = await tailorResumeForClient(
      resumeSource,
      jdText,
      { endpointUrl: '', apiKey: '', model: '' },
      userId ? undefined : ''
    );
    if (!result.success)
      return {
        ...failure('generation_failed', result.error),
        retryable: result.retryable,
      };
    const draftId = crypto.randomUUID();
    const history = saveHistory
      ? await saveDraftHistory({
          resume_id: historyResumeId,
          resume_source: historyResumeId ? undefined : resumeSource,
          job_id: job && jdText.trim() === job.jd_text.trim() ? job.id : undefined,
          job_url: ref.url ?? job?.url ?? '',
          company: input.company_name ?? job?.company ?? '',
          role: input.role_title ?? job?.role ?? '',
          jd_text: jdText,
          source: result.data.tailored,
          changes: result.data.changes,
        })
      : { saved: false as const };
    return {
      ok: true as const,
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
    return failure(
      'preparation_failed',
      'Could not prepare the draft. Check the job source and board slug, or paste jd_text. Your base resume has not been changed.'
    );
  }
}
