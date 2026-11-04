import type { Locator, Page } from '@playwright/test';

export class PracticePage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/practice');
  }

  /** Full history: search, edit and delete live here. */
  async gotoHistory() {
    await this.page.goto('/practice/history');
  }

  /**
   * `activity` is the option value: tuning | chords | strumming | song | other.
   * `feeling` is the option value: great | progress | sore | tough.
   */
  async fill(v: { date?: string; minutes: number; activity: string; topic?: string; feeling?: string; note?: string }) {
    const form = this.form();
    if (v.date !== undefined) await form.getByLabel('วันที่ซ้อม').fill(v.date);
    if (v.topic !== undefined) await form.getByLabel('วันนี้ฝึกอะไร').fill(v.topic);
    await form.getByLabel('ซ้อมไปกี่นาที').fill(String(v.minutes));
    if (v.feeling !== undefined) await form.locator(`input[name="feeling"][value="${v.feeling}"]`).check();
    await form.locator(`input[name="activity"][value="${v.activity}"]`).check();
    if (v.note !== undefined) await form.getByLabel('โน้ตถึงตัวเอง').fill(v.note);
  }

  /** The log sheet on /practice (the edit forms on the history page are separate). */
  form(): Locator {
    return this.page.getByRole('region', { name: 'จดบันทึกรอบนี้' });
  }

  minutesInput(): Locator {
    return this.form().getByLabel('ซ้อมไปกี่นาที');
  }

  async save() {
    await this.page.getByRole('button', { name: 'บันทึกการซ้อม', exact: true }).click();
  }

  /** The five latest sessions beside the sheet on /practice. */
  rows(): Locator {
    return this.page.getByRole('complementary', { name: 'ซ้อมล่าสุด' }).getByRole('listitem');
  }

  /** The notebook on /practice/history. */
  history(): Locator {
    return this.page.getByRole('region', { name: 'บันทึกทั้งหมด' });
  }

  historyRows(): Locator {
    return this.history().getByRole('listitem');
  }
}
