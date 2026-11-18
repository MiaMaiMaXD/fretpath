import { randomUUID } from 'node:crypto';
import { test, expect, watchCsp } from '../fixtures';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { latestLinkFor, latestOtpFor } from '../utils/mailpit';
import { deleteUserByEmail } from '../utils/supabaseAdmin';

const newEmail = () => `qa+${randomUUID()}@fretpath.test`;

test('TC-AUTH-11 confirmation link works in a fresh browser context @smoke @regression', async ({ page, browser }) => {
  const email = newEmail();
  const fresh = await browser.newContext(); // no cookies: simulates opening the mail on another device
  const csp = watchCsp(fresh);
  try {
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.signup(email, 'Passw0rd!');
    await expect(signup.successMessage()).toBeVisible();

    const link = await latestLinkFor(email);
    expect(link).toContain('/auth/confirm?token_hash=');
    const other = await fresh.newPage();
    await other.goto(link);
    await other.getByRole('button', { name: 'ยืนยันและเข้าสู่ระบบ' }).click();
    await expect(other).toHaveURL((u) => u.pathname === '/dashboard');
    await expect(other.getByRole('heading', { level: 1, name: /สวัสดี|ยินดีต้อนรับ/ })).toBeVisible();
    expect(csp, 'CSP violations in console').toEqual([]);
  } finally {
    await fresh.close();
    await deleteUserByEmail(email);
  }
});

test('TC-AUTH-13 password reset by OTP: wrong code rejected, right code (pasted) resets, no CSP errors @regression', async ({ page, member }) => {
  const csp = watchCsp(page.context());
  await page.goto('/forgot-password');
  await page.getByLabel('อีเมล').fill(member.email);
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/forgot-password/verify');
  const code = await latestOtpFor(member.email);

  const wrong = code === '000000' ? '111111' : '000000';
  await page.keyboard.type(wrong);
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page.getByText('รหัส OTP ไม่ถูกต้อง')).toBeVisible();

  // Paste the real code into the first box: it spreads across all six and is checked at once.
  await page.getByLabel('รหัส OTP หลักที่ 1 จาก 6').focus();
  await page.evaluate((c) => {
    const dt = new DataTransfer();
    dt.setData('text', c);
    // Firefox drops clipboardData passed to the ClipboardEvent constructor, so attach it explicitly.
    const ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: dt });
    document.activeElement?.dispatchEvent(ev);
  }, code);
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/forgot-password/new-password');
  await page.getByLabel('รหัสผ่านใหม่').fill('NewPassw0rd!');
  await page.getByLabel('ยืนยันรหัสผ่าน', { exact: true }).fill('NewPassw0rd!');
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/forgot-password/success');
  await page.getByRole('link', { name: 'กลับเข้าสู่หน้าเข้าสู่ระบบ' }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/login');
  const login = new LoginPage(page);
  await login.login(member.email, 'NewPassw0rd!');
  await expect(page).toHaveURL((u) => u.pathname === '/dashboard');
  expect(csp, 'CSP violations in console').toEqual([]);
});

test('TC-AUTH-14 tampered token_hash goes to login with Thai message @security @regression', async ({ page }) => {
  await page.goto('/auth/confirm?token_hash=deadbeef&type=signup&next=/dashboard');
  await expect(page.getByRole('heading', { name: 'ยืนยันอีเมล' })).toBeVisible(); // GET alone never verifies
  await page.getByRole('button', { name: 'ยืนยันและเข้าสู่ระบบ' }).click();
  await expect(page).toHaveURL(/\/login\?error=link/);
  await expect(page.getByText('ลิงก์ใช้ไม่ได้ หากยืนยันอีเมลแล้ว')).toBeVisible();

  await page.goto('/auth/confirm?token_hash=deadbeef&type=magiclink');
  await expect(page).toHaveURL(/\/login\?error=link/);
  await page.goto('/auth/confirm');
  await expect(page).toHaveURL(/\/login\?error=link/);
});

test('TC-AUTH-17 opening the link alone does not consume the token @security @regression', async ({ page, browser }) => {
  const email = newEmail();
  const fresh = await browser.newContext();
  try {
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.signup(email, 'Passw0rd!');
    await expect(signup.successMessage()).toBeVisible();

    const link = await latestLinkFor(email);
    // Email scanner: plain GET, no JS, no form submit.
    const scan = await fresh.request.get(link);
    expect(scan.status()).toBe(200);
    expect(await scan.text()).toContain('ยืนยันและเข้าสู่ระบบ');

    const other = await fresh.newPage();
    await other.goto(link);
    await other.getByRole('button', { name: 'ยืนยันและเข้าสู่ระบบ' }).click();
    await expect(other).toHaveURL((u) => u.pathname === '/dashboard');
    await expect(other.getByRole('heading', { level: 1, name: /สวัสดี|ยินดีต้อนรับ/ })).toBeVisible();
  } finally {
    await fresh.close();
    await deleteUserByEmail(email);
  }
});

test('TC-AUTH-15 Google button hidden when not configured @regression', async ({ page }) => {
  for (const path of ['/login', '/signup']) {
    await page.goto(path);
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google' })).toHaveCount(0);
  }
});
