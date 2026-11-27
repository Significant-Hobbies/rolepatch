import { randomUUID } from 'node:crypto';
import { expect, test } from './fixtures/workspace';

for (const width of [390, 768, 1440]) {
  for (const completeResume of [false, true]) {
    test(`saved history is not shown as empty while auth resolves at ${width}px (complete resume: ${completeResume})`, async ({
      page,
      workspace,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await workspace.signIn();
      const resume = completeResume
        ? workspace.seedResume(
            '# Alex Morgan\n\n## Experience\n- Built tooling.\n\n## Education\nBSc.'
          )
        : null;
      workspace.query(
        'INSERT INTO job_applications (id, user_id, resume_id, company, role) VALUES (?, ?, ?, ?, ?)',
        randomUUID(),
        workspace.userId,
        resume,
        'Acceptance fixture',
        'Saved pending history job'
      );
      await page.addInitScript(() => {
        const state = window as unknown as Window & { historyLayoutShifts: number[] };
        state.historyLayoutShifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
            if (!shift.hadRecentInput) state.historyLayoutShifts.push(shift.value);
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      let releaseSession: () => void = () => {};
      const sessionGate = new Promise<void>((resolve) => {
        releaseSession = resolve;
      });
      await page.route('**/api/auth/get-session**', async (route) => {
        await sessionGate;
        await route.continue();
      });
      try {
        await page.goto('/history');
        const history = page.getByRole('region', { name: 'History', exact: true });
        await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
        await expect(history.getByText('No job history yet', { exact: true })).toHaveCount(0);
        await expect(history.getByText('0 jobs', { exact: true })).toHaveCount(0);
        await expect(
          history.getByRole('button', { name: 'Saved pending history job', exact: true })
        ).toBeVisible();
        // Let viewport initialization settle before measuring the data transition.
        await page.waitForTimeout(600);
        releaseSession();
        await expect(
          history.getByRole('button', { name: 'Saved pending history job', exact: true })
        ).toBeVisible();
        await expect(history.getByRole('status')).toHaveCount(0);
        await expect(history.getByText('1 job', { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        await page.waitForTimeout(600);
        expect(
          await page.evaluate(() =>
            (
              window as unknown as Window & { historyLayoutShifts: number[] }
            ).historyLayoutShifts.reduce((sum, value) => sum + value, 0)
          )
        ).toBeLessThanOrEqual(0.05);
      } finally {
        releaseSession();
      }
    });
  }
}
