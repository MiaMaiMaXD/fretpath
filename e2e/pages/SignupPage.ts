import type { Locator, Page } from '@playwright/test';

export class SignupPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/signup');
  }

  async signup(email: string, password: string) {
    await this.page.getByLabel('อีเมล').fill(email);
    await this.page.getByLabel('รหัสผ่าน').fill(password);
    await this.page.getByRole('button', { name: 'สมัครสมาชิก' }).click();
  }

  successMessage(): Locator {
    return this.page.getByText('เราส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว');
  }
}
