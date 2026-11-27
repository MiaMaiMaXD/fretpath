import type { Page } from '@playwright/test';

export class LessonPage {
  constructor(readonly page: Page) {}

  async goto(slug: string) {
    await this.page.goto(`/lessons/${slug}`);
  }

  /** Pages through the lesson (ถัดไป) to the quiz intro. */
  async toQuizIntro() {
    const start = this.page.getByTestId('quiz-start');
    while (!(await start.isVisible())) await this.page.getByRole('button', { name: 'ถัดไป' }).click();
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
