import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import InterviewPrepPage from '@/app/interview-prep/[jobId]/page';
import { GuestInterviewPrep } from '@/components/guest-interview-prep';
import { getInterviewStories } from '@/lib/actions/interview-prep-action';
import { getJobApplication } from '@/lib/actions/job-actions';
import { getResume } from '@/lib/actions/resume-actions';
import { getCurrentUserId } from '@/lib/auth-utils';
import { localCreateResume, localGetJob, localSaveJob } from '@/lib/local-storage';

const auth = vi.hoisted(() => ({ isGuest: true }));
vi.mock('@/components/auth-provider', () => ({ useAuth: () => auth }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));
vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: vi.fn() }));
vi.mock('@/lib/actions/job-actions', () => ({ getJobApplication: vi.fn() }));
vi.mock('@/lib/actions/resume-actions', () => ({ getResume: vi.fn() }));
vi.mock('@/lib/actions/interview-prep-action', () => ({
  getInterviewStories: vi.fn(),
  generateInterviewStoriesForClient: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  auth.isGuest = true;
  vi.mocked(getCurrentUserId).mockResolvedValue(null);
});
afterEach(cleanup);

function saveGuestJob(resumeId: string) {
  localSaveJob(
    'guest-job',
    'Sample Company',
    'Platform Engineer',
    resumeId,
    '',
    '',
    'Build reliable services.'
  );
}

describe('guest interview preparation', () => {
  it('opens a browser-saved job without querying cloud job, resume or story storage', async () => {
    const resumeId = localCreateResume('Base', '# Alex Morgan\nTypeScript engineer.');
    saveGuestJob(resumeId);
    render(await InterviewPrepPage({ params: Promise.resolve({ jobId: 'guest-job' }) }));

    expect(await screen.findByText('Platform Engineer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Stories' })).toBeEnabled();
    expect(getJobApplication).not.toHaveBeenCalled();
    expect(getResume).not.toHaveBeenCalled();
    expect(getInterviewStories).not.toHaveBeenCalled();
  });

  it('explains a missing browser job and links back to the workspace', async () => {
    render(<GuestInterviewPrep jobId="missing" />);
    expect(await screen.findByRole('heading', { name: 'Job unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Jobs' })).toHaveAttribute('href', '/jobs');
    expect(screen.queryByRole('button', { name: 'Generate Stories' })).not.toBeInTheDocument();
  });

  it('explains a missing base resume and disables generation', async () => {
    saveGuestJob('missing-resume');
    render(<GuestInterviewPrep jobId="guest-job" />);
    expect(await screen.findByText(/The base resume is unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Stories' })).toBeDisabled();
  });

  it('does not render guest records when the client is signed in', async () => {
    saveGuestJob(localCreateResume('Private browser resume', 'Guest-only experience'));
    auth.isGuest = false;
    render(<GuestInterviewPrep jobId="guest-job" />);
    expect(await screen.findByRole('heading', { name: 'Job unavailable' })).toBeInTheDocument();
    expect(screen.queryByText('Platform Engineer')).not.toBeInTheDocument();
  });

  it('keeps signed-in requests on the ownership-scoped server path', async () => {
    saveGuestJob(localCreateResume('Browser record', 'Guest-only experience'));
    expect(localGetJob('guest-job')).not.toBeNull();
    vi.mocked(getCurrentUserId).mockResolvedValue('account-owner');
    vi.mocked(getJobApplication).mockResolvedValue(null);
    await expect(
      InterviewPrepPage({ params: Promise.resolve({ jobId: 'guest-job' }) })
    ).rejects.toThrow('NOT_FOUND');
    expect(getJobApplication).toHaveBeenCalledWith('guest-job');
    expect(getResume).not.toHaveBeenCalled();
  });
});
