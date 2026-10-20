import { test, expect, watchCsp } from '../fixtures';

// Opt out of the auto-fail so we can assert the guard itself detects a violation.
test.use({ cspGuard: false });

test('TC-SEC-25 CSP guard detects a violation @security', async ({ page }) => {
  const violations = watchCsp(page.context());
  await page.goto('/login');
  await page.evaluate(() => {
    document.body.append(Object.assign(document.createElement('iframe'), { src: 'https://evil.example' }));
  });
  await expect.poll(() => violations.length).toBeGreaterThan(0);
});
