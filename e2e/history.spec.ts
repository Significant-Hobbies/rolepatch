import { randomUUID } from 'node:crypto';
import { expect, test, type WorkspaceFixture } from './fixtures/workspace';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ workspace }) => workspace.signIn());

function seedHistory(workspace: WorkspaceFixture) {
  const { query, userId } = workspace;
  const master =
    '# Alex Morgan\n\n## Projects\n### Reader\n- Built a reading queue.\n\n## Education\nBSc, Example University.\n';
  const resume = workspace.seedResume(master);
  const frontend = randomUUID();
  const agents = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  for (const [id, company, role, status, jd, age] of [
    [
      frontend,
      'Example Co',
      'Frontend Engineer',
      'tailored',
      'Build React and TypeScript interfaces.',
      0,
    ],
    [
      agents,
      'Example Labs',
      'Agents Engineer',
      'applied',
      'Build tool-calling systems and RAG assistants.',
      100,
    ],
    [randomUUID(), 'Example Studio', 'Fullstack Engineer', 'draft', 'Build and release APIs.', 200],
  ] as const) {
    query(
      'INSERT INTO job_applications (id, user_id, resume_id, company, role, status, jd_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      userId,
      resume,
      company,
      role,
      status,
      jd,
      now - age,
      now
    );
  }
  const oldVersion = randomUUID();
  const newVersion = randomUUID();
  for (const [id, job, summary, age] of [
    [oldVersion, frontend, 'Earlier frontend summary for the saved history version.', 80],
    [newVersion, frontend, 'Latest frontend summary for the saved history version.', 0],
    [randomUUID(), agents, 'Agents resume from supplied project evidence.', 50],
  ] as const) {
    query(
      'INSERT INTO tailored_resumes (id, user_id, job_id, resume_id, source, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id,
      userId,
      job,
      resume,
      master.replace('## Projects', `## Summary\n${summary}\n\n## Projects`),
      now - age,
      now - age
    );
  }
  return { oldVersion, newVersion };
}

test('history filters applied jobs and reopens the exact old resume after reload', async ({
  page,
  workspace,
}, testInfo) => {
  const { oldVersion, newVersion } = seedHistory(workspace);
  await page.goto('/history');
  const history = page.getByRole('region', { name: 'History', exact: true });
  const job = page.getByRole('button', { name: 'Frontend Engineer', exact: true });
  await job.click();
  const drawer = page.getByRole('dialog', { name: 'Frontend Engineer', exact: true });
  await expect(drawer.getByRole('tabpanel', { name: 'Description' })).toContainText(
    'Build React and TypeScript'
  );
  await drawer.getByRole('tab', { name: 'Resumes', exact: true }).click();
  await expect(
    drawer.getByLabel('2 saved resumes for Frontend Engineer at Example Co')
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
  await history.getByRole('button', { name: 'Applied jobs (1)' }).click();
  await expect(history.getByRole('button', { name: 'Agents Engineer', exact: true })).toBeVisible();
  await expect(history.getByRole('button', { name: 'Frontend Engineer', exact: true })).toHaveCount(
    0
  );
  await history.getByRole('button', { name: 'All jobs (3)' }).click();
  await history.getByLabel('2 saved resumes for Frontend Engineer at Example Co').click();
  const versionLink = history.locator(`a[href*="version=${oldVersion}"]`);
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
  await page.waitForURL(`**?version=${oldVersion}`);
  await expect(page.getByLabel('Saved resume version')).toHaveValue(oldVersion);
  await expect(
    page
      .frameLocator('#workspace-content iframe[title="Resume document preview"]')
      .getByText('Earlier frontend summary for the saved history version.', { exact: true })
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .frameLocator('#workspace-content iframe[title="Resume document preview"]')
      .getByText('Earlier frontend summary for the saved history version.', { exact: true })
  ).toBeVisible();
  await page.getByLabel('Saved resume version').selectOption(newVersion);
  await expect(
    page
      .frameLocator('#workspace-content iframe[title="Resume document preview"]')
      .getByText('Latest frontend summary for the saved history version.', { exact: true })
  ).toBeVisible();
});

test('the workspace has three visible page links and History is a separate page', async ({
  page,
}) => {
  await page.goto('/jobs');
  const footer = page.getByRole('contentinfo');
  await expect(footer).toHaveCount(0);
  const navigation = page.getByRole('navigation', { name: 'Primary', exact: true });
  await expect(navigation.getByRole('link')).toHaveCount(3);
  await expect(navigation.getByRole('link', { name: 'Jobs', exact: true })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(page.getByRole('region', { name: 'History', exact: true })).toHaveCount(0);

  await navigation.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
  await expect(footer).toHaveCount(0);
  await expect(navigation.getByRole('link', { name: 'History', exact: true })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(page.getByRole('region', { name: 'Application tracker', exact: true })).toHaveCount(
    0
  );

  await navigation.getByRole('link', { name: 'Resume Builder', exact: true }).click();
  await expect(page).toHaveURL(/\/resume-builder$/);
  await expect(page.getByRole('heading', { name: 'Resume Builder', exact: true })).toBeVisible();
  await expect(footer).toHaveCount(0);
  await expect(
    navigation.getByRole('link', { name: 'Resume Builder', exact: true })
  ).toHaveAttribute('aria-current', 'page');
});

test('legacy workspace history links open the standalone History page', async ({ page }) => {
  for (const path of ['/dashboard#history', '/jobs#history']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
  }
});
