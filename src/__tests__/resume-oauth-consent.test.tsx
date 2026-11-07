import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ResumeOAuthConsent } from '@/components/resume-oauth-consent';
import { getResumeOAuthRequest, consentResumeOAuth } from '@/lib/actions/resume-oauth-actions';
const state = vi.hoisted(() => ({ userId: 'owner' as string | null }));
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ userId: state.userId, isPending: false }),
}));
vi.mock('@/lib/auth-client', () => ({ authClient: { signIn: { social: vi.fn() } } }));
vi.mock('@/lib/actions/resume-oauth-actions', () => ({
  getResumeOAuthRequest: vi.fn(),
  consentResumeOAuth: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.userId = 'owner';
  window.history.replaceState({}, '', '/settings?sig=synthetic&client_id=example');
  vi.mocked(getResumeOAuthRequest).mockResolvedValue({
    ok: true,
    client_name: 'Example Assistant',
    callback_origin: 'https://client.example.org',
    scopes: ['resume', 'offline_access'],
    signed_in: true,
  });
});
it('checks the signed request, explains access and waits for deliberate consent', async () => {
  render(<ResumeOAuthConsent />);
  expect(await screen.findByText('Example Assistant')).toBeVisible();
  expect(screen.getByText('https://client.example.org')).toBeVisible();
  expect(screen.getByText(/use your credits/)).toBeVisible();
  expect(screen.getByText(/seven days/)).toBeVisible();
  expect(consentResumeOAuth).not.toHaveBeenCalled();
  vi.mocked(consentResumeOAuth).mockResolvedValue({
    ok: false,
    error: 'Start again from your assistant.',
  });
  await userEvent.click(screen.getByRole('button', { name: 'Allow resume access' }));
  expect(consentResumeOAuth).toHaveBeenCalledWith('sig=synthetic&client_id=example', true);
  expect(await screen.findByRole('alert')).toHaveTextContent('Start again');
});
it('denying uses the provider rejection flow without granting access', async () => {
  vi.mocked(consentResumeOAuth).mockResolvedValue({ ok: false, error: 'Synthetic test rejection' });
  render(<ResumeOAuthConsent />);
  await userEvent.click(await screen.findByRole('button', { name: 'Cancel connection' }));
  expect(consentResumeOAuth).toHaveBeenCalledWith('sig=synthetic&client_id=example', false);
});
it('guests must sign in and cannot approve; invalid requests never show allow controls', async () => {
  state.userId = null;
  const rendered = render(<ResumeOAuthConsent />);
  expect(
    await screen.findByRole('button', { name: 'Sign in with Google to continue' })
  ).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Allow resume access' })).not.toBeInTheDocument();
  rendered.unmount();
  vi.mocked(getResumeOAuthRequest).mockResolvedValue({ ok: false, error: 'Request expired' });
  render(<ResumeOAuthConsent />);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Request expired'));
  expect(screen.queryByRole('button', { name: 'Allow resume access' })).not.toBeInTheDocument();
});
it('ordinary Settings does not add a connection prompt', () => {
  window.history.replaceState({}, '', '/settings');
  const { container } = render(<ResumeOAuthConsent />);
  expect(container).toBeEmptyDOMElement();
  expect(getResumeOAuthRequest).not.toHaveBeenCalled();
});
