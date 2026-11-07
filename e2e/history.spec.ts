import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function seedHistory(page: import('@playwright/test').Page) {
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: '+ Add Job', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const now = Math.floor(Date.now() / 1000);
    const master =
      '# Alex Morgan\n\n## Projects\n### Reader\n- Built a reading queue.\n\n## Education\nBSc, Example University.\n';
    localStorage.setItem(
      'rt-resumes',
      JSON.stringify([
        {
          id: 'history-master',
          name: 'Master resume',
          source: master,
          created_at: now,
          updated_at: now,
        },
      ])
    );
    localStorage.setItem(
      'rt-jobs',
      JSON.stringify([
        {
          id: 'history-frontend',
          resume_id: 'history-master',
          company: 'Example Co',
          role: 'Frontend Engineer',
          status: 'tailored',
          jd_text:
            'Build React and TypeScript web interfaces and improve the experience of our customers. Ship frontend features and tests.',
          url: '',
          created_at: now,
          updated_at: now,
        },
        {
          id: 'history-agents',
          resume_id: 'history-master',
          company: 'Example Labs',
          role: 'Agents Engineer',
          status: 'applied',
          jd_text:
            'Build tool-calling systems and RAG assistants using TypeScript and Python. Evaluate generated answers and ship developer tools.',
          url: '',
          created_at: now - 100,
          updated_at: now,
        },
        {
          id: 'history-draft',
          resume_id: 'history-master',
          company: 'Example Studio',
          role: 'Fullstack Engineer',
          status: 'draft',
          jd_text:
            'Build frontend interfaces and backend services, release APIs, and maintain customer applications using TypeScript and Go.',
          url: '',
          created_at: now - 200,
          updated_at: now,
        },
      ])
    );
    localStorage.setItem(
      'rt-tailored',
      JSON.stringify([
        {
          id: 'version-old',
          job_id: 'history-frontend',
          resume_id: 'history-master',
          source: master.replace(
            '## Projects',
            '## Summary\nEarlier frontend summary for the saved history version.\n\n## Projects'
          ),
          changes: [],
          accepted: 0,
          created_at: now - 80,
          updated_at: now - 80,
        },
        {
          id: 'version-new',
          job_id: 'history-frontend',
          resume_id: 'history-master',
          source: master.replace(
            '## Projects',
            '## Summary\nLatest frontend summary for the saved history version.\n\n## Projects'
          ),
          changes: [],
          accepted: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'version-agents',
          job_id: 'history-agents',
          resume_id: 'history-master',
          source: master.replace(
            '## Projects',
            '## Summary\nAgents resume from supplied project evidence.\n\n## Projects'
          ),
          changes: [],
          accepted: 0,
          created_at: now - 50,
          updated_at: now - 50,
        },
      ])
    );
  });
  await page.reload();
}

test('history filters applied jobs and reopens the exact old resume after reload', async ({
  page,
}, testInfo) => {
  await seedHistory(page);
  const history = page.getByRole('region', { name: 'History', exact: true });
  const job = page.getByRole('button', { name: 'Frontend Engineer', exact: true });
  await job.click();
  const drawer = page.getByRole('dialog', { name: 'Frontend Engineer', exact: true });
  await expect(drawer.getByRole('tabpanel', { name: 'Description' })).toContainText(
    'Build React and TypeScript'
  );
  await drawer.getByRole('tab', { name: 'Resumes', exact: true }).click();
  await expect(
    drawer.getByText('2 saved resumes · Frontend Engineer · Example Co', { exact: true })
  ).toBeVisible();
  await drawer.getByRole('tab', { name: 'Details', exact: true }).click();
  await drawer.getByLabel('Notes', { exact: true }).fill('Review-first UI check');
  await drawer.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(job).toBeFocused();
  await job.click();
  await drawer.getByRole('tab', { name: 'Details', exact: true }).click();
  await expect(drawer.getByLabel('Notes', { exact: true })).toHaveValue('Review-first UI check');
  await drawer.getByRole('button', { name: 'Close', exact: true }).press('Escape');
  await expect(job).toBeFocused();
  await history.getByRole('textbox', { name: 'Search jobs' }).fill('unmatched-role');
  await expect(history.getByText('No jobs match this filter', { exact: true })).toBeVisible();
  await history.getByRole('textbox', { name: 'Search jobs' }).fill('');

  await expect(history).toBeVisible();
  await history.getByRole('button', { name: 'Applied and later (1)' }).click();
  await expect(history.getByRole('button', { name: 'Agents Engineer', exact: true })).toBeVisible();
  await expect(history.getByRole('button', { name: 'Frontend Engineer', exact: true })).toHaveCount(
    0
  );
  await history.getByRole('button', { name: 'All jobs (3)' }).click();
  await history
    .getByText('2 saved resumes · Frontend Engineer · Example Co', { exact: true })
    .click();
  const versionLink = history.locator('a[href*="version=version-old"]');
  const downloadPromise = page.waitForEvent('download');
  await history.getByRole('button', { name: 'Download Markdown', exact: true }).nth(1).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect(await readFile(downloadPath!, 'utf8')).toContain(
    'Earlier frontend summary for the saved history version.'
  );

  await expect(versionLink).toBeVisible();
  const phase = process.env.HISTORY_PHASE ?? 'final';
  if (testInfo.project.name === 'desktop') {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({
        path: `.fleet-local/history-api-20261008/${phase}-${width}.png`,
        fullPage: false,
      });
    }
  }
  await versionLink.click();
  await page.waitForURL(/version=version-old/);
  await expect(page.getByLabel('Saved resume version')).toHaveValue('version-old');
  await expect(
    page
      .frameLocator('iframe[title="Resume document preview"]')
      .getByText('Earlier frontend summary for the saved history version.', { exact: true })
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .frameLocator('iframe[title="Resume document preview"]')
      .getByText('Earlier frontend summary for the saved history version.', { exact: true })
  ).toBeVisible();
  await page.getByLabel('Saved resume version').selectOption('version-new');
  await expect(
    page
      .frameLocator('iframe[title="Resume document preview"]')
      .getByText('Latest frontend summary for the saved history version.', { exact: true })
  ).toBeVisible();
});
