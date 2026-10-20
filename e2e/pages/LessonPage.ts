import type { Page } from '@playwright/test';

export class LessonPage {
  constructor(readonly page: Page) {}

  async goto(slug: string) {
    await this.page.goto(`/lessons/${slug}`);
  }

  async startQuiz() {
    const name = 'ทำแบบทดสอบ';
    await this.page
      .getByRole('link', { name })
      .or(this.page.getByRole('button', { name }))
      .first()
      .click();
  }
}
