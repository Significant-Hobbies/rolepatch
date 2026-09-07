import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ isGuest: true }));
vi.mock('@/components/auth-provider', () => ({ useAuth: () => auth }));
vi.mock('@/components/cover-letter-editor', () => ({
  CoverLetterEditor: () => <div>Draft editor</div>,
}));
vi.mock('@/components/outreach-panel', () => ({ OutreachPanel: () => <div>Outreach panel</div> }));
import { GuestCoverLetter } from '@/components/guest-cover-letter';

describe('guest cover-letter route', () => {
  beforeEach(() => {
    localStorage.clear();
    auth.isGuest = true;
  });
  afterEach(cleanup);

  it('opens a job retained in this browser after a route reload', async () => {
    localStorage.setItem(
      'rt-jobs',
      JSON.stringify([{ id: 'synthetic-job', role: 'Engineer', company: 'Example Systems' }])
    );
    render(<GuestCoverLetter jobId="synthetic-job" />);
    expect(await screen.findByText('Engineer at Example Systems')).toBeInTheDocument();
    expect(screen.getByText('Draft editor')).toBeInTheDocument();
  });

  it('shows recovery for a missing job instead of attempting generation', async () => {
    render(<GuestCoverLetter jobId="missing-job" />);
    expect(await screen.findByText('Job unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute(
      'href',
      '/dashboard'
    );
    expect(screen.queryByText('Draft editor')).not.toBeInTheDocument();
  });

  it('does not expose the guest job when the browser becomes signed in', async () => {
    localStorage.setItem(
      'rt-jobs',
      JSON.stringify([{ id: 'synthetic-job', role: 'Private guest role', company: 'Example' }])
    );
    auth.isGuest = false;
    render(<GuestCoverLetter jobId="synthetic-job" />);
    expect(await screen.findByText('Job unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Private guest role at Example')).not.toBeInTheDocument();
  });

  it('recovers from malformed browser storage', async () => {
    localStorage.setItem('rt-jobs', '{');
    render(<GuestCoverLetter jobId="synthetic-job" />);
    expect(await screen.findByText('Job unavailable')).toBeInTheDocument();
  });
});
