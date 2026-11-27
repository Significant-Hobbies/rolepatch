import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { expect, test, type WorkspaceFixture } from './fixtures/workspace';

test.beforeEach(async ({ workspace }) => workspace.signIn());

test('master onboarding preserves every role, project and education on reload', async ({
  page,
  workspace,
}) => {
  await page.goto('/resume-builder');
  await page.getByRole('button', { name: '+ New Resume', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Build your master resume' });
  await dialog.getByLabel('Full name', { exact: true }).fill('Alex Morgan');
  await dialog.getByRole('button', { name: 'Next: Experience' }).click();
  await dialog.getByLabel('Role and company 1').fill('Engineer — Acme');
  let achievements = dialog.getByRole('group', { name: 'Achievements', exact: true }).nth(0);
  await achievements.getByLabel('Achievement 1', { exact: true }).fill('Built React screens.');
  await achievements.getByRole('button', { name: 'Add achievement' }).click();
  await achievements.getByLabel('Achievement 2', { exact: true }).fill('Released customer APIs.');
  await dialog.getByRole('button', { name: '+ Add another role' }).click();
  await dialog.getByLabel('Role and company 2').fill('Engineer — Widget');
  await dialog
    .getByRole('group', { name: 'Achievements', exact: true })
    .nth(1)
    .getByLabel('Achievement 1', { exact: true })
    .fill('Built the customer dashboard.');
  await dialog.getByRole('button', { name: 'Next: Projects' }).click();
  await dialog.getByLabel('Project or product name 1').fill('Reader');
  achievements = dialog.getByRole('group', { name: 'Achievements', exact: true }).nth(0);
  await achievements.getByLabel('Achievement 1', { exact: true }).fill('Built a reading queue.');
  await achievements.getByRole('button', { name: 'Add achievement' }).click();
  await achievements.getByLabel('Achievement 2', { exact: true }).fill('Added search.');
  await dialog.getByRole('button', { name: '+ Add another project' }).click();
  await dialog.getByLabel('Project or product name 2').fill('Toolbox');
  await dialog
    .getByRole('group', { name: 'Achievements', exact: true })
    .nth(1)
    .getByLabel('Achievement 1', { exact: true })
    .fill('Released a command-line tool.');
  await dialog.getByRole('button', { name: 'Next: Education' }).click();
  await dialog
    .getByRole('textbox', { name: 'Education', exact: true })
    .fill('BSc — Example University, 2022\nDiploma — Example School, 2018');
  await dialog.getByRole('button', { name: 'Next: Skills' }).click();
  await dialog.getByRole('textbox', { name: 'Skills', exact: true }).fill('React, TypeScript');
  await dialog.getByRole('button', { name: 'Save master resume' }).click();
  await page.waitForURL(/\/resume-builder\?resume=.+/);
  await expect(page.getByText('Master resume · ready for a job', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Master resume · ready for a job', { exact: true })).toBeVisible();
  const source = String(
    workspace.query('SELECT source FROM resumes WHERE user_id = ?', workspace.userId)[0].source
  );
  for (const point of [
    'Built React screens.',
    'Released customer APIs.',
    'Built the customer dashboard.',
    'Built a reading queue.',
    'Added search.',
    'Released a command-line tool.',
    'Diploma — Example School, 2018',
  ])
    expect(source).toContain(point);
  expect(source).not.toContain('your.email@example.com');
  await page.getByRole('link', { name: 'Choose a job' }).click();
  await page.getByRole('button', { name: '+ Add Job', exact: true }).click();
  await page.getByRole('button', { name: /Paste the description instead/i }).click();
  await page.getByLabel('Company', { exact: true }).fill('Example Co');
  await page.getByLabel('Role', { exact: true }).fill('Frontend Engineer');
  await page
    .getByLabel('Job description', { exact: true })
    .fill(
      'Build customer-facing React and TypeScript interfaces, integrate APIs, improve performance, and ship readable product experiences.'
    );
  await page.getByRole('button', { name: 'Save pasted JD' }).click();
  await page.waitForURL(/\/tailor\/.+/);
  await expect(page.getByRole('region', { name: 'Target job' })).toBeVisible();
});

test('imported incomplete master can be completed without changing its original points', async ({
  page,
  workspace,
}) => {
  await page.goto('/resume-builder');
  await expect(page.getByRole('button', { name: 'Import Resume', exact: true })).toBeEnabled();
  await page.locator('input[type=file]').setInputFiles({
    name: 'incomplete-master.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      '# Alex\n\n## Experience\n\n### Acme\n\n- Built React screens.\n- Released APIs.\n'
    ),
  });
  await page.waitForURL(/\/resume-builder\?resume=.+/);
  await expect(
    page.getByText('Master resume · add missing details', { exact: true })
  ).toBeVisible();
  await page.getByLabel('Project or product name', { exact: true }).fill('Reader');
  await page
    .getByLabel('Project achievements — one point per line')
    .fill('Released Reader.\nAdded search.');
  await page
    .getByRole('textbox', { name: 'Education', exact: true })
    .fill('BSc — Example University, 2022');
  await page.getByRole('button', { name: 'Add details to master' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Master resume · ready for a job', { exact: true })).toBeVisible();
  const source = String(
    workspace.query('SELECT source FROM resumes WHERE user_id = ?', workspace.userId)[0].source
  );
  expect(source).toContain('- Built React screens.\n- Released APIs.');
  expect(source).toContain('### Reader');
  expect(source).toContain('BSc — Example University, 2022');
});

test('Always include selections persist with the base resume and education stays selected', async ({
  page,
  workspace,
}) => {
  const id = workspace.seedResume(
    '# Candidate\n\n## Experience\n\n### Acme\n\n- Shipped customer APIs.\n- Improved reliability.\n\n## Projects\n\n### Widget\n\n- Released Widget.\n\n## Education\n\nB.Tech, University.\n',
    'Pinned base'
  );
  await page.goto(`/editor/${id}`);
  await page.getByText('Always include · 0 points', { exact: true }).click();
  const education = page.getByRole('checkbox', { name: 'Education · always included' });
  await expect(education).toBeChecked();
  await expect(education).toBeDisabled();
  await page
    .getByRole('checkbox', { name: 'Always include: Shipped customer APIs.', exact: true })
    .check();
  await page
    .getByRole('checkbox', { name: 'Always include: Released Widget.', exact: true })
    .check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Always include · 2 points', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByText('Always include · 2 points', { exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Always include: Shipped customer APIs.', exact: true })
  ).toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Always include: Released Widget.', exact: true })
  ).toBeChecked();
  await expect(page.locator('#resume-print-target')).not.toContainText('rolepatch:always-include');
  const saved = String(workspace.query('SELECT source FROM resumes WHERE id = ?', id)[0].source);
  expect(saved.match(/rolepatch:always-include/g)).toHaveLength(2);
  await page
    .getByRole('checkbox', { name: 'Always include: Shipped customer APIs.', exact: true })
    .uncheck();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Always include · 1 point', { exact: true })).toBeVisible();
});

/**
 * E2E tests for the ATS board job discovery + paste-URL → tailor flow.
 *
 * Tests the manual technique: Google site: queries → copy ATS URL →
 * paste into "Add Job" → scrape → tailor.
 *
 * A local signed-in account exercises owner-scoped storage.
 * The actual scrape network call is not exercised here (covered by unit
 * tests); instead we pre-seed a guest job to verify the tailor page renders.
 */

test.describe('Job search tips', () => {
  test('search tips live on the Find jobs page, with the workspace navigation intact', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    const navigation = page.getByRole('navigation', { name: 'Jobs sections' });
    await expect(page.getByRole('heading', { name: 'Jobs', exact: true })).toBeVisible();
    await expect(page.getByLabel('Role or keywords')).toHaveCount(0);
    await expect(page.getByText('Application queue', { exact: true })).toHaveCount(0);
    await navigation.getByRole('link', { name: 'Find jobs', exact: true }).click();
    await expect(page).toHaveURL(/\/jobs\/discover$/);
    await expect(navigation.getByRole('link', { name: 'Find jobs', exact: true })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await expect(
      page
        .getByRole('navigation', { name: 'Primary', exact: true })
        .getByRole('link', { name: 'Jobs', exact: true })
    ).toHaveAttribute('aria-current', 'page');

    // The tips panel should be present
    const tipsButton = page.getByRole('button', {
      name: /find less-competitive jobs on ats boards/i,
    });
    await expect(tipsButton).toBeVisible();

    // Expand it
    await tipsButton.click();

    // Should show the keywords input
    await expect(page.getByPlaceholder(/product manager/i)).toBeVisible();

    // Should show board toggle buttons (Ashby, Greenhouse, Lever selected by default)
    await expect(page.getByRole('button', { name: 'Ashby' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Greenhouse' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lever' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Workday' })).toBeVisible();
  });

  test('builds a Google query preview and open link', async ({ page }) => {
    await page.goto('/jobs/discover');

    const tipsButton = page.getByRole('button', {
      name: /find less-competitive jobs on ats boards/i,
    });
    await tipsButton.click();

    // Type keywords
    const keywordsInput = page.getByPlaceholder(/product manager/i);
    await keywordsInput.fill('"product manager"');

    // Query preview should show the site: operators and keywords
    await expect(page.locator('pre')).toContainText('site:jobs.ashbyhq.com');
    await expect(page.locator('pre')).toContainText('"product manager"');

    // Open in Google link should have the correct href
    const googleLink = page.getByRole('link', { name: /open in google/i });
    await expect(googleLink).toBeVisible();
    const href = await googleLink.getAttribute('href');
    expect(href).toContain('google.com/search');
    expect(href).toContain('site%3Ajobs.ashbyhq.com');
    expect(href).toContain('%22product%20manager%22');
  });

  test('toggling boards updates the query', async ({ page }) => {
    await page.goto('/jobs/discover');

    const tipsButton = page.getByRole('button', {
      name: /find less-competitive jobs on ats boards/i,
    });
    await tipsButton.click();

    // Click "All" to select every board
    await page.getByRole('button', { name: 'All', exact: true }).click();

    // Query preview should include all 10 sites
    const preview = page.locator('pre');
    await expect(preview).toContainText('site:careers.icims.com');
    await expect(preview).toContainText('site:jobs.bamboohr.com');
    await expect(preview).toContainText('site:apply.jazz.co');
    await expect(preview).toContainText('site:careers.workable.com');

    // Click "None" — query preview should disappear, link disabled
    await page.getByRole('button', { name: 'None', exact: true }).click();
    await expect(page.locator('pre')).toHaveCount(0);
  });
});

async function seedReadyMaster(page: Page, workspace: WorkspaceFixture) {
  workspace.seedResume(await readFile('__tests__/fixtures/resume-import/synthetic.md', 'utf8'));
  await page.goto('/dashboard');
}

test.describe('Add Job modal', () => {
  test('opens and accepts an ATS board URL', async ({ page, workspace }) => {
    await seedReadyMaster(page, workspace);

    // Click Add Job
    const addJobButton = page.getByRole('button', { name: /\+ Add Job/i });
    await expect(addJobButton).toBeVisible();
    await addJobButton.click();

    // Modal should be visible
    await expect(page.getByText(/Add Job Application/i)).toBeVisible();

    const urlInput = page.getByLabel('Job URL', { exact: true });
    await expect(urlInput).toBeVisible();
    await urlInput.fill('https://boards.greenhouse.io/acme/jobs/12345');

    // Add Job submit button should be enabled (use exact match to distinguish
    // from the dashboard "+ Add Job" trigger button)
    const submitButton = page.getByRole('button', { name: 'Add Job', exact: true });
    await expect(submitButton).toBeEnabled();
  });

  test('falls back to manual JD paste and opens tailor page when scrape cannot read URL', async ({
    page,
    workspace,
  }) => {
    await seedReadyMaster(page, workspace);

    await page.getByRole('button', { name: /\+ Add Job/i }).click();
    await page.getByLabel('Job URL', { exact: true }).fill('http://127.0.0.1/job');
    await page.getByRole('button', { name: 'Add Job', exact: true }).click();

    await expect(page.getByLabel('Job description')).toBeVisible({ timeout: 15000 });
    await page.getByLabel('Company').fill('Fallback Co');
    await page.getByLabel('Role', { exact: true }).fill('Platform Engineer');
    await page
      .getByLabel('Job description')
      .fill(
        'We need a platform engineer with TypeScript, distributed systems, observability, and strong incident response experience.'
      );
    await page.getByRole('button', { name: 'Save pasted JD' }).click();

    await page.waitForURL(/\/tailor\/.+/);
    await expect(page.getByRole('region', { name: 'Target job' })).toBeVisible();
    const jobToggle = page.getByRole('button', { name: 'View job description and preparation' });
    if (await jobToggle.isVisible()) await jobToggle.click();
    await expect(page.locator('pre').filter({ hasText: /observability/i })).toBeVisible({
      timeout: 15000,
    });

    const jobs = workspace.query(
      'SELECT * FROM job_applications WHERE user_id = ?',
      workspace.userId
    );
    expect(jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          company: 'Fallback Co',
          role: 'Platform Engineer',
          jd_text: expect.stringContaining('observability'),
        }),
      ])
    );
  });

  test('Add Job stays disabled and explains the missing master resume', async ({ page }) => {
    await page.goto('/dashboard');
    const button = page.getByRole('button', { name: '+ Add Job', exact: true });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute(
      'title',
      'Complete your master resume before adding a job'
    );
    await expect(page.getByRole('link', { name: 'completing your master resume' })).toHaveAttribute(
      'href',
      '/resume-builder'
    );
  });
});

function seedJob(
  workspace: WorkspaceFixture,
  resume: string,
  company: string,
  role: string,
  url: string,
  description: string,
  status = 'draft'
) {
  const id = randomUUID();
  workspace.query(
    'INSERT INTO job_applications (id, user_id, resume_id, company, role, url, jd_raw, jd_text, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    workspace.userId,
    resume,
    company,
    role,
    url,
    description,
    description,
    status
  );
  return id;
}

test.describe('Tailor page', () => {
  test('renders the tailor page with a scraped ATS job', async ({ page, workspace }) => {
    const resume = workspace.seedResume(
      '# Alex Morgan\n\n## Experience\n- Built platform tooling.'
    );
    const job = seedJob(
      workspace,
      resume,
      'Acme',
      'Product Manager',
      'https://boards.greenhouse.io/acme/jobs/12345',
      'We are looking for a Product Manager to drive our platform vision.'
    );
    await page.goto(`/tailor/${job}`);
    await expect(page.getByRole('region', { name: 'Target job' })).toBeVisible();
    const jobToggle = page.getByRole('button', { name: 'View job description and preparation' });
    if (await jobToggle.isVisible()) await jobToggle.click();

    // Use the <pre> element that contains the JD text to avoid matching
    // the "Job Description" heading.
    await expect(page.locator('pre').filter({ hasText: /platform vision/i })).toBeVisible({
      timeout: 15000,
    });
    // The job URL link is rendered once activeJob is set
    await expect(page.getByRole('link', { name: /boards\.greenhouse\.io\/acme/i })).toBeVisible();
  });

  test('returns to standalone History from the tailor page', async ({ page, workspace }) => {
    const resume = workspace.seedResume(
      '# Alex Morgan\n\n## Experience\n- Built platform tooling.'
    );
    const job = seedJob(
      workspace,
      resume,
      'TestCo',
      'Engineer',
      'https://jobs.ashbyhq.com/testco/engineer',
      'Job description'
    );
    await page.goto(`/tailor/${job}`);
    await expect(page.getByRole('region', { name: 'Target job' })).toBeVisible();
    const jobToggle = page.getByRole('button', { name: 'View job description and preparation' });
    if (await jobToggle.isVisible()) await jobToggle.click();
    // Use the <pre> element that contains the JD text to avoid matching
    // the "Job Description" heading.
    await expect(page.locator('pre').filter({ hasText: /Job description/i })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('main').getByRole('link', { name: 'History', exact: true }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByRole('button', { name: 'Engineer', exact: true })).toBeVisible();
  });
});

test.describe('Apply-agent queue receipts', () => {
  test('records a manual receipt from a queued application', async ({ page, workspace }) => {
    const { query, userId } = workspace;
    const resume = workspace.seedResume(
      '# Alex Morgan\n\n## Experience\n- Built reliable apply workflows.'
    );
    const jobId = seedJob(
      workspace,
      resume,
      'ReceiptCo',
      'Platform Engineer',
      'https://jobs.lever.co/receiptco/123',
      'Build a transparent application workflow with receipts.',
      'tailored'
    );
    const queueId = randomUUID();
    query(
      'INSERT INTO tailored_resumes (id, user_id, job_id, resume_id, source) VALUES (?, ?, ?, ?, ?)',
      randomUUID(),
      userId,
      jobId,
      resume,
      'Tailored resume content'
    );
    query(
      'INSERT INTO cover_letters (id, user_id, job_id, resume_id, content) VALUES (?, ?, ?, ?, ?)',
      randomUUID(),
      userId,
      jobId,
      resume,
      'Cover letter content'
    );
    query(
      'INSERT INTO profile_answers (id, user_id, category, label, answer, sensitive) VALUES (?, ?, ?, ?, ?, ?)',
      randomUUID(),
      userId,
      'work_authorization',
      'Work authorization',
      'Yes',
      1
    );
    query(
      'INSERT INTO application_queue (id, user_id, job_id, status, readiness_json) VALUES (?, ?, ?, ?, ?)',
      queueId,
      userId,
      jobId,
      'ready_to_submit',
      JSON.stringify({
        status: 'ready_for_review',
        summary: 'Tailored materials and profile answers are ready for final review.',
        missing: [],
        checks: {
          resume: true,
          tailored_resume: true,
          cover_letter: true,
          profile_answers: true,
          receipt: false,
        },
      })
    );
    await page.goto('/jobs');

    await page
      .getByRole('navigation', { name: 'Jobs sections' })
      .getByRole('link', { name: 'Apply queue', exact: true })
      .click();
    await expect(page).toHaveURL(/\/jobs\/queue$/);
    await expect(page.getByText('Application queue', { exact: true })).toBeVisible();
    await expect(page.getByText(/ReceiptCo · Tailored materials/i)).toBeVisible();
    await page.getByRole('button', { name: 'Mark submitted' }).click();

    await expect(page.getByText(/Receipt: lever/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Marked submitted manually in RolePatch/i)).toBeVisible();

    expect(query('SELECT status FROM job_applications WHERE id = ?', jobId)[0].status).toBe(
      'applied'
    );
    const queue = query(
      'SELECT status, readiness_json FROM application_queue WHERE id = ?',
      queueId
    )[0];
    expect(queue.status).toBe('submitted');
    expect(JSON.parse(String(queue.readiness_json)).checks.receipt).toBe(true);
    const receipts = query('SELECT * FROM application_receipts WHERE job_id = ?', jobId);
    expect(receipts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          job_id: jobId,
          queue_id: queueId,
          provider: 'lever',
          status: 'submitted',
          confirmation_text: 'Marked submitted manually in RolePatch.',
        }),
      ])
    );
  });
});

test.describe('Find jobs', () => {
  test('old observed feed URLs open Find jobs', async ({ page }) => {
    await page.goto('/jobs?page=2');
    await expect(page).toHaveURL(/\/jobs\/discover\?page=2$/);
    await expect(page.getByText(/Ashby, Greenhouse, Lever/i)).toBeVisible();
  });
});
