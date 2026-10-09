import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TailorFlow } from '@/components/tailor-flow';
import { tailorResumeForClient } from '@/lib/actions/tailor-action';
import { saveTailoredResume } from '@/lib/actions/job-actions';
import { localCreateResume, localSaveJob, localGetTailoredResumes } from '@/lib/local-storage';
import type { JobApplication, Resume } from '@/lib/types';
const auth = vi.hoisted(() => ({ isGuest: true, isPending: false }));
vi.mock('@/components/auth-provider', () => ({ useAuth: () => auth }));
vi.mock('@/components/token-balance-provider', () => ({
  useTokenBalance: () => ({ balance: 3, refreshBalance: vi.fn() }),
}));
vi.mock('@/lib/actions/tailor-action', () => ({ tailorResumeForClient: vi.fn() }));
vi.mock('@/lib/actions/job-actions', () => ({ saveTailoredResume: vi.fn() }));
vi.mock('@/lib/actions/fit-score-action', () => ({ generateFitScoreForClient: vi.fn() }));
vi.mock('@/components/fit-score-card', () => ({ FitScoreCard: () => null }));
vi.mock('@/components/skills-roadmap', () => ({ SkillsRoadmapPanel: () => null }));
vi.mock('@/components/share-score-button', () => ({ ShareScoreButton: () => null }));
const master =
  '# Alex Morgan\n\n## Projects\n### Reader\n- Built a reading queue.\n\n## Education\nBSc, Example University.\n';
const generated = master.replace(
  '## Projects',
  '## Summary\nSoftware engineer building reading tools from supplied project experience.\n\n## Projects'
);
let job: JobApplication, resume: Resume;
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  auth.isGuest = true;
  const id = localCreateResume('Master', master);
  const jobId = 'auto-history-job';
  localSaveJob(
    jobId,
    'Example Co',
    'Engineer',
    id,
    '',
    '',
    'Build React and TypeScript interfaces, integrate APIs, and improve frontend tests. Ship readable user experiences for customers.'
  );

  resume = { id, name: 'Master', source: master, created_at: 1, updated_at: 1 };
  job = {
    id: jobId,
    resume_id: id,
    url: '',
    company: 'Example Co',
    role: 'Engineer',
    jd_raw: '',
    jd_text:
      'Build React and TypeScript interfaces, integrate APIs, and improve frontend tests. Ship readable user experiences for customers.',
    status: 'draft',
    interview_date: null,
    follow_up_at: null,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    offer_amount: null,
    notes: null,
    rejection_reason: null,
    created_at: 1,
    updated_at: 1,
  };
  vi.mocked(tailorResumeForClient).mockResolvedValue({
    success: true,
    data: { tailored: generated, changes: [] },
  });
});
function mount() {
  render(
    <TailorFlow
      jobId={job.id}
      job={job}
      serverResume={resume}
      serverResumes={[resume]}
      serverStashEntries={[]}
      serverEvidence={[]}
      existingTailored={[]}
    />
  );
}
describe('generated resume history', () => {
  it('automatically stores guest generation and does not duplicate an unchanged Save', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Generate Tailored Resume' }));
    await waitFor(() => expect(localGetTailoredResumes(job.id)).toHaveLength(1));
    expect(localGetTailoredResumes(job.id)[0].source).toBe(generated);
    const save = await screen.findByRole('button', { name: 'Accept & Save' });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('already saved'));
    expect(localGetTailoredResumes(job.id)).toHaveLength(1);
    expect(saveTailoredResume).not.toHaveBeenCalled();
  });
  it('retains generated output after cloud storage failure and retries saving without another AI call', async () => {
    auth.isGuest = false;
    vi.mocked(saveTailoredResume)
      .mockRejectedValueOnce(new Error('Storage failed'))
      .mockResolvedValueOnce('saved-version');
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Generate Tailored Resume' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('could not be saved to History')
    );
    expect(screen.getByTitle('Resume document preview').getAttribute('srcdoc')).toContain(
      'Software engineer building reading tools'
    );
    const save = await screen.findByRole('button', { name: 'Accept & Save' });
    await waitFor(() => expect(save).not.toBeDisabled());
    fireEvent.click(save);
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Saved to History')
    );
    expect(tailorResumeForClient).toHaveBeenCalledTimes(1);
    expect(saveTailoredResume).toHaveBeenCalledTimes(2);
    expect(localGetTailoredResumes(job.id)).toHaveLength(0);
  });
});
