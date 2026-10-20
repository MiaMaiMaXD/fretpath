import type { Page } from '@playwright/test';

export class ProfilePage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/profile');
  }

  async save(v: { displayName: string; weeklyGoalMinutes: number }) {
    await this.page.getByLabel('ชื่อที่แสดง').fill(v.displayName);
    await this.page.getByLabel('เป้าหมายนาทีฝึกต่อสัปดาห์').fill(String(v.weeklyGoalMinutes));
    await this.page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  }
}
