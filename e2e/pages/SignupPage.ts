import { expect, type Page } from '@playwright/test';
import { latestOtpFor } from '../utils/mailpit';

export class SignupPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/signup');
  }

  /** Fills the form (confirmation = password unless given) and presses "สมัครสมาชิก"; lands on the code page. */
  async signup(email: string, password: string, confirm = password) {
    await this.page.getByLabel('อีเมล').fill(email);
    await this.page.getByLabel('รหัสผ่าน', { exact: true }).fill(password);
    await this.page.getByLabel('ยืนยันรหัสผ่าน', { exact: true }).fill(confirm);
    await this.page.getByRole('button', { name: 'สมัครสมาชิก', exact: true }).click();
    await expect(this.page).toHaveURL((u) => u.pathname === '/signup/verify');
  }

  /** On the code page: types the emailed 6-digit code, presses "ถัดไป" and waits for the success page. */
  async confirmWithCode(email: string) {
    const code = await latestOtpFor(email);
    await this.page.getByLabel('รหัส OTP หลักที่ 1 จาก 6').focus();
    await this.page.keyboard.type(code);
    await this.page.getByRole('button', { name: 'ถัดไป' }).click();
    await expect(this.page).toHaveURL((u) => u.pathname === '/signup/success');
  }
}
