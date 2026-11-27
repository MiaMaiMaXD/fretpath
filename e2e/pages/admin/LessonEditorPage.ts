import { expect, type Page } from '@playwright/test';

/** The 2026-11 lesson editor at /admin/lessons/[id] (pages sidebar, info panel, quiz page). */
export class LessonEditorPage {
  constructor(readonly page: Page) {}

  async goto(lessonId: string) {
    await this.page.goto(`/admin/lessons/${lessonId}`);
    await expect(this.status()).toBeVisible();
  }

  /** The status button: แบบร่าง (draft) / เผยแพร่ (published) / อัปเดต (published with changes). */
  status() {
    return this.page.getByTestId('le-status');
  }

  saveButton() {
    return this.page.getByTestId('le-save');
  }

  /** Message line under the header (success or the list of problems). */
  message() {
    return this.page.locator('.le-msg');
  }

  async openPage(title: string | RegExp) {
    await this.page.locator('.le-page').filter({ hasText: title }).getByRole('button').click();
  }

  async openQuiz() {
    await this.page.locator('.le-page').filter({ has: this.page.locator('.kind.quiz') }).getByRole('button').click();
    await expect(this.page.getByText('ชื่อหน้าแบบทดสอบ')).toBeVisible();
  }

  questions() {
    return this.page.getByTestId('qz-question');
  }

  /** Adds a multiple-choice question (4 choices) and marks `correct` (0-based) as the right one. */
  async addChoiceQuestion(prompt: string, choices: [string, string, string, string], correct: number) {
    await this.page.getByRole('button', { name: '+ เพิ่มปรนัย' }).click();
    const q = this.questions().last();
    await q.getByPlaceholder('กรอกคำถาม').fill(prompt);
    for (const [i, c] of choices.entries()) await q.getByLabel(`ตัวเลือกที่ ${i + 1}`, { exact: true }).fill(c);
    await q.getByRole('button', { name: `ตั้งตัวเลือกที่ ${correct + 1} เป็นข้อที่ถูก` }).click();
  }

  async saveDraft() {
    await this.saveButton().click();
    await expect(this.message()).toContainText('บันทึก');
  }

  /** Confirm dialog (delete / publish / unpublish). */
  dialog() {
    return this.page.locator('dialog.fp-confirm[open]');
  }
}
