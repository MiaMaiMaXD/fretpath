import { test, expect, MEMBER_STATE } from '../fixtures';
import { PathPage } from '../pages/PathPage';

test.use({ storageState: MEMBER_STATE });

const SLUGS = ['guitar-anatomy-tuning', 'first-chords', 'open-chords-changes', 'strumming-4-4', 'f-chord-first-song'];

test('TC-PATH-14 new learner sees lesson 1 unlocked and others locked @smoke @regression', async ({ page }) => {
  const path = new PathPage(page);
  await path.goto();
  await expect(page.getByTestId(/^lesson-card-/)).toHaveCount(5);
  expect(await path.lessonState(SLUGS[0])).toBe('unlocked');
  for (const s of SLUGS.slice(1)) expect(await path.lessonState(s)).toBe('locked');
  await expect(path.card(SLUGS[0]).getByText('เรียนได้')).toBeVisible();
  await expect(path.card(SLUGS[1]).getByText('ล็อก')).toBeVisible();
  await expect(path.card(SLUGS[0]).getByRole('link')).toHaveAttribute('href', `/lessons/${SLUGS[0]}`);
});

test('TC-PATH-15 locked card has no link to content @regression', async ({ page }) => {
  const path = new PathPage(page);
  await path.goto();
  await expect(path.card(SLUGS[1]).getByRole('link')).toHaveCount(0);
});

test('TC-PATH-16 locked redirect shows notice and no horizontal overflow @regression', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const path = new PathPage(page);
  await page.goto('/path?locked=first-chords');
  await expect(path.notice()).toHaveText('ต้องผ่านแบบทดสอบบท รู้จักส่วนประกอบของกีตาร์และการตั้งสาย ก่อน');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.goto('/path?locked=nope');
  await expect(path.notice()).toHaveCount(0);
});
