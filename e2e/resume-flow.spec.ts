import { expect, test } from './fixtures/workspace';

test('can create and edit a signed-in resume', async ({ page, workspace }) => {
  await workspace.signIn();
  await page.goto('/resume-builder');
  await page.getByRole('button', { name: '+ New Resume', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page).toHaveURL(/resume-builder\?resume=/);
  const [resume] = workspace.query('SELECT id FROM resumes WHERE user_id = ?', workspace.userId);
  await page.goto(`/editor/${resume.id}`);
  const editor = page.locator('.cm-content');
  await editor.click();
  await editor.pressSequentially('Updated profile');
  await expect(editor).toContainText('Updated profile');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(
      () => workspace.query('SELECT source FROM resumes WHERE id = ?', String(resume.id))[0].source
    )
    .toContain('Updated profile');
  await page.reload();
  await expect(editor).toContainText('Updated profile');
});
