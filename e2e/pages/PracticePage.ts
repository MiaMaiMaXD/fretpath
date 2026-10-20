import type { Locator, Page } from '@playwright/test';

export class PracticePage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/practice');
  }

  /** `activity` is the option value: tuning | chords | strumming | song | other. */
  async fill(v: { date?: string; minutes: number; activity: string; note?: string }) {
    if (v.date !== undefined) await this.page.getByLabel('วันที่').fill(v.date);
    await this.page.getByLabel('จำนวนนาที').fill(String(v.minutes));
    await this.page.getByLabel('หัวข้อที่ฝึก').selectOption(v.activity);
    if (v.note !== undefined) await this.page.getByLabel('บันทึกสั้น').fill(v.note);
  }

  async save() {
    await this.page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  }

  rows(): Locator {
    return this.page.getByRole('listitem');
  }
}
