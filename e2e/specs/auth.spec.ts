import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { latestLinkFor } from '../utils/mailpit';
import { adminClient, deleteUserByEmail } from '../utils/supabaseAdmin';

const newEmail = () => `qa+${randomUUID()}@fretpath.test`;

test('TC-AUTH-01 signup, confirm email, land on dashboard with lesson 1 unlocked @smoke @regression', async ({ page }) => {
  const email = newEmail();
  try {
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.signup(email, 'Passw0rd!');
    await expect(signup.successMessage()).toBeVisible();

    await page.goto(await latestLinkFor(email));
    await page.getByRole('button', { name: 'ยืนยันและเข้าสู่ระบบ' }).click();
    await expect(page).toHaveURL((u) => u.pathname === '/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // The /path page arrives in Task 5: assert the unlock through the DB for now.
    const admin = adminClient();
    let user: { id: string } | undefined;
    for (let pg = 1; !user; pg++) {
      const { data } = await admin.auth.admin.listUsers({ page: pg, perPage: 200 });
      user = data.users.find((u) => u.email === email);
      if (data.users.length < 200) break;
    }
    expect(user).toBeTruthy();
    const { data: lesson } = await admin.from('lessons').select('id').eq('slug', 'guitar-anatomy-tuning').single();
    const { data: progress } = await admin
      .from('lesson_progress')
      .select('status')
      .eq('user_id', user!.id)
      .eq('lesson_id', lesson!.id)
      .single();
    expect(progress?.status).toBe('unlocked');
  } finally {
    await deleteUserByEmail(email);
  }
});

test('TC-AUTH-02 password shorter than 8 shows Thai error under field @regression', async ({ page }) => {
  const signup = new SignupPage(page);
  await signup.goto();
  const email = newEmail();
  await signup.signup(email, '1234567');
  await expect(page.getByText('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')).toBeVisible();
  await expect(page.getByLabel('รหัสผ่าน', { exact: true })).toHaveAccessibleDescription(
    'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร',
  );
  await expect(page.getByLabel('อีเมล')).toHaveValue(email);
});

test('TC-AUTH-03 unconfirmed account cannot log in @regression', async ({ page }) => {
  const email = newEmail();
  try {
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.signup(email, 'Passw0rd!');
    await expect(signup.successMessage()).toBeVisible();

    const login = new LoginPage(page);
    await login.goto();
    await login.login(email, 'Passw0rd!');
    await expect(page.getByText('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    // The unconfirmed notice offers a resend; it sends a second confirmation email.
    const first = await latestLinkFor(email);
    // Local GoTrue allows one confirmation email per address per second (auth.email.max_frequency).
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'ส่งลิงก์ยืนยันอีกครั้ง' }).click();
    await expect(page.getByText('ถ้าบัญชีนี้ยังไม่ได้ยืนยัน เราได้ส่งลิงก์ไปแล้ว')).toBeVisible();
    await expect.poll(() => latestLinkFor(email), { timeout: 10_000 }).not.toBe(first);
  } finally {
    await deleteUserByEmail(email);
  }
});

test('TC-AUTH-04 wrong password shows generic message @smoke @regression', async ({ page, member }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(member.email, 'wrongpass1');
  await expect(page.getByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง')).toBeVisible();
  await expect(page.getByLabel('อีเมล')).toHaveValue(member.email);

  await login.goto();
  await login.login(newEmail(), 'wrongpass1');
  await expect(page.getByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง')).toBeVisible();
});

test('TC-AUTH-05 logout returns to home and protects pages @regression', async ({ memberPage }) => {
  await memberPage.getByRole('button', { name: 'ออกจากระบบ' }).click();
  await expect(memberPage).toHaveURL(/\/$/);
  await memberPage.goto('/dashboard');
  await expect(memberPage).toHaveURL(/\/login\?next=%2Fdashboard$/);
});

test('TC-AUTH-06 forgot password always shows same message and reset works @regression', async ({ page, member }) => {
  const message = 'ถ้ามีบัญชีนี้ เราได้ส่งลิงก์ไปแล้ว';
  const ask = async (email: string) => {
    await page.goto('/forgot-password');
    await page.getByLabel('อีเมล').fill(email);
    await page.getByRole('button', { name: 'ส่งลิงก์ตั้งรหัสผ่านใหม่' }).click();
    await expect(page.getByText(message)).toBeVisible();
  };
  await ask(newEmail());
  await ask(member.email);

  await page.goto(await latestLinkFor(member.email));
  await page.getByRole('button', { name: 'ยืนยันและเข้าสู่ระบบ' }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/reset-password');
  await page.getByLabel('รหัสผ่านใหม่').fill('NewPassw0rd!');
  await page.getByRole('button', { name: 'ตั้งรหัสผ่านใหม่' }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/dashboard');

  await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
  // Wait for sign-out to finish; navigating away mid-action leaves the session alive.
  await expect(page).toHaveURL(/\/$/);
  const login = new LoginPage(page);
  await login.goto();
  await login.login(member.email, 'NewPassw0rd!');
  await expect(page).toHaveURL((u) => u.pathname === '/dashboard');
});

test('TC-AUTH-07 next parameter never leaves the site @security @regression', async ({ page, member }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL ?? 'http://localhost:3000';
  const origin = new URL(baseURL).origin;
  const login = new LoginPage(page);
  for (const evil of ['https://evil.example', '//evil.example', '/\\evil.example']) {
    await login.goto(evil);
    await login.login(member.email, member.password);
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(new URL(page.url()).origin).toBe(origin);
    await page.context().clearCookies();
  }

  // A callback without a code cannot sign anyone in and must not bounce to the external `next`.
  await page.goto('/auth/callback?next=//evil.example');
  await expect(page).toHaveURL(/\/login\?error=link/);
  expect(new URL(page.url()).origin).toBe(origin);
});

test('TC-AUTH-08 expired session returns to original page after login @smoke @regression', async ({ page, member }) => {
  await page.goto('/practice');
  await expect(page).toHaveURL(/\/login\?next=%2Fpractice$/);
  const login = new LoginPage(page);
  await login.login(member.email, member.password);
  await expect(page).toHaveURL(/\/practice$/);
});
