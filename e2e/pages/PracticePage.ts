import type { Locator, Page } from '@playwright/test';

export class PracticePage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/practice');
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

  /** The daily log form (the edit forms inside history cards are separate). */
  form(): Locator {
    return this.page.getByRole('region', { name: 'จดบันทึกการซ้อม' });
  }

  minutesInput(): Locator {
    return this.form().getByLabel('ซ้อมไปกี่นาที');
  }

  async save() {
    await this.page.getByRole('button', { name: 'บันทึกการซ้อม', exact: true }).click();
  }

  history(): Locator {
    return this.page.getByRole('region', { name: 'ประวัติการซ้อม' });
  }

  rows(): Locator {
    return this.history().getByRole('listitem');
  }
}
