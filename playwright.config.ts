import { devices } from '@playwright/test';
import { definePlaywrightConfig } from '@saas-maker/test-config/playwright';

export default definePlaywrightConfig({
  baseURL: 'http://localhost:3000',
  testDir: './e2e',
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
  },
  extend: {
    projects: [
      // Desktop baseline.
      { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
      // Mobile-viewport project — iPhone 13 is 390px wide, the Wave 1 target.
      { name: 'mobile', use: { ...devices['iPhone 13'] } },
    ],
  },
});
