import type { Page } from '@playwright/test';

export class AdminLessonsPage {
  constructor(readonly page: Page) {}

  async goto(courseId?: string) {
    await this.page.goto(courseId ? `/admin/lessons?course=${courseId}` : '/admin/lessons');
  }

  row(title: string) {
    return this.page.getByRole('row').filter({ hasText: title });
  }
}
