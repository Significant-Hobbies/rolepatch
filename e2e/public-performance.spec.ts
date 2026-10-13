import { expect, test } from '@playwright/test';

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
  await expect(page.getByRole('link', { name: /Use tool/ })).toHaveCount(6);
  await page.waitForLoadState('networkidle');
  expect(prefetched).toEqual([]);
  await page.getByRole('link', { name: /ATS Keyword Checker/ }).click();
  await expect(page).toHaveURL(/\/tools\/keywords$/);
  await expect(page.locator('textarea').first()).toBeVisible();
  await expect(page.locator('textarea').nth(1)).toBeVisible();
});
