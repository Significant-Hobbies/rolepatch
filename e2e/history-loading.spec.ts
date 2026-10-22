import { expect, test } from '@playwright/test';

for (const width of [390, 768, 1440]) {
  for (const completeResume of [false, true]) {
    test(`saved guest history is not shown as empty while auth resolves at ${width}px (complete resume: ${completeResume})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((completeResume) => {
        const state = window as unknown as Window & { historyLayoutShifts: number[] };
        state.historyLayoutShifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
            if (!shift.hadRecentInput) state.historyLayoutShifts.push(shift.value);
          }
        }).observe({ type: 'layout-shift', buffered: true });
        if (completeResume)
          localStorage.setItem(
            'rt-resumes',
            JSON.stringify([
              {
                id: 'pending-history-resume',
                name: 'Synthetic resume',
                source:
                  '# Synthetic Applicant\n\n## Experience\n\n### Example\n\n- Built React screens.\n\n## Projects\n\n### Reader\n\n- Added search.\n\n## Education\n\nBSc Example University\n\n## Skills\n\nReact',
                created_at: 1792660000,
                updated_at: 1792660000,
              },
            ])
          );
        localStorage.setItem(
          'rt-jobs',
          JSON.stringify([
            {
              id: 'pending-history-job',
              resume_id: 'pending-history-resume',
              company: 'Acceptance fixture',
              role: 'Saved pending history job',
              status: 'draft',
              url: '',
              jd_text: '',
              created_at: 1792660000,
              updated_at: 1792660000,
            },
          ])
        );
      }, completeResume);
      let releaseSession: () => void = () => {};
      const sessionGate = new Promise<void>((resolve) => {
        releaseSession = resolve;
      });
      await page.route('**/api/auth/get-session**', async (route) => {
        await sessionGate;
        await route.fulfill({ json: null });
      });
      try {
        await page.goto('/dashboard');
        const history = page.getByRole('region', { name: 'History', exact: true });
        await expect(page.getByRole('heading', { name: 'Jobs', exact: true })).toBeVisible();
        await expect(history.getByText('No job history yet', { exact: true })).toHaveCount(0);
        await expect(history.getByText('0 jobs', { exact: true })).toHaveCount(0);
        await expect(history.getByRole('group', { name: 'Filter history' })).toHaveCount(0);
        await expect(history.getByRole('status', { name: 'Loading job history' })).toBeVisible();
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
        ).toBeLessThanOrEqual(0.1);
      } finally {
        releaseSession();
      }
    });
  }
}
