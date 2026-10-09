'use client';

import Link from 'next/link';
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';

import { ATSScoreBadge } from '@/components/ats-score-badge';
import { useAuth } from '@/components/auth-provider';
import { FitScoreCard } from '@/components/fit-score-card';
import { LocalResumeExport } from '@/components/local-resume-export';
import { ResumeDiff } from '@/components/resume-diff';
import { ResumeStudioPreview } from '@/components/resume-studio-preview';
import { ShareScoreButton } from '@/components/share-score-button';
import { SkillsRoadmapPanel } from '@/components/skills-roadmap';
import { useTokenBalance } from '@/components/token-balance-provider';
import {
  formatEvidenceBullet,
  rankEvidenceForJob,
  scoreEvidenceQuality,
} from '@/lib/achievement-evidence';
import { generateFitScoreForClient } from '@/lib/actions/fit-score-action';
import { saveTailoredResume } from '@/lib/actions/job-actions';
import { tailorResumeForClient } from '@/lib/actions/tailor-action';
import { type ATSResult, calculateATSScore } from '@/lib/ats-score';
import {
  localGetFitScore,
  localGetJob,
  localGetTailoredResumes,
  localListAchievementEvidence,
  localListResumes,
  localListStashEntries,
  localSaveFitScore,
  localSaveTailoredResume,
} from '@/lib/local-storage';
import type {
  AchievementEvidence,
  JobApplication,
  Resume,
  StashEntry,
  TailorChange,
  TailoredResume,
} from '@/lib/types';
import type { FitScore } from '@/lib/types';

interface TailorFlowProps {
  initialVersionId?: string;
  jobId: string;
  job: JobApplication | null;
  serverResume: Resume | null;
  serverResumes: Resume[];
  serverStashEntries: StashEntry[];
  serverEvidence: AchievementEvidence[];
  existingTailored: TailoredResume[];
  existingFitScore?: FitScore | null;
}

export function TailorFlow(props: TailorFlowProps) {
  const {
    jobId,
    job,
    serverResume,
    serverResumes,
    serverStashEntries,
    serverEvidence,
    existingTailored,
    existingFitScore,
    initialVersionId,
  } = props;
  const { isGuest, isPending: authPending } = useAuth();
  const [showDiff, setShowDiff] = useState(false);
  const [showJobContext, setShowJobContext] = useState(false);
  const [activeJob, setActiveJob] = useState<JobApplication | null>(job);
  const [resumes, setResumes] = useState(serverResumes);
  const [resume, setResume] = useState<Resume | null>(serverResume);
  const [selectedResumeId, setSelectedResumeId] = useState(
    existingTailored.find((item) => item.id === initialVersionId)?.resume_id ??
      serverResume?.id ??
      job?.resume_id ??
      serverResumes[0]?.id ??
      ''
  );
  const [historyReady, setHistoryReady] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersionId ?? '');
  const [historySaveError, setHistorySaveError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [stashEntries, setStashEntries] = useState(serverStashEntries);
  const [evidenceEntries, setEvidenceEntries] = useState(serverEvidence);
  const [tailoredList, setTailoredList] = useState(existingTailored);
  const { balance: tokenBalance, refreshBalance } = useTokenBalance();
  const [fitScore, setFitScore] = useState<FitScore | null>(existingFitScore ?? null);
  const [fitScoreLoading, setFitScoreLoading] = useState(false);
  const [fitScoreError, setFitScoreError] = useState<string | null>(null);

  // Intentional: hydrate from localStorage for guest users after auth context resolves
  useEffect(() => {
    if (authPending) return;
    setHistoryReady(true);
    if (isGuest) {
      const localJob = localGetJob(jobId);
      const localResumes = localListResumes();
      const localTailored = localGetTailoredResumes(jobId);
      const requested = localTailored.find((item) => item.id === initialVersionId);
      if (
        requested &&
        selectedVersionId === initialVersionId &&
        selectedResumeId !== requested.resume_id
      )
        setSelectedResumeId(requested.resume_id);
      const localFitScore = localGetFitScore(jobId);
      setActiveJob(localJob);
      setResumes(localResumes);
      setStashEntries(localListStashEntries());
      setEvidenceEntries(localListAchievementEvidence());
      if (!selectedResumeId && localJob?.resume_id) setSelectedResumeId(localJob.resume_id);
      if (!selectedResumeId && localResumes[0]) setSelectedResumeId(localResumes[0].id);
      if (localTailored.length > 0) setTailoredList(localTailored);
      if (localFitScore) setFitScore(localFitScore);
    }
  }, [authPending, isGuest, jobId, selectedResumeId, initialVersionId, selectedVersionId]);

  useEffect(() => {
    if (!selectedResumeId) {
      setResume(null);
      return;
    }
    const selected = resumes.find((item) => item.id === selectedResumeId) ?? null;
    setResume(selected);
  }, [resumes, selectedResumeId]);

  const latestTailored =
    tailoredList.find(
      (item) => item.id === selectedVersionId && item.resume_id === selectedResumeId
    ) ??
    tailoredList.find((item) => item.resume_id === selectedResumeId) ??
    null;
  const [tailoredSource, setTailoredSource] = useState<string | null>(
    latestTailored?.source ?? null
  );
  const [changes, setChanges] = useState<TailorChange[]>(latestTailored?.changes ?? []);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const remixOptions = useMemo(() => {
    const rankedEvidence = activeJob
      ? rankEvidenceForJob(evidenceEntries, activeJob.role, activeJob.jd_text)
          .filter((entry) => entry.quality !== 'weak')
          .slice(0, 6)
      : [];
    return [
      ...stashEntries.map((entry) => ({
        id: `stash:${entry.id}`,
        type: 'Saved experience',
        category: entry.category,
        label: entry.label,
        content: `### [${entry.category}] ${entry.label}\n${entry.content}`,
        defaultSelected: entry.category === 'projects',
      })),
      ...rankedEvidence.map((entry) => ({
        id: `evidence:${entry.id}`,
        type: 'Evidence',
        category: entry.impact_type,
        label: entry.title,
        content: `- ${entry.title}: ${formatEvidenceBullet(entry)}`,
        defaultSelected: scoreEvidenceQuality(entry) === 'strong',
      })),
    ];
  }, [activeJob, evidenceEntries, stashEntries]);
  const [selectedRemixIds, setSelectedRemixIds] = useState<Set<string>>(new Set());

  // Sync tailoredSource when tailoredList updates from localStorage
  useEffect(() => {
    const latest =
      tailoredList.find(
        (item) => item.id === selectedVersionId && item.resume_id === selectedResumeId
      ) ??
      tailoredList.find((item) => item.resume_id === selectedResumeId) ??
      (selectedResumeId ? null : (tailoredList[0] ?? null));
    setTailoredSource(latest?.source ?? null);
    setChanges(latest?.changes ?? []);
  }, [tailoredList, selectedResumeId, selectedVersionId]);

  useEffect(() => {
    setSelectedRemixIds((prev) => {
      const available = new Set(remixOptions.map((option) => option.id));
      if (prev.size > 0) {
        return new Set([...prev].filter((id) => available.has(id)));
      }
      const defaults = remixOptions
        .filter((option) => option.defaultSelected)
        .map((option) => option.id);
      return new Set(defaults.length > 0 ? defaults : remixOptions.map((option) => option.id));
    });
  }, [remixOptions]);

  const remixContent = useMemo(
    () =>
      remixOptions
        .filter((option) => selectedRemixIds.has(option.id))
        .map((option) => option.content)
        .join('\n\n'),
    [remixOptions, selectedRemixIds]
  );

  // ATS scores -- recalculate when resume/tailored/JD changes
  const originalATS = useMemo(
    () => (resume && activeJob ? calculateATSScore(resume.source, activeJob.jd_text) : null),
    [resume, activeJob]
  );

  const tailoredATS = useMemo(
    () =>
      tailoredSource && activeJob ? calculateATSScore(tailoredSource, activeJob.jd_text) : null,
    [tailoredSource, activeJob]
  );

  // Cache ATS scores to localStorage so the dashboard can display them
  useEffect(() => {
    if (tailoredATS && tailoredATS.totalKeywords > 0) {
      try {
        const cache = JSON.parse(localStorage.getItem('rt-ats-scores') ?? '{}');
        cache[jobId] = { original: originalATS?.score ?? 0, tailored: tailoredATS.score };
        localStorage.setItem('rt-ats-scores', JSON.stringify(cache));
      } catch {
        /* ignore */
      }
    }
  }, [jobId, originalATS, tailoredATS]);

  function handleGenerate() {
    if (authPending || !resume || !activeJob) return;

    // If signed-in user has no tokens, don't attempt generation
    if (!isGuest && tokenBalance !== null && tokenBalance <= 0) {
      setError('No tokens remaining.');
      return;
    }

    setError(null);
    setHistorySaveError('');
    setSavedNotice('');
    startTransition(async () => {
      try {
        const aiConfig = readAiConfig();
        const response = await tailorResumeForClient(
          resume.source,
          activeJob.jd_text,
          aiConfig,
          remixContent
        );
        if (!response.success) throw new Error(response.error);
        const result = response.data;
        setTailoredSource(result.tailored);
        setChanges(result.changes ?? []);
        try {
          await persistVersion(result.tailored, result.changes ?? []);
        } catch {
          setHistorySaveError(
            'Your resume was generated but could not be saved to History. Use Save to retry without generating again.'
          );
        }

        // Refresh token balance after successful generation
        if (!isGuest) {
          void refreshBalance();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate tailored resume';
        if (message.includes('No tokens remaining') || message.includes('insufficient_tokens')) {
          setError('No tokens remaining.');
          void refreshBalance();
        } else {
          setError(message);
        }
      }
    });
  }

  async function persistVersion(source: string, versionChanges: TailorChange[]) {
    if (!resume) return;
    const id = isGuest
      ? localSaveTailoredResume(jobId, resume.id, source, versionChanges)
      : await saveTailoredResume(jobId, resume.id, source, versionChanges);
    const now = Math.floor(Date.now() / 1000);
    const version: TailoredResume = {
      id,
      job_id: jobId,
      resume_id: resume.id,
      source,
      changes: versionChanges,
      accepted: 0,
      created_at: now,
      updated_at: now,
    };
    setSelectedVersionId(id);
    setTailoredList((prev) => [version, ...prev]);
    setHistorySaveError('');
    setSavedNotice('Saved to History. Review before use.');
  }

  function handleSave() {
    if (authPending || !tailoredSource || !resume) return;
    startTransition(async () => {
      try {
        const current = tailoredList.find((item) => item.id === selectedVersionId);
        if (current?.source === tailoredSource) {
          setSavedNotice('This version is already saved to History.');
          return;
        }
        await persistVersion(tailoredSource, changes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save tailored resume');
      }
    });
  }

  if (!activeJob) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted-foreground)]">
        Job not found. It may have been deleted.
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted-foreground)]">
        Resume not found. It may have been deleted.
      </div>
    );
  }

  function handleFitScore() {
    if (!resume || !activeJob) return;
    setFitScoreLoading(true);
    setFitScoreError(null);
    const aiConfig = readAiConfig();
    generateFitScoreForClient(resume.source, activeJob.jd_text, jobId, aiConfig)
      .then((result) => {
        if (!result.success) {
          setFitScoreError(result.error);
          return;
        }
        setFitScore(result.data);
        if (isGuest) {
          localSaveFitScore(result.data);
        } else {
          void refreshBalance();
        }
      })
      .catch(() => setFitScoreError('Could not analyze job fit. Please try again.'))
      .finally(() => setFitScoreLoading(false));
  }

  return (
    <div className="precision-flow">
      {tailoredList.length > 0 && (
        <VersionHistoryBar
          versions={tailoredList}
          value={selectedVersionId || latestTailored?.id || ''}
          onSelect={(version) => {
            setSelectedVersionId(version.id);
            setSelectedResumeId(version.resume_id);
            setSavedNotice('');
          }}
        />
      )}
      <HistoryNotices
        missingVersion={
          Boolean(initialVersionId) &&
          !authPending &&
          historyReady &&
          !tailoredList.some((item) => item.id === initialVersionId)
        }
        hasSavedVersions={tailoredList.length > 0}
        historySaveError={historySaveError}
        savedNotice={savedNotice}
      />
      <section className="precision-job-context" aria-label="Target job">
        <div>
          <h2>{activeJob.role}</h2>
          <p>
            {activeJob.company} · Base: {resume.name}
          </p>
        </div>
        <p>{tailoredSource ? 'Draft / Review before use' : 'Base resume / Ready to tailor'}</p>
      </section>
      <div className="precision-panels">
        {/* Left panel: Job Description */}
        <div className="precision-job-rail">
          <button
            type="button"
            aria-expanded={showJobContext}
            aria-controls="job-preparation"
            onClick={() => setShowJobContext(!showJobContext)}
            className="precision-context-toggle"
          >
            {showJobContext
              ? 'Hide job description and preparation'
              : 'View job description and preparation'}
          </button>
          <div
            id="job-preparation"
            className={`precision-preparation ${showJobContext ? 'is-open' : ''}`}
          >
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]/50">
              <h2 className="text-sm font-semibold text-foreground">Job Description</h2>
              {activeJob.url && (
                <a
                  href={activeJob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline truncate block"
                >
                  {activeJob.url}
                </a>
              )}
            </div>
            <div className="precision-job-content space-y-4">
              <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                {activeJob.jd_text}
              </pre>

              <RemixOptionsPanel
                options={remixOptions}
                selectedIds={selectedRemixIds}
                onChange={setSelectedRemixIds}
              />

              {/* Fit Score + Interview Prep section */}
              <div className="border-t border-[var(--border)] pt-4 space-y-3">
                {fitScore ? (
                  <FitScoreCard fitScore={fitScore} />
                ) : (
                  <button
                    onClick={handleFitScore}
                    disabled={fitScoreLoading || !resume}
                    className="w-full px-3 py-2.5 text-sm font-medium rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)] hover:bg-[var(--primary)]/10 disabled:opacity-40 transition-colors"
                  >
                    {fitScoreLoading ? 'Analyzing fit...' : 'Analyze Job Fit'}
                  </button>
                )}
                {fitScoreError && (
                  <p role="alert" className="text-sm text-[var(--foreground)]">
                    {fitScoreError}
                  </p>
                )}
                <Link
                  href={`/interview-prep/${jobId}`}
                  className="block w-full px-3 py-2.5 text-sm font-medium rounded-xl border border-[var(--border)]/60 text-[var(--muted-foreground)] hover:bg-muted/10 transition-colors text-center"
                >
                  Interview Prep (STAR Stories)
                </Link>
              </div>

              {/* Skills gap learning roadmap */}
              <div className="border-t border-[var(--border)] pt-4">
                <SkillsRoadmapPanel job={activeJob} resume={resume} />
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: Resume / Tailored output */}
        <div className="precision-output flex flex-col">
          <div className="precision-toolbar flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {tailoredSource ? 'Tailored resume' : 'Your base resume'}
                </h2>
                {resumes.length > 1 ? (
                  <select
                    aria-label="Base resume"
                    value={selectedResumeId}
                    onChange={(event) => {
                      setSelectedResumeId(event.target.value);
                      setFitScore(null);
                    }}
                    className="mt-1 max-w-52 rounded-md border border-[var(--border)] bg-background px-2 py-1 text-xs text-[var(--muted-foreground)]"
                  >
                    {resumes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)]">{resume.name}</p>
                )}
              </div>

              {/* ATS Score badges */}
              <ATSComparison original={originalATS} tailored={tailoredATS} />
            </div>
            <GenerateControls
              isGuest={isGuest}
              tokenBalance={tokenBalance}
              jobId={jobId}
              tailoredSource={tailoredSource}
              resumeName={resume.name}
              shareTailoredId={tailoredATS ? latestTailored?.id : undefined}
              isPending={isPending}
              authPending={authPending}
              onSave={handleSave}
              onGenerate={handleGenerate}
            />
          </div>

          <TailorErrorBanner error={error} />

          <ResumeView
            original={resume.source}
            tailoredSource={tailoredSource}
            changes={changes}
            showDiff={showDiff}
            onShowDiffChange={setShowDiff}
            onTailoredChange={setTailoredSource}
          />
        </div>
      </div>
    </div>
  );
}

function readAiConfig() {
  const settings = JSON.parse(localStorage.getItem('ai-settings') ?? '{}');
  return {
    endpointUrl: settings.endpointUrl || '',
    apiKey: settings.apiKey || '',
    model: settings.model || '',
  };
}

function VersionHistoryBar({
  versions,
  value,
  onSelect,
}: {
  versions: TailoredResume[];
  value: string;
  onSelect: (version: TailoredResume) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[var(--border)] text-sm">
      <label htmlFor="resume-history-version" className="font-bold">
        Saved resume version
      </label>
      <select
        id="resume-history-version"
        className="input-base max-w-full"
        value={value}
        onChange={(event) => {
          const version = versions.find((item) => item.id === event.target.value);
          if (version) onSelect(version);
        }}
      >
        {versions.map((version, index) => (
          <option key={version.id} value={version.id}>
            {index === 0 ? 'Latest' : `Version ${versions.length - index}`} ·{' '}
            {new Date(version.created_at * 1000).toLocaleString()}
          </option>
        ))}
      </select>
      <Link
        href="/dashboard#history"
        className="min-h-11 inline-flex items-center font-medium text-primary hover:underline"
      >
        Back to History
      </Link>
    </div>
  );
}

interface RemixOption {
  id: string;
  type: string;
  category: string;
  label: string;
}

function RemixOptionsPanel({
  options,
  selectedIds,
  onChange,
}: {
  options: RemixOption[];
  selectedIds: Set<string>;
  onChange: Dispatch<SetStateAction<Set<string>>>;
}) {
  if (options.length === 0) return null;
  return (
    <div className="border-t border-[var(--border)] pt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted-foreground)]">
          Include extra experience
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(new Set(options.map((option) => option.id)))}
            className="text-[10px] font-bold text-[var(--primary)] hover:underline"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="text-[10px] font-bold text-[var(--muted-foreground)] hover:text-foreground"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {options.map((option) => {
          const checked = selectedIds.has(option.id);
          return (
            <label
              key={option.id}
              className={`block rounded-xl border p-3 text-left transition-colors ${
                checked
                  ? 'border-[var(--primary)]/40 bg-[var(--primary)]/5'
                  : 'border-[var(--border)]/70 hover:bg-muted/10'
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    onChange((prev) => {
                      const next = new Set(prev);
                      if (event.target.checked) next.add(option.id);
                      else next.delete(option.id);
                      return next;
                    });
                  }}
                  className="mt-0.5 accent-[var(--primary)]"
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">
                    {option.type} · {option.category}
                  </span>
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ATSComparison({
  original,
  tailored,
}: {
  original: ATSResult | null;
  tailored: ATSResult | null;
}) {
  if (!original || original.totalKeywords <= 0) return null;
  return (
    <div className="flex items-center gap-2">
      <ATSScoreBadge
        score={original.score}
        matchedKeywords={original.matchedKeywords}
        missingKeywords={original.missingKeywords}
        label="Original keywords"
      />
      {tailored && (
        <>
          <span className="text-[var(--muted-foreground)] text-xs">{'→'}</span>
          <ATSScoreBadge
            score={tailored.score}
            matchedKeywords={tailored.matchedKeywords}
            missingKeywords={tailored.missingKeywords}
            label="Tailored keywords"
          />
        </>
      )}
    </div>
  );
}

interface GenerateControlsProps {
  isGuest: boolean;
  tokenBalance: number | null;
  jobId: string;
  tailoredSource: string | null;
  resumeName: string;
  shareTailoredId: string | undefined;
  isPending: boolean;
  authPending: boolean;
  onSave: () => void;
  onGenerate: () => void;
}

function GenerateControls(props: GenerateControlsProps) {
  const {
    isGuest,
    tokenBalance,
    jobId,
    tailoredSource,
    resumeName,
    shareTailoredId,
    isPending,
    authPending,
    onSave,
    onGenerate,
  } = props;
  const showNoTokens = !isGuest && tokenBalance !== null && tokenBalance <= 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Token balance indicator for signed-in users */}
      {!isGuest && tokenBalance !== null && (
        <span className="text-xs text-[var(--muted-foreground)] mr-1">
          Uses 1 token ({tokenBalance} remaining)
        </span>
      )}
      <Link
        href={`/cover-letter/${jobId}`}
        className="inline-flex items-center min-h-[44px] md:min-h-0 px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--border)] text-foreground hover:bg-[var(--muted)] transition-colors"
      >
        Generate Cover Letter
      </Link>
      {tailoredSource && (
        <>
          <button
            onClick={onSave}
            disabled={isPending || authPending}
            className="min-h-[44px] md:min-h-0 px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--border)] text-foreground hover:bg-[var(--muted)] disabled:opacity-40 transition-colors"
          >
            {isPending ? 'Saving...' : 'Accept & Save'}
          </button>
          <LocalResumeExport source={tailoredSource} name={`${resumeName} tailored`} />
        </>
      )}
      {!isGuest && shareTailoredId && <ShareScoreButton tailoredId={shareTailoredId} />}
      {showNoTokens ? (
        <Link
          href="/pricing"
          className="inline-flex items-center min-h-[44px] md:min-h-0 px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent)] transition-colors"
        >
          Buy Tokens
        </Link>
      ) : (
        <button
          onClick={onGenerate}
          disabled={isPending || authPending}
          className="min-h-[44px] md:min-h-0 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-colors"
        >
          {isPending ? 'Generating...' : 'Generate Tailored Resume'}
        </button>
      )}
    </div>
  );
}

function TailorErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-sm text-red-700 flex items-center justify-between"
    >
      <span>{error}</span>
      {error.includes('No tokens remaining') && (
        <Link
          href="/pricing"
          className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent)]/80 underline ml-3"
        >
          Buy more tokens
        </Link>
      )}
    </div>
  );
}

function ResumeView({
  original,
  tailoredSource,
  changes,
  showDiff,
  onShowDiffChange,
  onTailoredChange,
}: {
  original: string;
  tailoredSource: string | null;
  changes: TailorChange[];
  showDiff: boolean;
  onShowDiffChange: (showDiff: boolean) => void;
  onTailoredChange: (source: string) => void;
}) {
  return (
    <>
      {tailoredSource && (
        <div
          role="group"
          className="flex gap-2 px-4 py-2 border-b bg-card"
          aria-label="Resume view"
        >
          <button
            type="button"
            aria-pressed={!showDiff}
            onClick={() => onShowDiffChange(false)}
            className={`min-h-11 px-3 rounded text-sm ${!showDiff ? 'bg-secondary text-primary font-semibold' : 'text-muted-foreground'}`}
          >
            Resume preview
          </button>
          <button
            type="button"
            aria-pressed={showDiff}
            onClick={() => onShowDiffChange(true)}
            className={`min-h-11 px-3 rounded text-sm ${showDiff ? 'bg-secondary text-primary font-semibold' : 'text-muted-foreground'}`}
          >
            Compare and edit changes
          </button>
        </div>
      )}
      <div className="precision-document-region">
        {tailoredSource && showDiff ? (
          <ResumeDiff
            original={original}
            modified={tailoredSource}
            onModifiedChange={onTailoredChange}
            changes={changes}
          />
        ) : (
          <ResumeStudioPreview
            source={tailoredSource || original}
            changes={tailoredSource ? changes : []}
            hasDraft={Boolean(tailoredSource)}
          />
        )}
      </div>
    </>
  );
}

function HistoryNotices({
  missingVersion,
  hasSavedVersions,
  historySaveError,
  savedNotice,
}: {
  missingVersion: boolean;
  hasSavedVersions: boolean;
  historySaveError: string;
  savedNotice: string;
}) {
  return (
    <>
      {missingVersion && (
        <p role="alert" className="px-4 py-3 text-sm text-destructive">
          The requested resume version was not found.{' '}
          {hasSavedVersions ? 'The latest saved version is shown.' : 'Your base resume is shown.'}
        </p>
      )}
      {historySaveError && (
        <p role="alert" className="px-4 py-3 text-sm text-destructive">
          {historySaveError}
        </p>
      )}
      {savedNotice && (
        <p role="status" className="px-4 py-3 text-sm">
          {savedNotice}
        </p>
      )}
    </>
  );
}
