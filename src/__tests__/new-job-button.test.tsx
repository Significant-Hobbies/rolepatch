import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NewJobButton } from '@/components/new-job-button';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuth = vi.fn(() => ({ isGuest: false }));
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockCreateJobApplication = vi.fn();
vi.mock('@/lib/actions/job-actions', () => ({
  createJobApplication: (...args: unknown[]) => mockCreateJobApplication(...args),
}));

const mockScrapeJobUrlSafe = vi.fn();
vi.mock('@/lib/actions/scrape-action', () => ({
  scrapeJobUrlSafe: (...args: unknown[]) => mockScrapeJobUrlSafe(...args),
}));

vi.mock('@/lib/local-storage', () => ({
  localListResumes: () => [],
  localSaveJob: vi.fn(),
}));

beforeEach(() => {
  mockPush.mockReset();
  mockUseAuth.mockReturnValue({ isGuest: false });
  mockCreateJobApplication.mockReset();
  mockScrapeJobUrlSafe.mockReset();
});

describe('NewJobButton', () => {
  it('accepts a pasted description directly without fetching a URL', async () => {
    const user = userEvent.setup();
    mockCreateJobApplication.mockResolvedValueOnce('pasted-job');
    render(<NewJobButton resumes={[{ id: 'resume-1', name: 'Base Resume' }]} />);
    await user.click(screen.getByText('+ Add Job'));
    await user.click(screen.getByText('Paste the description instead'));
    await user.type(
      screen.getByLabelText('Job description'),
      'Seeking a TypeScript platform engineer to improve service reliability and coordinate incident reviews.'
    );
    await user.click(screen.getByText('Save pasted JD'));
    expect(mockScrapeJobUrlSafe).not.toHaveBeenCalled();
    expect(mockCreateJobApplication).toHaveBeenCalledWith(
      'resume-1',
      '',
      'Unknown Company',
      'Untitled Role',
      expect.any(String),
      expect.any(String)
    );
    expect(mockPush).toHaveBeenCalledWith('/tailor/pasted-job');
  });
  it('falls back to pasted job description when scraping cannot read the posting', async () => {
    const user = userEvent.setup();
    mockScrapeJobUrlSafe.mockResolvedValueOnce({
      ok: false,
      reason: 'unreadable',
      message:
        "We couldn't read that posting. Paste the job description text manually to continue.",
    });
    mockCreateJobApplication.mockResolvedValueOnce('job-1');

    render(<NewJobButton resumes={[{ id: 'resume-1', name: 'Base Resume' }]} />);

    await user.click(screen.getByText('+ Add Job'));
    await user.type(screen.getByLabelText('Job URL'), 'https://jobs.example.com/role-1');
    await user.click(screen.getByText('Add Job'));

    expect(await screen.findByText(/Paste the job description text manually/i)).toBeDefined();
    expect(screen.getByLabelText('Company')).toBeDefined();
    expect(screen.getByLabelText('Role')).toBeDefined();

    await user.type(screen.getByLabelText('Company'), 'Acme');
    await user.type(screen.getByLabelText('Role'), 'Platform Engineer');
    await user.type(
      screen.getByLabelText('Job description'),
      'We need a platform engineer with TypeScript, distributed systems, observability, and production operations experience.'
    );
    await user.click(screen.getByText('Save pasted JD'));

    expect(mockCreateJobApplication).toHaveBeenCalledWith(
      'resume-1',
      'https://jobs.example.com/role-1',
      'Acme',
      'Platform Engineer',
      expect.stringContaining('platform engineer'),
      expect.stringContaining('platform engineer')
    );
    expect(mockPush).toHaveBeenCalledWith('/tailor/job-1');
  });
});
