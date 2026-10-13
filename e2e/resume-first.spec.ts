import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('guest import unlocks Add Job only after a ready master survives reload', async ({ page }) => {
  await page.goto('/jobs');
  await expect(page.getByRole('button', { name: '+ Add Job', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '+ New Resume', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page).toHaveURL(/resume-builder\?resume=/);
  await page.goto('/jobs');
  await expect(page.getByRole('button', { name: '+ Add Job', exact: true })).toBeDisabled();
  await page.goto('/resume-builder');
  await expect(page.getByRole('button', { name: 'Import Resume', exact: true })).toBeEnabled();
  await page
    .locator('input[type=file]')
    .setInputFiles(resolve('__tests__/fixtures/resume-import/synthetic.md'));
  await expect(page.getByText('Master resume · ready for a job', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Master resume · ready for a job', { exact: true })).toBeVisible();
  await page.goto('/jobs');
  await expect(page.getByRole('button', { name: '+ Add Job', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '+ Add Job', exact: true }).click();
  await expect(page.getByRole('combobox')).toContainText('synthetic');
});

test('public and workspace routes fit established responsive layouts', async ({
  page,
}, testInfo) => {
  for (const route of ['/', '/pricing', '/tools', '/resume-builder', '/jobs']) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    if (route === '/resume-builder')
      await expect(page.getByRole('button', { name: 'Import Resume', exact: true })).toBeEnabled();
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${route.slice(1) || 'home'}-${width}.png`),
        fullPage: true,
      });
    }
  }
});
