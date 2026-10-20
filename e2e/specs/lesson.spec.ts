import { test, expect, MEMBER_STATE } from '../fixtures';
import { LessonPage } from '../pages/LessonPage';

test.use({ storageState: MEMBER_STATE });

test('TC-LSN-01 unlocked lesson renders markdown headings without HTML comments @regression', async ({ page }) => {
  const lesson = new LessonPage(page);
  await lesson.goto('guitar-anatomy-tuning');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('article').getByRole('heading', { level: 2 }).first()).toBeVisible();
  await expect(page.getByText('TODO')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'ทำแบบทดสอบ' })).toHaveAttribute(
    'href',
    '/lessons/guitar-anatomy-tuning/quiz',
  );
});

test('TC-LSN-02 lesson without video shows no broken frame @regression', async ({ page }) => {
  const lesson = new LessonPage(page);
  await lesson.goto('guitar-anatomy-tuning');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('TC-PATH-16 opening a locked lesson redirects with Thai notice @smoke @regression', async ({ page }) => {
  await page.goto('/lessons/first-chords');
  await expect(page).toHaveURL(/\/path\?locked=first-chords$/);
  await expect(page.getByRole('alert').and(page.locator(':not(#__next-route-announcer__)'))).toHaveText(
    'ต้องผ่านแบบทดสอบบท รู้จักส่วนประกอบของกีตาร์และการตั้งสาย ก่อน',
  );
});

test('TC-LSN-03 unknown slug shows Thai not-found page @regression', async ({ page }) => {
  await page.goto('/lessons/nope');
  await expect(page.getByText('ไม่พบหน้าที่คุณต้องการ')).toBeVisible();
});
