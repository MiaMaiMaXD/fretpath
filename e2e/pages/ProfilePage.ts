import { expect, type Page } from '@playwright/test';

export class ProfilePage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/profile');
  }

  name() {
    return this.page.getByTestId('profile-name');
  }
  nameInput() {
    return this.page.getByLabel('ชื่อที่แสดง', { exact: true });
  }
  goalInput() {
    return this.page.getByRole('textbox', { name: 'เป้าหมายการฝึกต่อสัปดาห์' });
  }
  goalSave() {
    return this.page.getByRole('button', { name: 'บันทึกเป้าหมาย' });
  }
  toast() {
    return this.page.getByTestId('profile-toast');
  }

  async saveName(displayName: string) {
    await this.page.getByRole('button', { name: 'แก้ชื่อที่แสดง' }).click();
    await this.nameInput().fill(displayName);
    await this.page.getByRole('button', { name: 'บันทึกชื่อ' }).click();
  }

  async saveGoal(minutes: number) {
    await this.goalInput().fill(String(minutes));
    await this.goalSave().click();
  }

  /** Set both fields (each section saves on its own); waits for each save to land. */
  async save(v: { displayName: string; weeklyGoalMinutes: number }) {
    if ((await this.name().textContent())?.trim() !== v.displayName) {
      await this.saveName(v.displayName);
      await expect(this.toast()).toHaveText(/บันทึกชื่อแล้ว/);
    }
    if ((await this.goalInput().inputValue()) !== String(v.weeklyGoalMinutes)) {
      await this.saveGoal(v.weeklyGoalMinutes);
      await expect(this.toast()).toHaveText(/บันทึกเป้าหมายแล้ว/);
    }
  }
}
