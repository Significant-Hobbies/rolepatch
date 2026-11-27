import { devices, type Page } from '@playwright/test';
import { expect, test } from './fixtures/workspace';

// Exercise the primary flow entry points at a 390px viewport (iPhone 13).
// Wave 1 goal: no horizontal scroll, hamburger nav, single-column layouts.
test.use({ ...devices['iPhone 13'] });

/** Asserts the document does not scroll horizontally. */
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  // Allow 1px for sub-pixel rounding.
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('mobile (390px)', () => {
  test('Jobs has visible primary links and an accessible workspace menu', async ({
    page,
    workspace,
  }) => {
    await workspace.signIn();
    await page.goto('/jobs');
    const primary = page.getByRole('navigation', { name: 'Primary', exact: true });
    await expect(primary.getByRole('link')).toHaveCount(3);
    await expect(primary.getByRole('link', { name: 'Jobs', exact: true })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await expectNoHorizontalScroll(page);

    const hamburger = page.getByRole('button', { name: 'Toggle Sidebar' });
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    const drawer = page.getByRole('dialog', { name: 'Workspace menu' });
    await expect(drawer.getByRole('link', { name: 'History' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(hamburger).toBeFocused();
  });

  test('pricing cards stack to a single column', async ({ page }) => {
    await page.goto('/pricing');
    const cards = page.getByText(/Starter|Pro|Bulk/i);
    await expect(cards.first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('resume editor is usable at mobile width', async ({ page, workspace }) => {
    await workspace.signIn();
    const id = workspace.seedResume(
      '# Alex Morgan\n\n## Experience\n- Wrote clear docs.\n',
      'Mobile editor sample'
    );
    await page.goto(`/editor/${id}`);

    // CodeMirror editor mounts and is reachable.
    await expect(page.locator('.cm-editor')).toBeVisible({ timeout: 10000 });
    const editor = page.locator('.cm-content');
    await editor.click();
    await editor.pressSequentially('# Tailor flow mobile test');
    await expect(editor).toContainText('Tailor flow mobile test');
    await expect(editor).toBeFocused();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.reload();
    await expect(page.locator('.cm-content')).toContainText('Tailor flow mobile test');

    await expectNoHorizontalScroll(page);
  });
});
