import { expect, test } from '@playwright/test';

test.describe('public pages load', () => {
  test('landing entry leads to workspace sign-in', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /Tailor my resume/i }).first();
    if (await cta.isVisible()) await cta.click();
    await expect(page.getByRole('heading', { name: 'Sign in to RolePatch' })).toBeVisible();
  });

  test('an in-app link opens sign-in without rendering the dashboard', async ({ page }) => {
    await page.goto('/pricing');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    const hamburger = nav.getByRole('button', { name: 'Open menu' });
    if (await hamburger.isVisible()) await hamburger.click();
    await nav.getByRole('link', { name: 'Jobs', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/sign-in\?/);
    await expect(page.locator('#workspace-content')).toHaveCount(0);
  });

  test('pricing page renders', async ({ page }) => {
    await page.goto('/pricing');
    expect(await page.evaluate(() => document.compatMode)).toBe('CSS1Compat');
    await expect(page.getByText(/Starter|Pro|Bulk/i).first()).toBeVisible();
  });

  test('privacy and terms pages render', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('body')).not.toBeEmpty();
    await page.goto('/terms');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('tools index links to diff and keywords', async ({ page }) => {
    await page.goto('/tools');
    expect(await page.evaluate(() => document.compatMode)).toBe('CSS1Compat');
    await expect(page.getByRole('link', { name: /diff/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /keyword/i })).toBeVisible();
  });
});

test.describe('tools (no auth)', () => {
  test('diff tool accepts two inputs', async ({ page }) => {
    await page.goto('/tools/diff');
    const textareas = page.locator('textarea');
    await expect(textareas.first()).toBeVisible();
    await textareas.nth(0).fill('alpha beta');
    await textareas.nth(1).fill('alpha gamma');
    await expect(page.locator('body')).toContainText(/gamma|beta/);
  });

  test('keywords tool renders input', async ({ page }) => {
    await page.goto('/tools/keywords');
    await expect(page.locator('textarea').first()).toBeVisible();
  });
});

test.describe('legacy stash', () => {
  test('stash link preserves the sign-in destination', async ({ page }) => {
    await page.goto('/stash');
    await expect(page.getByRole('heading', { name: 'Sign in to RolePatch' })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/resume-builder/evidence');
  });
});
