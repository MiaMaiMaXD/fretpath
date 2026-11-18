import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { latestLinkFor, latestOtpFor } from '../utils/mailpit';
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
    await expect(page.getByRole('heading', { level: 1, name: /สวัสดี|ยินดีต้อนรับ/ })).toBeVisible();

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

test('TC-AUTH-23 login flags a malformed email when submitted, not while typing @regression', async ({ page }) => {
  await page.goto('/login');
  const submit = page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true });
  await expect(submit).toBeDisabled();
  await page.getByLabel('อีเมล').fill('FretPath67gmail.com');
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('Passw0rd!');
  await expect(page.getByText('อีเมลไม่ถูกต้อง', { exact: true })).toBeHidden();
  await submit.click();
  await expect(page.getByText('อีเมลไม่ถูกต้อง', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('อีเมล')).toHaveAttribute('aria-invalid', 'true');
  await expect(submit).toBeDisabled();

  await page.getByLabel('อีเมล').fill('fretpath67@gmail.com');
  await expect(page.getByText('อีเมลไม่ถูกต้อง', { exact: true })).toBeHidden();
  await expect(submit).toBeEnabled();
});

test('TC-AUTH-24 rejected login shows the message under the password and blocks resubmitting the same values @regression', async ({ page, member }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(member.email, 'wrongpass1');
  const password = page.getByLabel('รหัสผ่าน', { exact: true });
  const message = page.getByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  await expect(message).toBeVisible();
  await expect(password).toHaveAccessibleDescription('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  const submit = page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true });
  await expect(submit).toBeDisabled();

  await password.fill(member.password);
  await expect(message).toBeHidden();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('TC-AUTH-25 lock button shows and hides the password @regression', async ({ page }) => {
  await page.goto('/login');
  const password = page.getByLabel('รหัสผ่าน', { exact: true });
  const toggle = page.getByRole('button', { name: 'แสดงรหัสผ่าน' });
  await password.fill('f1p9r2A7');
  await expect(password).toHaveAttribute('type', 'password');
  await toggle.click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(password).toHaveValue('f1p9r2A7');
  await toggle.click();
  await expect(password).toHaveAttribute('type', 'password');
});

test('TC-AUTH-26 forgot password flags a malformed email when "ถัดไป" is pressed @regression', async ({ page }) => {
  await page.goto('/forgot-password');
  const next = page.getByRole('button', { name: 'ถัดไป' });
  const error = page.getByText('อีเมลไม่ถูกต้อง', { exact: true });
  await expect(next).toBeDisabled();
  await page.getByLabel('อีเมล').fill('FretPath67gmail.com');
  await expect(error).toBeHidden();
  await next.click();
  await expect(error).toBeVisible();
  await expect(page.getByLabel('อีเมล')).toHaveAttribute('aria-invalid', 'true');
  await expect(next).toBeDisabled();
  await expect(page.getByText('ถ้ามีบัญชีนี้ เราได้ส่งลิงก์ไปแล้ว')).toBeHidden();

  await page.getByLabel('อีเมล').fill('fretpath67@example.com');
  await expect(error).toBeHidden();
  await expect(next).toBeEnabled();
});

test('TC-AUTH-29 new password is checked while typing: spaces, length, character mix and confirmation @regression', async ({ page, member }) => {
  // Get a recovery session through the OTP flow.
  await page.goto('/forgot-password');
  await page.getByLabel('อีเมล').fill(member.email);
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/forgot-password/verify');
  await page.keyboard.type(await latestOtpFor(member.email));
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/forgot-password/new-password');
  await expect(page.getByRole('heading', { name: 'กรอกรหัสผ่านใหม่' })).toBeVisible();

  const password = page.getByLabel('รหัสผ่านใหม่');
  const confirm = page.getByLabel('ยืนยันรหัสผ่าน', { exact: true });
  const next = page.getByRole('button', { name: 'ยืนยัน', exact: true });
  const msg = (t: string) => page.getByText(t, { exact: true });
  await expect(next).toBeDisabled();

  // Case 5: confirmation first, password still empty.
  await confirm.fill('f7');
  await expect(msg('กรุณากรอกรหัสผ่าน')).toBeVisible();
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(msg('รหัสผ่านไม่ตรงกัน')).toBeVisible();
  await confirm.fill('');

  // Cases 1–3, in order of priority.
  await password.fill('f1p 9');
  await expect(msg('รหัสผ่านห้ามมีช่องว่าง')).toBeVisible();
  await password.fill('f1p9r2');
  await expect(msg('รหัสผ่านควรมีอย่างน้อย 8 ตัว')).toBeVisible();
  await password.fill('f1p9r2a64');
  await expect(msg('รหัสผ่านควรมีตัวอักษรพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลข')).toBeVisible();
  await expect(next).toBeDisabled();

  // Case 6: valid password, confirmation empty — no warning yet, still disabled.
  await password.fill('f1p9r2A64');
  await expect(password).not.toHaveAttribute('aria-invalid', 'true');
  await expect(msg('รหัสผ่านไม่ตรงกัน')).toBeHidden();
  await expect(next).toBeDisabled();

  // Case 4: mismatch while typing, then fixed.
  await confirm.fill('f2');
  await expect(msg('รหัสผ่านไม่ตรงกัน')).toBeVisible();
  await confirm.fill('f1p9r2A64');
  await expect(msg('รหัสผ่านไม่ตรงกัน')).toBeHidden();
  await expect(next).toBeEnabled();

  // Show/hide on each field.
  await page.getByRole('button', { name: 'แสดงยืนยันรหัสผ่าน' }).click();
  await expect(confirm).toHaveAttribute('type', 'text');
  await expect(password).toHaveAttribute('type', 'password');

  await next.click();
  await expect(page).toHaveURL((u) => u.pathname === '/forgot-password/success');
});

test('TC-AUTH-05 logout returns to home and protects pages @regression', async ({ memberPage }) => {
  await memberPage.getByTestId('user-menu').locator('summary').click();
  await memberPage.getByRole('button', { name: 'ออกจากระบบ' }).click();
  await expect(memberPage).toHaveURL(/\/$/);
  await memberPage.goto('/dashboard');
  await expect(memberPage).toHaveURL(/\/login\?next=%2Fdashboard$/);
});

test('TC-AUTH-06 forgot password goes to the OTP page for any address and the emailed code resets the password @regression', async ({ page, member }) => {
  const ask = async (email: string) => {
    await page.goto('/forgot-password');
    await page.getByLabel('อีเมล').fill(email);
    await page.getByRole('button', { name: 'ถัดไป' }).click();
    await expect(page).toHaveURL((u) => u.pathname === '/forgot-password/verify');
    await expect(page.getByRole('heading', { name: 'กรอกรหัส OTP' })).toBeVisible();
  };
  // An unknown address looks exactly the same (no account enumeration).
  await ask(newEmail());
  await ask(member.email);

  const code = await latestOtpFor(member.email);
  await expect(page.getByLabel('รหัส OTP หลักที่ 1 จาก 6')).toBeFocused();
  await page.keyboard.type(code);
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/forgot-password/new-password');
  await page.getByLabel('รหัสผ่านใหม่').fill('NewPassw0rd!');
  await page.getByLabel('ยืนยันรหัสผ่าน', { exact: true }).fill('NewPassw0rd!');
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/forgot-password/success');
  await expect(page.getByRole('heading', { name: 'เปลี่ยนรหัสผ่านสำเร็จ' })).toBeVisible();
  await page.getByRole('link', { name: 'กลับเข้าสู่หน้าเข้าสู่ระบบ' }).click();
  // Signed out on success, so /login opens instead of bouncing to the dashboard.
  await expect(page).toHaveURL((u) => u.pathname === '/login');
  const login = new LoginPage(page);
  await login.login(member.email, 'NewPassw0rd!');
  await expect(page).toHaveURL((u) => u.pathname === '/dashboard');
});

test('TC-AUTH-27 OTP page: incomplete code is not checked; a wrong code is flagged until edited @regression', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('อีเมล').fill(newEmail());
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/forgot-password/verify');

  const box = (n: number) => page.getByLabel(`รหัส OTP หลักที่ ${n} จาก 6`);
  const next = page.getByRole('button', { name: 'ถัดไป' });
  const wrong = page.getByText('รหัส OTP ไม่ถูกต้อง');
  await expect(box(1)).toBeFocused();
  await expect(page.getByText(/หมดอายุภายใน \([23]:\d\d\)/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'ส่งอีกครั้ง' })).toBeDisabled();

  // Case 1: five digits — focus moves box by box, nothing is checked, the button stays disabled.
  await page.keyboard.type('68154');
  await expect(box(6)).toBeFocused();
  await expect(next).toBeDisabled();
  await expect(wrong).toBeHidden();
  await page.keyboard.press('Backspace');
  await expect(box(5)).toBeFocused();
  await expect(box(5)).toHaveValue('');
  await page.keyboard.type('4');

  // Case 2: six digits are not checked until "ถัดไป" is pressed.
  await page.keyboard.type('3');
  await expect(wrong).toBeHidden();
  await expect(next).toBeEnabled();
  await next.click();
  await expect(wrong).toBeVisible();
  for (let n = 1; n <= 6; n++) await expect(box(n)).toHaveAttribute('aria-invalid', 'true');
  await expect(next).toBeDisabled();

  // Editing any digit clears the error so the user can try again at once.
  await box(6).fill('2');
  await expect(wrong).toBeHidden();
});

test('TC-AUTH-28 OTP expires after 3 minutes, can be resent, and the page needs a requested code @regression', async ({ page, context }) => {
  await page.goto('/forgot-password/verify');
  await expect(page).toHaveURL((u) => u.pathname === '/forgot-password');

  await page.getByLabel('อีเมล').fill(newEmail());
  await page.getByRole('button', { name: 'ถัดไป' }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/forgot-password/verify');

  // Pretend the code was sent 181 s ago.
  const cookie = (await context.cookies()).find((c) => c.name === 'fp_reset_otp');
  expect(cookie).toBeDefined();
  const value = JSON.parse(decodeURIComponent(cookie!.value)) as { email: string; sentAt: number };
  await context.addCookies([{ ...cookie!, value: encodeURIComponent(JSON.stringify({ ...value, sentAt: Date.now() - 181_000 })) }]);
  await page.reload();
  await expect(page.getByText('หมดอายุภายใน (0:00)')).toBeVisible();
  await expect(page.getByText('รหัส OTP หมดอายุ กรุณากดส่งอีกครั้ง')).toBeVisible();
  await page.keyboard.type('123456');
  await expect(page.getByRole('button', { name: 'ถัดไป' })).toBeDisabled();

  const resend = page.getByRole('button', { name: 'ส่งอีกครั้ง' });
  await expect(resend).toBeEnabled();
  await resend.click();
  await expect(page.getByText('ส่งรหัสใหม่แล้ว')).toBeVisible();
  await expect(page.getByText(/หมดอายุภายใน \((3:00|2:5\d)\)/)).toBeVisible();
  await expect(resend).toBeDisabled();
  await expect(page.getByText('รหัส OTP หมดอายุ กรุณากดส่งอีกครั้ง')).toBeHidden();
  await expect(page.getByLabel('รหัส OTP หลักที่ 1 จาก 6')).toHaveValue('');
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
