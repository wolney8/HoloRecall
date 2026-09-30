import { defineConfig, devices } from '@playwright/test';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= '.runtime/playwright';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env['HOLORECALL_VIDEO'] === '1' ? 'on' : 'off',
  },
  projects: [
    { name: 'chromium', grepInvert: /@ios-/, use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', grepInvert: /@ios-/, use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-compact', grep: /@ios-compact/, use: { ...devices['iPhone SE'] } },
    { name: 'webkit-large', grep: /@ios-large/, use: { ...devices['iPhone 15 Pro Max'] } },
    { name: 'webkit-landscape', grep: /@ios-landscape/, use: { ...devices['iPhone 15 Pro Max landscape'] } },
  ],
});
