import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MigrationBanner } from '@/components/migration-banner';
import { migrateGuestData } from '@/lib/actions/migration-actions';
vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ isGuest: false }) }));
vi.mock('@/lib/actions/migration-actions', () => ({ migrateGuestData: vi.fn() }));
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it('keeps all guest data available when automatic or manual import fails preflight', async () => {
  const originals = {
    'rt-resumes': JSON.stringify([
      { id: 'a', name: 'Master', source: 'password=example12345', created_at: 1, updated_at: 1 },
    ]),
    'rt-jobs': '[]',
    'rt-tailored': '[]',
    'rt-cover-letters': '[]',
    'rt-stash': '[]',
  };
  for (const [key, value] of Object.entries(originals)) localStorage.setItem(key, value);
  render(<MigrationBanner />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Local resume 1, line 1');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your local data is intact.');
  for (const [key, value] of Object.entries(originals))
    expect(localStorage.getItem(key)).toBe(value);
  expect(localStorage.getItem('rt-migrated')).toBeNull();
  expect(migrateGuestData).not.toHaveBeenCalled();
});
