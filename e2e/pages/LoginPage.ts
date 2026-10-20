import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(readonly page: Page) {}

  async goto(next?: string) {
    await this.page.goto(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  }

  async login(email: string, password: string) {
    await this.page.getByLabel('อีเมล').fill(email);
    await this.page.getByLabel('รหัสผ่าน', { exact: true }).fill(password);
    await this.page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  }
}
