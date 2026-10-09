import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { UserMenu } from '@/components/user-menu';
const auth = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: 'owner', name: 'Alex', email: 'alex@example.org' } },
    }),
    signOut: auth.signOut,
  },
}));
vi.mock('@/lib/foundry-monitoring', () => ({ captureAuthFailure: vi.fn() }));
afterEach(cleanup);
it('places settings inside the signed-in account menu without a purchase link', async () => {
  const user = userEvent.setup();
  render(<UserMenu />);
  expect(screen.queryByRole('link', { name: 'Account settings' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Account menu' }));
  expect(screen.getByRole('menuitem', { name: 'Account settings' })).toHaveAttribute(
    'href',
    '/settings'
  );
  expect(screen.queryByRole('menuitem', { name: /pricing|buy|billing/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));
  expect(auth.signOut).toHaveBeenCalledTimes(1);
});
