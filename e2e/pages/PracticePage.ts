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
    if (v.date !== undefined) await form.getByLabel('วันที่ฝึกซ้อม').fill(v.date);
    if (v.topic !== undefined) await form.getByLabel('วันนี้ฝึกอะไรไปบ้าง?').fill(v.topic);
    await form.getByLabel('เวลาที่ฝึก (นาที)').fill(String(v.minutes));
    if (v.feeling !== undefined) await form.getByLabel('ความรู้สึกหลังซ้อม').selectOption(v.feeling);
    await form.getByLabel('หมวดที่ฝึก').selectOption(v.activity);
    if (v.note !== undefined) await form.getByLabel('บันทึกช่วยจำ').fill(v.note);
  }

  /** The daily log form (the edit forms inside history cards are separate). */
  form(): Locator {
    return this.page.getByRole('region', { name: 'บันทึกการฝึกซ้อมประจำวัน' });
  }

  minutesInput(): Locator {
    return this.form().getByLabel('เวลาที่ฝึก (นาที)');
  }

  async save() {
    await this.page.getByRole('button', { name: '+ บันทึกข้อมูลการซ้อม', exact: true }).click();
  }

  history(): Locator {
    return this.page.getByRole('region', { name: 'สมุดประวัติการฝึกซ้อมทั้งหมด' });
  }

  rows(): Locator {
    return this.history().getByRole('listitem');
  }
}
