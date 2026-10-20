import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Local runs: load .env.local if present. In CI the vars come from the environment.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

// BASE_URL defaults to http://localhost:3000 (set it to target another host).
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

// PROD_URL targets an already-running deployment with the read-only `prod` project only:
// no local server is started and the setup project (which needs the local DB) is not used.
const prodUrl = process.env.PROD_URL;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  // Headless Firefox on Windows stalls (30s+ hangs in random tests) with the default
  // cores/2 workers, so cap local runs at 4. CI keeps Playwright's default; PW_WORKERS overrides both.
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : process.env.CI ? undefined : 4,
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
    { name: 'chromium', testIgnore: /e2e[\/]prod[\/]/, dependencies: ['setup'], use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: /e2e[\/]prod[\/]/, dependencies: ['setup'], use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', testIgnore: /e2e[\/]prod[\/]/, dependencies: ['setup'], use: { ...devices['Pixel 7'] } },
    // Read-only smoke tests against a deployed URL (PROD_URL). No dependencies, no writes.
    // trace/screenshot/video off: the nightly artifact is public and must not contain production page content.
    { name: 'prod', testMatch: /e2e[\/]prod[\/].*\.spec\.ts/, use: { ...devices['Desktop Chrome'], baseURL: prodUrl, trace: 'off', screenshot: 'off', video: 'off' } },
  ],
  // Playwright starts webServer for any run, even `--project=prod`, so skip it when PROD_URL is set.
  // Consequence: with PROD_URL set the other projects need their server started manually.
  webServer: prodUrl
    ? undefined
    : {
        command: 'npm run start',
        url: baseURL + '/api/health',
        reuseExistingServer: !process.env.CI,
      },
});
