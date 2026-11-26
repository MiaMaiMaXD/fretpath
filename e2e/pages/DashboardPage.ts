import type { Locator, Page } from '@playwright/test';

export class DashboardPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
  }

  stat(name: 'lessons' | 'avg-score' | 'week-minutes'): Locator {
    return this.page.getByTestId(`stat-${name}`);
  }

  /** "เริ่มเรียน" / "เรียนต่อ" button in the continue card. */
  continueButton(): Locator {
    return this.page.getByTestId('dash-continue-btn');
  }
}
