import { test, expect, MEMBER_STATE } from '../fixtures';
import { buildAnswers, lessonIdBySlug } from '../utils/quiz';
import { LessonPage } from '../pages/LessonPage';

const STRING_NAMES = ['สาย 6 (E)', 'สาย 5 (A)', 'สาย 4 (D)', 'สาย 3 (G)', 'สาย 2 (B)', 'สาย 1 (E)'];

test.describe('shared member', () => {
  test.use({ storageState: MEMBER_STATE });

  test('TC-LSN-04 six open-string buttons are present and clickable @regression', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    await new LessonPage(page).goto('guitar-anatomy-tuning');
    for (const name of STRING_NAMES) {
      const btn = page.getByRole('button', { name });
      await expect(btn).toBeEnabled();
      await btn.click();
    }
    expect(errors).toEqual([]);
  });

  test('TC-LSN-05 audio unsupported shows disabled state without crashing @regression', async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as any).AudioContext; // eslint-disable-line @typescript-eslint/no-explicit-any
      delete (window as any).webkitAudioContext; // eslint-disable-line @typescript-eslint/no-explicit-any
    });
    await new LessonPage(page).goto('guitar-anatomy-tuning');
    await expect(page.getByText('เบราว์เซอร์นี้ไม่รองรับเสียง').first()).toBeVisible();
    for (const name of STRING_NAMES) await expect(page.getByRole('button', { name })).toBeDisabled();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ทำแบบทดสอบ' })).toBeVisible();
  });
});

test('TC-LSN-06 chord lab shows fingering diagram for chosen chord @regression', async ({
  memberPage,
  memberDb,
  adminDb,
}) => {
  const l1 = await lessonIdBySlug(adminDb, 'guitar-anatomy-tuning');
  const res = await memberDb.rpc('submit_quiz', {
    p_lesson_id: l1,
    p_answers: await buildAnswers(adminDb, l1, 5),
  });
  expect(res.error).toBeNull();
  await new LessonPage(memberPage).goto('first-chords');
  await memberPage.getByRole('button', { name: 'Am', exact: true }).click();
  await expect(memberPage.getByRole('img', { name: 'คอร์ด Am' })).toBeVisible();
  await expect(memberPage.getByRole('button', { name: 'ฟังเสียง' })).toBeVisible();
});
