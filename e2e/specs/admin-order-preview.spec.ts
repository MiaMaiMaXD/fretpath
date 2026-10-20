import { test, expect } from '../fixtures';
import { createCompleteLesson, createCourse, deleteCourse } from '../utils/adminCourse';
import { adminClient } from '../utils/supabaseAdmin';

async function twoLessons(courseId: string) {
  const a = await createCompleteLesson(courseId, 'lesson-a', 'บทแรกเดิม', true);
  const b = await createCompleteLesson(courseId, 'lesson-b', 'บทสองเดิม', true, 2);
  return { a, b };
}

test('TC-ADM-12 reorder by number swaps lessons in one save @regression', async ({ adminPage, member }) => {
  const courseId = await createCourse();
  try {
    const { a, b } = await twoLessons(courseId);
    const enrol = await adminClient()
      .from('enrollments')
      .insert({ user_id: member.id, course_id: courseId, source: 'purchase' });
    expect(enrol.error).toBeNull();

    await adminPage.goto(`/admin/lessons?course=${courseId}`);
    await adminPage.getByLabel('ลำดับของ บทแรกเดิม').fill('2');
    await adminPage.getByLabel('ลำดับของ บทสองเดิม').fill('1');
    await adminPage.getByRole('button', { name: 'บันทึกลำดับ' }).click();
    await expect(adminPage.getByRole('status')).toContainText('บันทึกลำดับแล้ว');

    const rows = await adminClient().from('lessons').select('id, sort_order').eq('course_id', courseId);
    const order = Object.fromEntries((rows.data ?? []).map((r) => [r.id, r.sort_order]));
    expect(order[b]).toBe(1);
    expect(order[a]).toBe(2);

    // Review Focus 3: the new first lesson is unlocked for the enrolled member.
    const prog = await adminClient().from('lesson_progress').select('lesson_id').eq('user_id', member.id).eq('lesson_id', b);
    expect(prog.data).toHaveLength(1);

    await adminPage.reload();
    await expect(adminPage.getByLabel('ลำดับของ บทสองเดิม')).toHaveValue('1');
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-13 non-integer order shows Thai error and keeps values @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const { a, b } = await twoLessons(courseId);
    await adminPage.goto(`/admin/lessons?course=${courseId}`);
    await adminPage.getByLabel('ลำดับของ บทแรกเดิม').fill('1.5');
    await adminPage.getByLabel('ลำดับของ บทสองเดิม').fill('0');
    await adminPage.getByRole('button', { name: 'บันทึกลำดับ' }).click();
    await expect(adminPage.getByRole('alert').filter({ hasText: 'ลำดับต้องเป็นจำนวนเต็มบวก' })).toBeVisible();
    await expect(adminPage.getByLabel('ลำดับของ บทแรกเดิม')).toHaveValue('1.5');
    await expect(adminPage.getByLabel('ลำดับของ บทสองเดิม')).toHaveValue('0');

    const rows = await adminClient().from('lessons').select('id, sort_order').eq('course_id', courseId);
    const order = Object.fromEntries((rows.data ?? []).map((r) => [r.id, r.sort_order]));
    expect(order[a]).toBe(1);
    expect(order[b]).toBe(2);
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-14 preview shows draft lesson as learners would see it @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const id = await createCompleteLesson(courseId, 'draft-prev', 'บทร่างตัวอย่าง', false);
    const md = await adminClient()
      .from('lesson_contents')
      .update({ content_md: '## หัวข้อย่อยตัวอย่าง\n\nเนื้อหา **ตัวหนา**' })
      .eq('lesson_id', id);
    expect(md.error).toBeNull();

    await adminPage.goto(`/admin/lessons/${id}`);
    await adminPage.getByRole('link', { name: 'ดูตัวอย่าง' }).click();
    await expect(adminPage).toHaveURL(new RegExp(`/admin/lessons/${id}/preview$`));
    await expect(adminPage.getByText('ตัวอย่างสำหรับผู้ดูแล — ผู้เรียนยังไม่เห็นถ้าเป็นฉบับร่าง')).toBeVisible();
    await expect(adminPage.getByRole('heading', { level: 1, name: 'บทร่างตัวอย่าง' })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'หัวข้อย่อยตัวอย่าง' })).toBeVisible();
    await expect(adminPage.getByText('ข้อทดสอบ')).toBeVisible();
    await expect(adminPage.getByText('ผิด', { exact: true })).toBeVisible();
    await expect(adminPage.getByText('ข้อที่ถูก')).toHaveCount(0);
  } finally {
    await deleteCourse(courseId);
  }
});
