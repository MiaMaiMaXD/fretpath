import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Local runs: load .env.local if present. In CI the vars come from the environment.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

// BASE_URL defaults to http://localhost:3000 (set it to target another host).
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/, teardown: 'teardown' },
    { name: 'teardown', testMatch: /auth\.teardown\.ts/ },
    { name: 'chromium', dependencies: ['setup'], use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', dependencies: ['setup'], use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', dependencies: ['setup'], use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run start',
    url: baseURL + '/api/health',
    reuseExistingServer: !process.env.CI,
  },
});
