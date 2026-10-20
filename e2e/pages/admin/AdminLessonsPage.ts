import type { Page } from '@playwright/test';

export class AdminLessonsPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/admin/lessons');
  }
}
