import { expect, test } from './fixtures/workspace';

test('account menu becomes usable after a signed-in session loads its account-only code', async ({
  page,
  workspace,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => {
    localStorage.setItem('rolepatch-workspace-theme', 'light');
  });
  await workspace.signIn();
  for (const path of ['/pricing', '/resume-builder']) {
    await page.goto(path);
    if (path === '/resume-builder' && (page.viewportSize()?.width ?? 0) < 768) {
      await page.getByRole('button', { name: 'Toggle Sidebar', exact: true }).click();
    }
    if (path === '/resume-builder') {
      await expect(page.locator('[data-sidebar="sidebar"]').filter({ visible: true })).toHaveCSS(
        'background-color',
        'oklch(0.985 0 0)'
      );
    }
    const account = page.getByRole('button', { name: 'Account menu', exact: true });
    await expect(account).toBeEnabled();
    await account.click();
    await expect(page.getByRole('menu')).toHaveCSS('background-color', 'oklch(1 0 0)');
    await expect(page.getByRole('menuitem', { name: 'Account settings' })).toHaveAttribute(
      'href',
      '/settings'
    );
    await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /pricing|buy|billing/i })).toHaveCount(0);
    await page.keyboard.press('Escape');
  }
});

for (const route of ['/pricing', '/tools']) {
  test(`${route} hydrates its guest controls without losing server content`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('contentinfo').getByRole('heading', { name: 'Help shape RolePatch.' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(errors).toEqual([]);
  });
}

test('tools keeps all cards and loads the selected tool on navigation', async ({ page }) => {
  const prefetched: string[] = [];
  page.on('request', (request) => {
    if (
      request.headers()['next-router-prefetch'] &&
      new URL(request.url()).pathname.startsWith('/tools/')
    )
      prefetched.push(request.url());
  });
  await page.goto('/tools');
  const toolLinks = page.getByRole('main').locator('a[href^="/tools/"]');
  await expect(toolLinks).toHaveCount(6);
  await page.waitForLoadState('networkidle');
  expect(prefetched).toEqual([]);
  await page.getByRole('main').locator('a[href="/tools/keywords"]').click();
  await expect(page).toHaveURL(/\/tools\/keywords$/);
  await expect(page.locator('textarea').first()).toBeVisible();
  await expect(page.locator('textarea').nth(1)).toBeVisible();
});
