import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserMenu } from '@/components/user-menu';

const mockSignInSocial = vi.fn();

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: null }),
    signIn: {
      social: (...args: unknown[]) => mockSignInSocial(...args),
    },
  },
}));

vi.mock('@/lib/foundry-monitoring', () => ({
  captureAuthFailure: vi.fn(),
}));

beforeEach(() => {
  mockSignInSocial.mockReset();
  mockSignInSocial.mockResolvedValue({});
});

describe('UserMenu', () => {
  it('returns Google sign-in to the dashboard', async () => {
    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: '/dashboard',
    });
  });
});
