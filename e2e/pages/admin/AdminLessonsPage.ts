import type { Page } from '@playwright/test';

/** The 2026-11 lesson list (/admin/lessons): sections with their lessons. */
export class AdminLessonsPage {
  constructor(readonly page: Page) {}

  async goto(courseId?: string) {
    await this.page.goto(courseId ? `/admin/lessons?course=${courseId}` : '/admin/lessons');
  }

  sections() {
    return this.page.getByTestId('lm-section');
  }

  /** A lesson row by (part of) its title. */
  row(title: string) {
    return this.page.getByTestId('lm-lesson').filter({ hasText: title });
  }

  /** Opens a lesson row's ⋯ menu and picks แก้ไข or ลบ. */
  async lessonMenu(title: string, item: 'แก้ไข' | 'ลบ') {
    const row = this.row(title);
    await row.locator('summary').click();
    await row.getByRole(item === 'ลบ' ? 'button' : 'link', { name: item }).click();
  }

  dialog() {
    return this.page.locator('dialog.fp-confirm[open]');
  }

  /** Status line above the sections. */
  status() {
    return this.page.locator('.status-msg');
  }
}
