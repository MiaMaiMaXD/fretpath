import { test, expect } from '../fixtures';
import { AdminLessonsPage } from '../pages/admin/AdminLessonsPage';
import { LessonEditorPage } from '../pages/admin/LessonEditorPage';
import { createCompleteLesson, createCourse, deleteCourse } from '../utils/adminCourse';
import { adminClient } from '../utils/supabaseAdmin';

async function twoLessons(courseId: string) {
  const a = await createCompleteLesson(courseId, 'lesson-a', 'บทแรกเดิม', true);
  const b = await createCompleteLesson(courseId, 'lesson-b', 'บทสองเดิม', true, 2);
  return { a, b };
}

async function order(courseId: string) {
  const rows = await adminClient().from('lessons').select('id, sort_order').eq('course_id', courseId);
  return Object.fromEntries((rows.data ?? []).map((r) => [r.id, r.sort_order]));
}

test('TC-ADM-12 dragging a lesson swaps the order in one save @regression', async ({ adminPage, member }) => {
  const courseId = await createCourse();
  try {
    const { a, b } = await twoLessons(courseId);
    const enrol = await adminClient()
      .from('enrollments')
      .insert({ user_id: member.id, course_id: courseId, source: 'purchase' });
    expect(enrol.error).toBeNull();

    const list = new AdminLessonsPage(adminPage);
    await list.goto(courseId);
    await list.row('บทสองเดิม').dragTo(list.row('บทแรกเดิม'));
    await expect(list.status()).toContainText('บันทึกลำดับแล้ว');

    expect(await order(courseId)).toEqual({ [b]: 1, [a]: 2 });
    // the new first lesson is unlocked for the enrolled member
    const prog = await adminClient().from('lesson_progress').select('lesson_id').eq('user_id', member.id).eq('lesson_id', b);
    expect(prog.data).toHaveLength(1);

    await adminPage.reload();
    await expect(list.row('บทสองเดิม').locator('.no')).toHaveText('1');
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-13 an invalid order is refused and nothing moves @regression', async ({ adminDb }) => {
  const courseId = await createCourse();
  try {
    const { a, b } = await twoLessons(courseId);
    // the same lesson twice (the other missing) is not a valid order
    const res = await adminDb.rpc('reorder_lessons', { p_course: courseId, p_lesson_ids: [a, a] });
    expect(res.error?.message).toContain('INVALID_ORDER');
    expect(await order(courseId)).toEqual({ [a]: 1, [b]: 2 });
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-14 preview shows draft lesson as learners would see it @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const id = await createCompleteLesson(courseId, 'draft-prev', 'บทร่างตัวอย่าง', false);
    const html = await adminClient()
      .from('lesson_pages')
      .update({ body_md: null, body_html: '<h2>หัวข้อย่อยตัวอย่าง</h2><p>เนื้อหา <strong>ตัวหนา</strong></p>' })
      .eq('lesson_id', id)
      .eq('kind', 'text');
    expect(html.error).toBeNull();

    const edit = new LessonEditorPage(adminPage);
    await edit.goto(id);
    await adminPage.getByTestId('le-preview').click();
    await expect(adminPage.locator('.lv-badge')).toHaveText('ตัวอย่าง');
    await expect(adminPage.getByRole('heading', { level: 1, name: /บทร่างตัวอย่าง/ })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'หัวข้อย่อยตัวอย่าง' })).toBeVisible();

    // the quiz step lists the questions without marking the right answer
    await adminPage.getByRole('button', { name: 'ถัดไป' }).click();
    await expect(adminPage.getByText('ข้อทดสอบ')).toBeVisible();
    await expect(adminPage.getByText('ผิด', { exact: true })).toBeVisible();
    await expect(adminPage.getByText('ข้อที่ถูก')).toHaveCount(0);

    await adminPage.getByRole('button', { name: /กลับไปหน้าแก้ไขบทเรียน/ }).click();
    await expect(edit.status()).toBeVisible();
  } finally {
    await deleteCourse(courseId);
  }
});
