import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test as setup, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { createTestUser } from './utils/supabaseAdmin';

const AUTH_DIR = 'e2e/.auth';

setup('login as shared read-only member', async ({ page }) => {
  const user = await createTestUser({ role: 'member' });
  mkdirSync(AUTH_DIR, { recursive: true });
  // Record the id before any UI step so teardown can always delete the user.
  // Append: a retry or an earlier killed run must not lose previously recorded ids.
  const file = `${AUTH_DIR}/users.json`;
  let ids: string[] = [];
  if (existsSync(file)) {
    try {
      ids = (JSON.parse(readFileSync(file, 'utf8')) as { ids: string[] }).ids ?? [];
    } catch {
      ids = [];
    }
  }
  writeFileSync(file, JSON.stringify({ ids: [...ids, user.id] }));

  const login = new LoginPage(page);
  await login.goto();
  await login.login(user.email, user.password);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: `${AUTH_DIR}/member.json` });
});
