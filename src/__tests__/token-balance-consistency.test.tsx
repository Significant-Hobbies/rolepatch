import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@/components/auth-provider';
import { TailorFlow } from '@/components/tailor-flow';
import { TokenBalance } from '@/components/token-balance';
import { generateFitScoreForClient } from '@/lib/actions/fit-score-action';
import { tailorResumeForClient } from '@/lib/actions/tailor-action';
import { getTokenBalance } from '@/lib/actions/token-actions';
import { localSaveJob } from '@/lib/local-storage';
import type { FitScore, JobApplication, Resume } from '@/lib/types';

const auth = vi.hoisted(() => ({ userId: 'account-a' as string | null, isPending: false }));
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: auth.userId ? { user: { id: auth.userId } } : null,
      isPending: auth.isPending,
    }),
  },
}));
vi.mock('@/lib/analytics', () => ({ trackSignup: vi.fn() }));
vi.mock('@/lib/actions/token-actions', () => ({ getTokenBalance: vi.fn() }));
vi.mock('@/lib/actions/tailor-action', () => ({ tailorResumeForClient: vi.fn() }));
vi.mock('@/lib/actions/fit-score-action', () => ({ generateFitScoreForClient: vi.fn() }));
vi.mock('@/lib/actions/job-actions', () => ({ saveTailoredResume: vi.fn() }));
vi.mock('@/components/resume-diff', () => ({ ResumeDiff: () => <div>Generated diff</div> }));
vi.mock('@/components/local-resume-export', () => ({ LocalResumeExport: () => null }));
vi.mock('@/components/skills-roadmap', () => ({ SkillsRoadmapPanel: () => null }));

const resume: Resume = {
  id: 'resume-1',
  name: 'Resume',
  source: 'React engineer',
  created_at: 1,
  updated_at: 1,
};
const job: JobApplication = {
  id: 'job-1',
  resume_id: resume.id,
  url: '',
  company: 'Acme',
  role: 'Engineer',
  jd_raw: '',
  jd_text: 'React engineer',
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
const score: FitScore = {
  id: 'score-1',
  job_id: job.id,
  overall_score: 80,
  dimensions: [],
  strengths: [],
  gaps: [],
  recommendation: 'Good fit',
  created_at: 1,
};
const generated = {
  success: true as const,
  data: { tailored: 'Tailored React engineer', changes: [] },
};

function Displays() {
  return (
    <AuthProvider>
      <TokenBalance />
      <TailorFlow
        jobId={job.id}
        job={job}
        serverResume={resume}
        serverResumes={[resume]}
        serverStashEntries={[]}
        serverEvidence={[]}
        existingTailored={[]}
      />
    </AuthProvider>
  );
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: Error) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.resetAllMocks();
  auth.userId = 'account-a';
  auth.isPending = false;
  vi.mocked(getTokenBalance).mockResolvedValue(3);
  vi.mocked(tailorResumeForClient).mockResolvedValue(generated);
  vi.mocked(generateFitScoreForClient).mockResolvedValue({ success: true, data: score });
});
afterEach(cleanup);

describe('shared credit displays', () => {
  it('preserves server job and resume while a signed-in session resolves after reload', () => {
    localStorage.clear();
    auth.userId = null;
    auth.isPending = true;
    const view = render(<Displays />);
    auth.userId = 'account-a';
    auth.isPending = false;
    view.rerender(<Displays />);
    expect(screen.queryByText(/Job not found/)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Target job' })).toHaveTextContent('Acme');
    expect(screen.getByTitle('Resume document preview')).toHaveAttribute(
      'srcdoc',
      expect.stringContaining('React engineer')
    );
  });

  it('hydrates guest storage only after the session resolves as a guest', () => {
    localStorage.clear();
    auth.userId = null;
    auth.isPending = true;
    const view = render(<Displays />);
    expect(screen.queryByText(/Job not found/)).not.toBeInTheDocument();
    auth.isPending = false;
    view.rerender(<Displays />);
    expect(screen.getByText(/Job not found/)).toBeInTheDocument();
  });

  it.each(['Generate Tailored Resume', 'Analyze Job Fit'])(
    'refreshes both displays after %s',
    async (action) => {
      render(<Displays />);
      await waitFor(() => {
        expect(screen.getByTitle('Token balance')).toHaveTextContent('3');
        expect(screen.getByText('Uses 1 token (3 remaining)')).toBeInTheDocument();
      });
      expect(getTokenBalance).toHaveBeenCalledTimes(1);
      vi.mocked(getTokenBalance).mockResolvedValueOnce(2);
      await userEvent.click(screen.getByRole('button', { name: action }));
      await waitFor(() => {
        expect(screen.getByTitle('Token balance')).toHaveTextContent('2');
        expect(screen.getByText('Uses 1 token (2 remaining)')).toBeInTheDocument();
      });
      expect(getTokenBalance).toHaveBeenCalledTimes(2);
    }
  );

  it('shows a recoverable fit-score failure instead of silently discarding it', async () => {
    vi.mocked(generateFitScoreForClient).mockResolvedValue({
      success: false,
      error: 'The AI service is busy right now. Please wait a moment and try again.',
      retryable: true,
    });
    render(<Displays />);
    await userEvent.click(screen.getByRole('button', { name: 'Analyze Job Fit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The AI service is busy');
    expect(screen.getByRole('button', { name: 'Analyze Job Fit' })).toBeEnabled();
  });

  it.each([true, false])('ignores a late previous-account read (failure: %s)', async (fails) => {
    const old = deferred<number>();
    vi.mocked(getTokenBalance).mockReturnValueOnce(old.promise).mockResolvedValueOnce(7);
    const view = render(<Displays />);
    auth.userId = 'account-b';
    view.rerender(<Displays />);
    expect(screen.queryByTitle('Token balance')).not.toBeInTheDocument();
    expect(screen.queryByText(/Uses 1 token/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Buy Tokens' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTitle('Token balance')).toHaveTextContent('7');
      expect(screen.getByText('Uses 1 token (7 remaining)')).toBeInTheDocument();
    });
    await act(async () => {
      if (fails) old.reject(new Error('offline'));
      else old.resolve(1);
    });
    expect(screen.getByTitle('Token balance')).toHaveTextContent('7');
    expect(screen.getByText('Uses 1 token (7 remaining)')).toBeInTheDocument();
  });

  it('ignores generation completion from a previous account', async () => {
    const old = deferred<Awaited<ReturnType<typeof tailorResumeForClient>>>();
    vi.mocked(tailorResumeForClient).mockReturnValueOnce(old.promise);
    const view = render(<Displays />);
    await waitFor(() => {
      expect(screen.getByTitle('Token balance')).toHaveTextContent('3');
      expect(screen.getByText('Uses 1 token (3 remaining)')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: 'Generate Tailored Resume' }));
    vi.mocked(getTokenBalance).mockResolvedValueOnce(7);
    auth.userId = 'account-b';
    view.rerender(<Displays />);
    await waitFor(() => {
      expect(screen.getByTitle('Token balance')).toHaveTextContent('7');
      expect(screen.getByText('Uses 1 token (7 remaining)')).toBeInTheDocument();
    });
    await act(async () => old.resolve(generated));
    expect(screen.getByTitle('Token balance')).toHaveTextContent('7');
    expect(screen.getByText('Uses 1 token (7 remaining)')).toBeInTheDocument();
    expect(getTokenBalance).toHaveBeenCalledTimes(2);
  });

  it('clears balances on logout and never fetches or changes stored guest data', async () => {
    localStorage.setItem('rt-resumes', JSON.stringify([resume]));
    localSaveJob(job.id, job.company, job.role, resume.id, job.url, job.jd_raw, job.jd_text);
    const view = render(<Displays />);
    await waitFor(() => {
      expect(screen.getByTitle('Token balance')).toHaveTextContent('3');
      expect(screen.getByText('Uses 1 token (3 remaining)')).toBeInTheDocument();
    });
    const old = deferred<number>();
    vi.mocked(getTokenBalance).mockReturnValueOnce(old.promise);
    await userEvent.click(screen.getByRole('button', { name: 'Generate Tailored Resume' }));
    auth.userId = null;
    view.rerender(<Displays />);
    const stored = localStorage.getItem('rt-resumes');
    expect(screen.queryByTitle('Token balance')).not.toBeInTheDocument();
    expect(screen.queryByText(/Uses 1 token/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Buy Tokens' })).not.toBeInTheDocument();
    await act(async () => old.resolve(2));
    expect(screen.queryByTitle('Token balance')).not.toBeInTheDocument();
    expect(screen.queryByText(/Uses 1 token/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Buy Tokens' })).not.toBeInTheDocument();
    expect(getTokenBalance).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('rt-resumes')).toBe(stored);
    vi.mocked(getTokenBalance).mockResolvedValueOnce(9);
    auth.userId = 'account-a';
    view.rerender(<Displays />);
    expect(screen.queryByTitle('Token balance')).not.toBeInTheDocument();
    expect(screen.queryByText(/Uses 1 token/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Buy Tokens' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTitle('Token balance')).toHaveTextContent('9');
      expect(screen.getByText('Uses 1 token (9 remaining)')).toBeInTheDocument();
    });
  });

  it('leaves both displays unknown after a failed refresh', async () => {
    render(<Displays />);
    await waitFor(() => {
      expect(screen.getByTitle('Token balance')).toHaveTextContent('3');
      expect(screen.getByText('Uses 1 token (3 remaining)')).toBeInTheDocument();
    });
    vi.mocked(getTokenBalance).mockRejectedValueOnce(new Error('offline'));
    await userEvent.click(screen.getByRole('button', { name: 'Generate Tailored Resume' }));
    await waitFor(() => {
      expect(screen.queryByTitle('Token balance')).not.toBeInTheDocument();
      expect(screen.queryByText(/Uses 1 token/)).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Buy Tokens' })).not.toBeInTheDocument();
    });
    expect(getTokenBalance).toHaveBeenCalledTimes(2);
  });

  it('does not fabricate zero from a generation error', async () => {
    render(<Displays />);
    await waitFor(() => {
      expect(screen.getByTitle('Token balance')).toHaveTextContent('3');
      expect(screen.getByText('Uses 1 token (3 remaining)')).toBeInTheDocument();
    });
    vi.mocked(tailorResumeForClient).mockResolvedValueOnce({
      success: false,
      error: 'insufficient_tokens',
      retryable: false,
    });
    vi.mocked(getTokenBalance).mockRejectedValueOnce(new Error('offline'));
    await userEvent.click(screen.getByRole('button', { name: 'Generate Tailored Resume' }));
    await waitFor(() => {
      expect(screen.queryByTitle('Token balance')).not.toBeInTheDocument();
      expect(screen.queryByText(/Uses 1 token/)).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Buy Tokens' })).not.toBeInTheDocument();
    });
    expect(screen.getByText('No tokens remaining.')).toBeInTheDocument();
  });

  it('does not let an older read overwrite a post-generation refresh', async () => {
    const old = deferred<number>();
    vi.mocked(getTokenBalance).mockReturnValueOnce(old.promise).mockResolvedValueOnce(2);
    render(<Displays />);
    await userEvent.click(screen.getByRole('button', { name: 'Generate Tailored Resume' }));
    await waitFor(() => {
      expect(screen.getByTitle('Token balance')).toHaveTextContent('2');
      expect(screen.getByText('Uses 1 token (2 remaining)')).toBeInTheDocument();
    });
    await act(async () => old.resolve(3));
    expect(screen.getByTitle('Token balance')).toHaveTextContent('2');
    expect(screen.getByText('Uses 1 token (2 remaining)')).toBeInTheDocument();
  });

  it('never reuses a late balance when returning to the same account', async () => {
    const old = deferred<number>();
    vi.mocked(getTokenBalance)
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(9);
    const view = render(<Displays />);
    auth.userId = 'account-b';
    view.rerender(<Displays />);
    await waitFor(() => {
      expect(screen.getByTitle('Token balance')).toHaveTextContent('7');
      expect(screen.getByText('Uses 1 token (7 remaining)')).toBeInTheDocument();
    });
    auth.userId = 'account-a';
    view.rerender(<Displays />);
    expect(screen.queryByTitle('Token balance')).not.toBeInTheDocument();
    expect(screen.queryByText(/Uses 1 token/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Buy Tokens' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTitle('Token balance')).toHaveTextContent('9');
      expect(screen.getByText('Uses 1 token (9 remaining)')).toBeInTheDocument();
    });
    await act(async () => old.resolve(1));
    expect(screen.getByTitle('Token balance')).toHaveTextContent('9');
    expect(screen.getByText('Uses 1 token (9 remaining)')).toBeInTheDocument();
  });

  it('does not fetch credits for guest generation', async () => {
    auth.userId = null;
    localStorage.setItem('rt-resumes', JSON.stringify([resume]));
    localSaveJob(job.id, job.company, job.role, resume.id, job.url, job.jd_raw, job.jd_text);
    const stored = localStorage.getItem('rt-resumes');
    render(<Displays />);
    await userEvent.click(screen.getByRole('button', { name: 'Generate Tailored Resume' }));
    await waitFor(() =>
      expect(screen.getByTitle('Resume document preview')).toHaveAttribute(
        'srcdoc',
        expect.stringContaining('Tailored React engineer')
      )
    );
    await userEvent.click(screen.getByRole('button', { name: 'Compare and edit changes' }));
    expect(screen.getByText('Generated diff')).toBeInTheDocument();
    expect(screen.queryByTitle('Token balance')).not.toBeInTheDocument();
    expect(screen.queryByText(/Uses 1 token/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Buy Tokens' })).not.toBeInTheDocument();
    expect(getTokenBalance).not.toHaveBeenCalled();
    expect(localStorage.getItem('rt-resumes')).toBe(stored);
  });

  it('keeps an initial failed read unknown', async () => {
    vi.mocked(getTokenBalance).mockRejectedValueOnce(new Error('offline'));
    render(<Displays />);
    await waitFor(() => expect(getTokenBalance).toHaveBeenCalledTimes(1));
    expect(screen.queryByTitle('Token balance')).not.toBeInTheDocument();
    expect(screen.queryByText(/Uses 1 token/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Buy Tokens' })).not.toBeInTheDocument();
  });
});
