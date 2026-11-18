import { randomUUID } from 'node:crypto';
import { test, expect, watchCsp } from '../fixtures';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { latestOtpFor, mailCountFor } from '../utils/mailpit';
import { deleteUserByEmail } from '../utils/supabaseAdmin';

const newEmail = () => `qa+${randomUUID()}@fretpath.test`;

test('TC-AUTH-11 signup code: a wrong code is rejected, retyping the right code over it confirms, no CSP errors @smoke @regression', async ({ page }) => {
  const email = newEmail();
  const csp = watchCsp(page.context());
  try {
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.signup(email, 'Passw0rd!');
    const code = await latestOtpFor(email);

    await page.getByLabel('รหัส OTP หลักที่ 1 จาก 6').focus();
    // Wrong only in the last digit, so typing the real code afterwards re-types the same digit into five boxes.
    await page.keyboard.type(code.slice(0, 5) + ((Number(code[5]) + 1) % 10));
    await page.getByRole('button', { name: 'ถัดไป' }).click();
    await expect(page.getByText('รหัส OTP ไม่ถูกต้อง')).toBeVisible();
    await expect(page).toHaveURL((u) => u.pathname === '/signup/verify');

    await signup.confirmWithCode(email);
    expect(csp, 'CSP violations in console').toEqual([]);
  } finally {
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

test('TC-AUTH-17 signing up with an existing account looks like a new signup and sends no email @security @regression', async ({ page, member }) => {
  const before = await mailCountFor(member.email);
  const signup = new SignupPage(page);
  await signup.goto();
  await signup.signup(member.email, 'Passw0rd!');
  // Same code page as a brand-new address: nothing says the account exists.
  await expect(page.getByRole('heading', { name: 'กรอกรหัส OTP' })).toBeVisible();
  await expect(page.getByText(/มีอีเมลนี้อยู่แล้ว|already/i)).toHaveCount(0);
  // Give the mail server time to deliver anything, then check nothing was sent.
  await page.waitForTimeout(2000);
  expect(await mailCountFor(member.email)).toBe(before);
});

test('TC-AUTH-15 Google button hidden when not configured @regression', async ({ page }) => {
  for (const path of ['/login', '/signup']) {
    await page.goto(path);
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบด้วย Google' })).toHaveCount(0);
  }
});
