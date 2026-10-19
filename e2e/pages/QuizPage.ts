import type { Page } from '@playwright/test';

export class QuizPage {
  constructor(readonly page: Page) {}

  async goto(slug: string) {
    await this.page.goto(`/lessons/${slug}/quiz`);
  }

  /** choiceIndexByQuestion[i] is the 0-based radio index to click for question "ข้อ i+1". */
  async answerAll(choiceIndexByQuestion: number[]) {
    for (const [i, choice] of choiceIndexByQuestion.entries()) {
      const group = this.page.getByRole('radiogroup', { name: `ข้อ ${i + 1}`, exact: true });
      await group.getByRole('radio').nth(choice).click();
    }
  }

  async submit() {
    await this.page.getByRole('button', { name: 'ส่งคำตอบ' }).click();
  }

  /** Reads the percentage from the score element, e.g. "80%" -> 80. */
  async score(): Promise<number> {
    const text = (await this.page.getByTestId('quiz-score').textContent()) ?? '';
    const m = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (!m) throw new Error(`Cannot parse quiz score from "${text}"`);
    return Number(m[1]);
  }
}
