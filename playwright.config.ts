import { defineConfig, devices } from '@playwright/test';
import { workspaceTestEnv } from './e2e/fixtures/environment.mjs';

// Plain Playwright config (formerly @saas-maker/test-config/playwright factory, inlined).
const ci = Boolean(process.env.CI);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? 'pnpm dev';
const testEnv = workspaceTestEnv(baseURL);
process.env.ROLEPATCH_E2E_DB_PATH = testEnv.ROLEPATCH_E2E_DB_PATH;
process.env.ROLEPATCH_E2E_AUTH_SECRET = testEnv.ROLEPATCH_E2E_AUTH_SECRET;

export default defineConfig({
  testDir: './e2e',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? 'test-results',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 2 : 0,
  workers: ci ? 2 : undefined,
  reporter: ci
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: ci ? 'retain-on-failure' : 'off',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: webServerCommand,
    url: baseURL,
    env: testEnv,
    reuseExistingServer: process.env.ROLEPATCH_E2E_REUSE_SERVER === '1',
  },
});
