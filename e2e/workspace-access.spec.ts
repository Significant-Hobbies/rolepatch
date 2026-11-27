import { randomUUID } from 'node:crypto';
import { expect, test } from './fixtures/workspace';

test('private pages redirect to sign-in before rendering workspace content', async ({
  request,
}) => {
  const destinations = [
    ['/resume-builder?resume=sample', '/resume-builder?resume=sample'],
    ['/resume-builder/evidence', '/resume-builder/evidence'],
    ['/resume-builder/profile', '/resume-builder/profile'],
    ['/resume-builder/generate', '/resume-builder/generate'],
    ['/dashboard', '/jobs'],
    ['/jobs?source=mail&stage=applied&stage=offer', '/jobs?source=mail&stage=applied&stage=offer'],
    ['/jobs/discover?page=2', '/jobs/discover?page=2'],
    ['/jobs/queue', '/jobs/queue'],
    ['/history', '/history'],
    ['/editor/sample', '/editor/sample'],
    ['/tailor/sample', '/tailor/sample'],
    ['/interview-prep/sample', '/interview-prep/sample'],
    ['/cover-letter/sample', '/cover-letter/sample'],
    ['/settings?client_id=sample&sig=a%2Bb', '/settings?client_id=sample&sig=a%2Bb'],
  ];

  for (const [path, returnTo] of destinations) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(307);
    const location = new URL(response.headers().location, 'http://localhost:3000');
    expect(location.pathname, path).toBe('/sign-in');
    expect(location.searchParams.get('returnTo'), path).toBe(returnTo);
    expect(await response.text()).not.toContain('id="workspace-content"');
  }
});

test('signed-out visitors see a standalone sign-in page and a safe Google return path', async ({
  page,
}) => {
  await page.goto('/resume-builder/evidence?resume=sample#sources');
  await expect(page.getByRole('heading', { name: 'Sign in to RolePatch' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
  await expect(page.locator('#workspace-content')).toHaveCount(0);
  const button = page.getByRole('button', { name: 'Continue with Google' });
  await page.route('**/api/auth/sign-in/social', (route) =>
    route.fulfill({ status: 400, json: { message: 'Test OAuth error' } })
  );
  const googleRequest = page.waitForRequest('**/api/auth/sign-in/social');
  await button.click();
  expect((await googleRequest).postDataJSON()).toMatchObject({
    provider: 'google',
    callbackURL: '/resume-builder/evidence?resume=sample#sources',
  });
  await expect(
    page.getByRole('alert').filter({ hasText: 'Google sign-in didn’t finish' })
  ).toBeVisible();

  await page.goto('/sign-in?returnTo=%2F%2Fexample.invalid%2Fsteal');
  const safeRequest = page.waitForRequest('**/api/auth/sign-in/social');
  await button.click();
  expect((await safeRequest).postDataJSON()).toMatchObject({ callbackURL: '/resume-builder' });
});

test('forged or expired cookies cannot open the dashboard', async ({
  context,
  page,
  workspace,
}) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'forged', url: 'http://localhost' },
  ]);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/sign-in\?/);

  await workspace.signIn(new Date(Date.now() - 60_000));
  await page.goto('/history');
  await expect(page).toHaveURL(/\/sign-in\?/);
  await expect(page.locator('#workspace-content')).toHaveCount(0);
});

test('a valid account can open the workspace and sign-out closes it', async ({
  page,
  workspace,
}) => {
  const id = workspace.seedResume('# Alex Morgan\n\n## Skills\n- TypeScript');
  await workspace.signIn();
  await page.goto(`/resume-builder?resume=${id}`);
  await expect(page.getByRole('heading', { name: 'Resume Builder', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'History', exact: true }).first()).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/sign-in?returnTo=%2Fsettings');
  await page.goto('/jobs');
  await expect(page).toHaveURL(/\/sign-in\?/);
});

test('a returning guest can choose to bring a browser-saved résumé into their account', async ({
  page,
  workspace,
}) => {
  const id = randomUUID();
  const resume = {
    id,
    name: 'Saved guest master',
    source: '# Alex Morgan\n\n## Experience\n\n- Built accessible tools.',
    created_at: 1,
    updated_at: 1,
  };
  await page.addInitScript((resume) => {
    localStorage.setItem('rt-migrated', '1');
    localStorage.setItem('rt-jobs', 'incomplete old browser storage');
    localStorage.setItem('rt-resumes', JSON.stringify([resume]));
  }, resume);
  await page.goto(`/resume-builder?resume=${id}`);
  await expect(page.getByRole('heading', { name: 'Sign in to RolePatch' })).toBeVisible();
  await workspace.signIn();
  await page.goto(`/resume-builder?resume=${id}`);
  await expect(page.getByText(/saved in this browser/i)).toBeVisible();
  expect(workspace.query('SELECT id FROM resumes WHERE id = ?', id)).toHaveLength(0);
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByLabel('Master resume', { exact: true })).toHaveValue(id);
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toHaveCount(0);
  expect(workspace.query('SELECT user_id FROM resumes WHERE id = ?', id)[0].user_id).toBe(
    workspace.userId
  );
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('rt-resumes') ?? '[]'))).toEqual(
    [resume]
  );
});

test('signing out on a public tool keeps its inputs on screen', async ({ page, workspace }) => {
  await workspace.signIn();
  await page.goto('/jobs/queue');
  await page.getByRole('link', { name: 'Review tools' }).click();
  await page.locator('a[href="/tools/diff"]').click();
  const original = page.locator('textarea').first();
  await original.fill('Keep this text when signing out');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.route('**/api/auth/get-session**', (route) =>
    route.fulfill({ status: 503, json: { message: 'Session refetch unavailable' } })
  );
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/tools\/diff$/);
  await expect(original).toHaveValue('Keep this text when signing out');
  await page.goBack();
  await expect(page).toHaveURL(/\/tools$/);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Sign in to RolePatch' })).toBeVisible();
  await expect(page.locator('#workspace-content')).toHaveCount(0);
});

test('document history is gated after sign-out', async ({ page, workspace }) => {
  await workspace.signIn();
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
  await page.goto('/pricing');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Sign in to RolePatch' })).toBeVisible();
  await expect(page.locator('#workspace-content')).toHaveCount(0);
});
