import type { Locator, Page } from '@playwright/test';

export type LessonState = 'locked' | 'unlocked' | 'completed';

export class PathPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/path');
  }

  card(slug: string): Locator {
    return this.page.getByTestId(`lesson-card-${slug}`);
  }

  async lessonState(slug: string): Promise<LessonState> {
    const state = await this.card(slug).getAttribute('data-state');
    if (state !== 'locked' && state !== 'unlocked' && state !== 'completed') {
      throw new Error(`Unexpected data-state "${state}" for lesson ${slug}`);
    }
    return state;
  }

  notice(): Locator {
    return this.page.getByRole('alert');
  }
}
