import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WorkspaceThemeProvider } from '@/components/workspace-theme';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

let mediaListener: (() => void) | undefined;
let mediaDark = false;
beforeEach(() => {
  localStorage.clear();
  mediaDark = false;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return mediaDark;
      },
      addEventListener: (_type: string, listener: () => void) => {
        mediaListener = listener;
      },
      removeEventListener: vi.fn(),
    }))
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function fixture() {
  return (
    <WorkspaceThemeProvider>
      <ThemeToggle />
      <Sheet>
        <SheetTrigger>Open form</SheetTrigger>
        <SheetContent>
          <SheetTitle>Resume details</SheetTitle>
        </SheetContent>
      </Sheet>
    </WorkspaceThemeProvider>
  );
}
it('persists explicit dark selection through remount and carries it into portaled forms', async () => {
  const user = userEvent.setup();
  const first = render(fixture());
  await user.click(screen.getByRole('button', { name: /Change appearance/ }));
  await user.click(screen.getByRole('menuitemradio', { name: 'Dark' }));
  expect(localStorage.getItem('rolepatch-workspace-theme')).toBe('dark');
  expect(first.container.querySelector('[data-workspace-theme="dark"]')).toBeTruthy();
  first.unmount();
  render(fixture());
  await user.click(screen.getByRole('button', { name: 'Open form' }));
  expect(screen.getByRole('dialog')).toHaveAttribute('data-workspace-theme', 'dark');
});
it('follows the system preference only while System is selected', async () => {
  const user = userEvent.setup();
  const view = render(fixture());
  mediaDark = true;
  mediaListener?.();
  await waitFor(() =>
    expect(view.container.querySelector('[data-workspace-theme="dark"]')).toBeTruthy()
  );
  await user.click(screen.getByRole('button', { name: /Change appearance/ }));
  await user.click(screen.getByRole('menuitemradio', { name: 'Light' }));
  mediaDark = false;
  mediaListener?.();
  mediaDark = true;
  mediaListener?.();
  await waitFor(() =>
    expect(view.container.querySelector('[data-workspace-theme="light"]')).toBeTruthy()
  );
});
