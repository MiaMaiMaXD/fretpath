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

test('TC-PATH-18 locked redirect shows notice and no horizontal overflow @regression', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const path = new PathPage(page);
  await page.goto('/path?locked=first-chords');
  await expect(path.notice()).toHaveText('ต้องผ่านแบบทดสอบบท รู้จักส่วนประกอบของกีตาร์และการตั้งสาย ก่อน');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.goto('/path?locked=nope');
  await expect(path.notice()).toHaveCount(0);
});

test('TC-PATH-19 neck shows 22 frets with planned lessons as coming soon, and a fret jumps to its row @regression', async ({ page }) => {
  const path = new PathPage(page);
  await path.goto();
  const neck = page.getByTestId('fret-neck');
  await expect(neck.locator('.fret')).toHaveCount(22);
  await expect(page.getByTestId('lesson-soon')).toHaveCount(17);
  await expect(page.getByRole('heading', { name: 'ช่วงที่ 4 · ทั่วคอกีตาร์' })).toBeVisible();
  await expect(page.getByTestId('lesson-soon').first()).not.toContainText('ล็อก');
  await expect(page.getByTestId('lesson-soon').getByRole('link')).toHaveCount(0);
  await expect(path.card(SLUGS[4])).toHaveAttribute('id', 'fret-7');
  await neck.getByRole('link', { name: /^เฟรต 7:/ }).click();
  await expect(page).toHaveURL(/#fret-7$/);
  await expect(path.card(SLUGS[4])).toBeInViewport();
});
