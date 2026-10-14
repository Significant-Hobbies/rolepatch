import { expect, test } from '@playwright/test';

for (const width of [390, 768, 1440]) {
  test(`initial editor toolbar hit targets and keyboard access at ${width}`, async ({
    context,
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await context.addInitScript(() => {
      localStorage.setItem(
        'rt-resumes',
        JSON.stringify([
          {
            id: 'synthetic-toolbar',
            name: 'Synthetic Resume',
            source: '# Ada Example\n\n## Experience\n- Built accessible TypeScript screens.\n',
            created_at: 1767225600,
            updated_at: 1767225600,
          },
        ])
      );
    });
    await context.routeWebSocket('**/*', (socket) => socket.close());
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== new URL(testInfo.project.use.baseURL!).origin) return route.abort();
      if (url.pathname === '/api/auth/get-session') return route.fulfill({ json: null });
      if (url.pathname.startsWith('/api/'))
        return route.fulfill({ status: 503, json: { error: 'Unseeded synthetic operation' } });
      return route.continue();
    });
    await page.goto('/editor/synthetic-toolbar');
    await expect(page.locator('.cm-editor')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const toolbar = page.locator('.product-editor-toolbar');
    const targets = [
      toolbar.getByTitle('Back to Resume Builder'),
      toolbar.getByTitle('Click to rename'),
      toolbar.getByTitle('Format settings'),
      toolbar.locator('summary').filter({ hasText: 'Export resume' }),
      toolbar.getByRole('button', { name: 'Save', exact: true }),
    ];
    const initialScroll = await toolbar.evaluate((element) => {
      const pane = element.parentElement!;
      return { document: window.scrollX, pane: pane.scrollLeft };
    });
    // No locator.click(), focus() or scrollIntoView() before these initial hit tests.
    for (const target of targets) {
      expect(
        await target.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const first = document.elementsFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2
          )[0];
          return (
            box.width > 0 &&
            box.height > 0 &&
            box.x >= 0 &&
            box.right <= innerWidth &&
            first != null &&
            (first === element || element.contains(first))
          );
        })
      ).toBe(true);
    }
    expect(
      await toolbar.evaluate((element) => ({
        document: window.scrollX,
        pane: element.parentElement!.scrollLeft,
      }))
    ).toEqual(initialScroll);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await expect(page.locator('.resume-page').first()).toHaveCSS('width', '816px');
    await page.screenshot({ path: testInfo.outputPath('initial.png'), fullPage: true });
    const reached = new Set<string>();
    for (let index = 0; index < 50 && reached.size < targets.length; index += 1) {
      await page.keyboard.press('Tab');
      for (let n = 0; n < targets.length; n += 1)
        if (await targets[n].evaluate((element) => element === document.activeElement))
          reached.add(String(n));
    }
    expect(reached.size).toBe(targets.length);
    // Open at its measured coordinate; pointer qualification cannot silently pan the pane.
    const format = await toolbar.getByTitle('Format settings').boundingBox();
    await page.mouse.click(format!.x + format!.width / 2, format!.y + format!.height / 2);
    for (const control of ['select', 'input[type=number]']) {
      for (const element of await toolbar.locator(control).all()) {
        expect(
          await element.evaluate((node) => {
            const box = node.getBoundingClientRect();
            const first = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            return box.width > 0 && first != null && (first === node || node.contains(first));
          })
        ).toBe(true);
      }
    }
    await page.screenshot({ path: testInfo.outputPath('settings.png'), fullPage: true });
  });
}
