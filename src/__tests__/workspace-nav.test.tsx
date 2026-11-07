import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SiteNav } from '@/components/site-nav';
const path = vi.hoisted(() => ({ value: '/resume-builder' }));
vi.mock('next/navigation', () => ({ usePathname: () => path.value }));
vi.mock('@/components/token-balance', () => ({ TokenBalance: () => null }));
vi.mock('@/components/user-menu', () => ({
  UserMenu: () => <button type="button">Account menu</button>,
}));
afterEach(cleanup);
it('keeps only two workspaces in both navigation variants and closes the menu on route change', () => {
  const view = render(<SiteNav />);
  expect(screen.getByRole('link', { name: 'Resume Builder' })).toHaveAttribute(
    'aria-current',
    'page'
  );
  expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('href', '/jobs');
  for (const name of [
    'Pricing',
    'Evidence',
    'Proof',
    'Experience',
    'Settings',
    'Tools',
    'Blog',
    'Dashboard',
  ])
    expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  expect(screen.getAllByRole('link', { name: 'Resume Builder' })).toHaveLength(2);
  path.value = '/tailor/j1';
  view.rerender(<SiteNav />);
  expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('aria-current', 'page');
});
