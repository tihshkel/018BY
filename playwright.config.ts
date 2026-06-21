import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.E2E_WEB_PORT ?? '8081';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e/playwright',
  timeout: 600_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  outputDir: './playwright-artifacts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-html-report', open: 'never' }],
    ['json', { outputFile: 'test-results/diary-audit/playwright-results.json' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npx expo start --web --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});
