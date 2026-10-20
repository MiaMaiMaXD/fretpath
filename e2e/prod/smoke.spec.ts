import { createClient } from '@supabase/supabase-js';
import { test, expect } from '@playwright/test';

// Read-only smoke tests for a deployed environment. Never create, change or delete data here.
const isLocal = (url: string | undefined) => !url || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);

test('TC-PRD-01 health reports database reachable @prod', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test('TC-PRD-02 home page renders in Thai with security headers @prod', async ({ page, baseURL }) => {
  const res = await page.goto('/');
  await expect(page.getByRole('heading', { name: 'FretPath' })).toBeVisible();
  const h = res!.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  // HSTS is only meaningful over https; a local production build on http skips this check.
  if (baseURL?.startsWith('https://')) expect(h['strict-transport-security']).toContain('max-age=');
  else test.info().annotations.push({ type: 'skip-hsts', description: 'http base URL: HSTS check skipped' });
});

test('TC-PRD-03 anonymous /admin and /dashboard redirect to login @prod', async ({ page }) => {
  for (const path of ['/admin', '/dashboard']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
  }
});

test('TC-PRD-04 seed test accounts do not exist on production @prod', async ({ page, baseURL }) => {
  test.skip(isLocal(baseURL), 'local database is seeded with member@fretpath.test, so the login would succeed');
  await page.goto('/login');
  // Exactly one read-only login attempt.
  await page.getByLabel('อีเมล').fill('member@fretpath.test');
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('Passw0rd!');
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await expect(page.getByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('TC-PRD-06 public course list shows guitar-basics @prod', async () => {
  // Only local runs may fall back to the (seeded) local DB; a real PROD_URL must bring its own keys,
  // otherwise this would query the local database and pass falsely.
  const local = isLocal(process.env.PROD_URL);
  const url = process.env.PROD_SUPABASE_URL ?? (local ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined);
  const key = process.env.PROD_SUPABASE_ANON_KEY ?? (local ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined);
  if (!url || !key) throw new Error('PROD_SUPABASE_URL and PROD_SUPABASE_ANON_KEY are required when PROD_URL is not local');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from('courses').select('title');
  expect(error).toBeNull();
  expect(data?.map((c) => c.title)).toContain('กีตาร์พื้นฐาน');
});
