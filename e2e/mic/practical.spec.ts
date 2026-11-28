import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';
import { LoginPage } from '../pages/LoginPage';
import { createCompleteLesson, createCourse, deleteCourse } from '../utils/adminCourse';
import { adminClient } from '../utils/supabaseAdmin';

// Runs in the `mic` project: Chrome's microphone plays e2e/utils/fakeMic.ts D_CHORD_WITH_MISTAKE
// (D chord, string 2 first one fret too high, then right), as in the instructor's browser tests.

test('TC-QZ-30 practical question: wrong string is named, chord passes, then the quiz can be sent @regression', async ({
  page,
  member,
}) => {
  test.setTimeout(90_000);
  const db = adminClient();
  const courseId = await createCourse();
  try {
    const slug = `qa-${randomUUID().slice(0, 8)}`;
    const lessonId = await createCompleteLesson(courseId, slug, 'บทดีดคอร์ด D', true);
    const pq = await db
      .from('quiz_questions')
      .insert({ lesson_id: lessonId, prompt: 'ดีดคอร์ด D', kind: 'practical', practical_chords: ['D'], sort_order: 2 })
      .select('id')
      .single();
    if (pq.error) throw new Error(pq.error.message);
    // this member learns only the test course
    await db.from('enrollments').delete().eq('user_id', member.id);
    const en = await db.from('enrollments').insert({ user_id: member.id, course_id: courseId });
    if (en.error) throw new Error(en.error.message);
    const pr = await db.from('lesson_progress').upsert({ user_id: member.id, lesson_id: lessonId, status: 'unlocked' });
    if (pr.error) throw new Error(pr.error.message);

    const login = new LoginPage(page);
    await login.goto();
    await login.login(member.email, member.password);
    await page.waitForURL(/\/dashboard/);

    await page.goto(`/lessons/${slug}/quiz`);
    await page.getByRole('radiogroup', { name: 'ข้อ 1', exact: true }).getByRole('radio', { name: 'ถูก' }).check();

    // sending before the chord has passed is refused, and nothing is saved
    await page.getByRole('button', { name: 'ส่งคำตอบ' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'ต้องดีดข้อปฏิบัติให้ผ่านก่อนส่งคำตอบ' })).toBeVisible();

    await page.getByTestId('pc-start').click();
    await expect(page.getByTestId('pc-string-6')).toHaveAttribute('data-state', 'muted');
    // D#4 on string 2 is caught and named
    await expect(page.getByTestId('pc-string-2')).toHaveAttribute('data-state', 'bad', { timeout: 20_000 });
    await expect(page.getByTestId('pc-msg')).toContainText('สาย 2: ได้ยินเสียง D#4 แต่ควรเป็น D4');
    // then D4 and F#4 complete the chord
    await expect(page.getByTestId('pc-msg')).toHaveText('ถูกต้อง! คอร์ด D ผ่านครบทุกสาย', { timeout: 20_000 });
    for (const s of [4, 3, 2, 1]) await expect(page.getByTestId(`pc-string-${s}`)).toHaveAttribute('data-state', 'ok');
    await page.getByTestId('pc-next').click();
    await expect(page.getByTestId('practical-passed')).toBeVisible();

    await page.getByRole('button', { name: 'ส่งคำตอบ' }).click();
    await expect(page.getByTestId('quiz-score')).toHaveText('100%');
    const attempts = await db.from('quiz_attempts').select('id').eq('user_id', member.id).eq('lesson_id', lessonId);
    expect(attempts.data).toHaveLength(1);
  } finally {
    await deleteCourse(courseId);
  }
});
