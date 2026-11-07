import { expect, test } from '@playwright/test';

test('Outline edits, pins and added projects survive reload and legacy links open the same workspace', async ({
  page,
}, testInfo) => {
  await page.goto('/resume-builder');
  await expect(page.getByRole('button', { name: '+ New Resume' })).toBeEnabled();
  const source =
    '# Ada\n\n[Portfolio](https://example.org)\n\n## Experience\n\n### Acme · 2022\n\n- Built React screens.\n\n## Projects\n\n### Reader\n\n- Released Reader.\n\n## Education\n\nBSc, Example University.\n\n## Skills\n\nReact, TypeScript.\n';
  await page.evaluate(
    (source) =>
      localStorage.setItem(
        'rt-resumes',
        JSON.stringify([
          { id: 'outline-master', name: 'Master', source, created_at: 1, updated_at: 1 },
        ])
      ),
    source
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Resume Builder', exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Edit achievement 1: Built React screens.', exact: true })
    .click();
  await page
    .getByLabel('Achievement 1', { exact: true })
    .first()
    .fill('Built accessible React screens.');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Always include: Built accessible React screens.' })
    .check();
  const projects = page.locator('#section-2');
  await projects.getByText('+ Add project or product', { exact: true }).click();
  await projects.getByLabel('Project name', { exact: true }).fill('API Console');
  await projects
    .getByLabel('Technologies and link', { exact: true })
    .fill('TypeScript · https://example.org/console');
  await projects.getByLabel('Achievement 1', { exact: true }).fill('Released an API console.');
  await projects.getByRole('button', { name: 'Add to master' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('checkbox', { name: 'Always include: Built accessible React screens.' })
  ).toBeChecked();
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('rt-resumes') ?? '[]')[0].source
  );
  expect(stored).toContain('[Portfolio](https://example.org)');
  expect(stored).toContain('### Acme · 2022');
  expect(stored).toContain('## Education\n\nBSc, Example University.');
  expect(stored).toContain('### API Console');
  expect(stored).toContain('- Released an API console.');
  expect(stored.match(/rolepatch:always-include/g)).toHaveLength(1);
  if (testInfo.project.name === 'desktop') {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({
        path: `.fleet-local/input-ui-20261009/implemented-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
    }
  }
  await page.getByRole('link', { name: 'Preview', exact: true }).click();
  await page.waitForURL(/editor\/outline-master/);
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
  await page
    .getByRole('navigation', { name: 'Primary', exact: true })
    .getByRole('link', { name: 'Resume Builder', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Resume Builder', exact: true })).toBeVisible();
  await page.goto('/evidence');
  await page.waitForURL(/resume-builder#sources/);
  await expect(page.getByRole('heading', { name: 'Achievements & sources' })).toBeVisible();
  await page.goto('/stash');
  await page.waitForURL(/resume-builder#extra-experience/);
  await expect(page.getByRole('heading', { name: 'Extra experience' })).toBeVisible();
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { name: 'Jobs', exact: true })).toBeVisible();
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
  const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
  await expect(nav.getByRole('link', { name: 'Resume Builder', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Jobs', exact: true })).toBeVisible();
  for (const label of [
    'Evidence',
    'Proof',
    'Experience',
    'Free Tools',
    'Blog',
    'Pricing',
    'Settings',
    'Dashboard',
  ]) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveCount(0);
  }
});

test('appearance persists and portal inputs follow Dark, Light and System without changing the footer', async ({
  page,
}, testInfo) => {
  await page.goto('/resume-builder');
  const workspace = page.locator('.rolepatch-workspace').first();
  const footer = await page.getByRole('contentinfo').innerHTML();
  await page.getByRole('button', { name: /Change appearance/ }).click();
  await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).click();
  await expect(workspace).toHaveAttribute('data-workspace-theme', 'dark');
  expect(await workspace.evaluate((element) => getComputedStyle(element).colorScheme)).toBe('dark');
  await page.reload();
  await expect(workspace).toHaveAttribute('data-workspace-theme', 'dark');
  await page.getByRole('button', { name: '+ New Resume', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Build your master resume' });
  await expect(form).toHaveAttribute('data-workspace-theme', 'dark');
  if (testInfo.project.name === 'desktop')
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({
        path: `.fleet-local/input-ui-20261009/built-dark-onboarding-${width}.png`,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
    }
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Change appearance/ }).click();
  await page.getByRole('menuitemradio', { name: 'Light', exact: true }).click();
  await expect(workspace).toHaveAttribute('data-workspace-theme', 'light');
  await page.getByRole('button', { name: /Change appearance/ }).click();
  await page.getByRole('menuitemradio', { name: 'System', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(workspace).toHaveAttribute('data-workspace-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(workspace).toHaveAttribute('data-workspace-theme', 'light');
  expect(await page.getByRole('contentinfo').innerHTML()).toBe(footer);
});
