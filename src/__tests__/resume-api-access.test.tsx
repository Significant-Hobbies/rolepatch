import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ResumeApiAccess } from '@/components/resume-api-access';
import { createResumeApiAccess } from '@/lib/actions/resume-access-actions';

const auth = vi.hoisted(() => ({ userId: 'owner' as string | null, isPending: false }));
vi.mock('@/components/auth-provider', () => ({ useAuth: () => auth }));
vi.mock('@/lib/actions/resume-access-actions', () => ({
  createResumeApiAccess: vi.fn(),
  disconnectResumeApiAccess: vi.fn(),
}));
vi.mock('@/lib/auth-client', () => ({ authClient: { signOut: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  auth.userId = 'owner';
  auth.isPending = false;
  localStorage.clear();
});

it('discloses scope, expiry and sign-out before issuance, and never stores the token in browser storage', async () => {
  vi.mocked(createResumeApiAccess).mockResolvedValue({
    ok: true,
    token: 'synthetic-api-token',
    expires_at: '2026-10-09T00:00:00Z',
  });
  render(<ResumeApiAccess />);
  expect(screen.getByText(/use credits to generate resumes/)).toBeInTheDocument();
  expect(screen.getByText(/Disconnect revokes every token/)).toBeInTheDocument();
  expect(createResumeApiAccess).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Create API token' }));
  const field = await screen.findByLabelText('API token');
  expect(field).toHaveAttribute('type', 'password');
  expect(field).toHaveValue('synthetic-api-token');
  expect(localStorage.length).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Show token' }));
  expect(field).toHaveAttribute('type', 'text');
});

it('disables guest issuance and removes a displayed token when account identity changes', async () => {
  vi.mocked(createResumeApiAccess).mockResolvedValue({
    ok: true,
    token: 'synthetic-api-token',
    expires_at: '2026-10-09T00:00:00Z',
  });
  const { rerender } = render(<ResumeApiAccess />);
  fireEvent.click(screen.getByRole('button', { name: 'Create API token' }));
  await screen.findByLabelText('API token');
  auth.userId = null;
  rerender(<ResumeApiAccess />);
  expect(screen.queryByLabelText('API token')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create API token' })).toBeDisabled();
});

it('shows an issuance error without leaving a credential visible', async () => {
  vi.mocked(createResumeApiAccess).mockResolvedValue({
    ok: false,
    error: 'Your session ended. Sign in again.',
  });
  render(<ResumeApiAccess />);
  fireEvent.click(screen.getByRole('button', { name: 'Create API token' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Your session ended'));
  expect(screen.queryByLabelText('API token')).not.toBeInTheDocument();
});
