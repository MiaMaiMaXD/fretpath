import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';
import { AdminLessonsPage } from '../pages/admin/AdminLessonsPage';
import { LessonEditorPage } from '../pages/admin/LessonEditorPage';
import { buildAnswers } from '../utils/quiz';
import { createCompleteLesson, createCourse, deleteCourse } from '../utils/adminCourse';
import { adminClient } from '../utils/supabaseAdmin';

test('TC-ADM-04 create lesson starts as draft and members cannot see it @smoke', async ({
  adminPage,
  member,
  memberDb,
}) => {
  const courseId = await createCourse();
  try {
    // The member IS enrolled and can see a published control lesson, so an empty result for the
    // draft proves the draft is hidden (not merely that the member has no access to the course).
    const enrol = await adminClient()
      .from('enrollments')
      .insert({ user_id: member.id, course_id: courseId, source: 'purchase' });
    expect(enrol.error).toBeNull();
    const controlSlug = `control-${randomUUID().slice(0, 8)}`;
    await createCompleteLesson(courseId, controlSlug, 'บทควบคุม', true);

    // "+ เพิ่มบทเรียน" in the section adds a draft "บทเรียนใหม่!" there
    const list = new AdminLessonsPage(adminPage);
    await list.goto(courseId);
    await list.sections().first().getByRole('button', { name: 'เพิ่มบทเรียน' }).click();
    const row = list.row('บทเรียนใหม่!');
    await expect(row).toBeVisible();
    await expect(row.locator('.dot.draft')).toBeVisible();
    await expect(row).toContainText('แบบร่าง');

    const created = await adminClient().from('lessons').select('slug, status').eq('course_id', courseId).eq('title', 'บทเรียนใหม่!').single();
    expect(created.data?.status).toBe('draft');

    const control = await memberDb.from('lessons').select('slug').eq('course_id', courseId).eq('slug', controlSlug);
    expect(control.error).toBeNull();
    expect(control.data).toEqual([{ slug: controlSlug }]);
    const seen = await memberDb.from('lessons').select('id').eq('course_id', courseId).eq('slug', created.data!.slug);
    expect(seen.error).toBeNull();
    expect(seen.data).toEqual([]);
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-05 publishing an incomplete lesson lists what is missing @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const l = await adminClient()
      .from('lessons')
      .insert({ course_id: courseId, slug: `qa-${randomUUID().slice(0, 8)}`, title: 'บทว่าง', sort_order: 1 })
      .select('id')
      .single();
    expect(l.error).toBeNull();
    const c = await adminClient().from('lesson_contents').insert({ lesson_id: l.data!.id, content_md: 'x' });
    expect(c.error).toBeNull();

    const edit = new LessonEditorPage(adminPage);
    await edit.goto(l.data!.id);
    await expect(edit.status()).toHaveText('แบบร่าง');
    await edit.status().click();
    await edit.dialog().getByRole('button', { name: 'ตกลง' }).click();
    await expect(edit.message()).toContainText('เผยแพร่ไม่ได้');
    await expect(edit.message()).toContainText('ยังไม่มีคำถามปรนัย');
    await expect(edit.status()).toHaveText('แบบร่าง');
    const row = await adminClient().from('lessons').select('status').eq('id', l.data!.id).single();
    expect(row.data?.status).toBe('draft');
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-06 lesson with learners cannot be deleted @regression', async ({ adminPage, member, memberDb, adminDb }) => {
  const courseId = await createCourse();
  try {
    const db = adminClient();
    const enrol = await db.from('enrollments').insert({ user_id: member.id, course_id: courseId, source: 'purchase' });
    expect(enrol.error).toBeNull();
    const lessonId = await createCompleteLesson(courseId, 'has-learners', 'บทที่มีผู้เรียน', true);
    const res = await memberDb.rpc('submit_quiz', { p_lesson_id: lessonId, p_answers: await buildAnswers(adminDb, lessonId, 1) });
    expect(res.error).toBeNull();

    const list = new AdminLessonsPage(adminPage);
    await list.goto(courseId);
    await list.lessonMenu('บทที่มีผู้เรียน', 'ลบ');
    await expect(list.dialog().getByRole('button', { name: 'ยกเลิก' })).toBeFocused();
    await list.dialog().getByRole('button', { name: 'ลบ', exact: true }).click();
    await expect(list.status()).toContainText('ลบบทนี้ไม่ได้เพราะมีผู้เรียนแล้ว');
    await expect(list.row('บทที่มีผู้เรียน')).toBeVisible();
    const row = await db.from('lessons').select('id').eq('id', lessonId);
    expect(row.data).toHaveLength(1);
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-07 untouched draft can be deleted @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const title = `บทลบได้ ${randomUUID().slice(0, 8)}`;
    await createCompleteLesson(courseId, `qa-${randomUUID().slice(0, 8)}`, title, false);
    const list = new AdminLessonsPage(adminPage);
    await list.goto(courseId);
    await list.lessonMenu(title, 'ลบ');
    await expect(list.dialog()).toContainText(title);
    await list.dialog().getByRole('button', { name: 'ลบ', exact: true }).click();
    await expect(list.row(title)).toHaveCount(0);
    const rows = await adminClient().from('lessons').select('id').eq('course_id', courseId);
    expect(rows.data).toEqual([]);
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-08 lesson editor validation keeps values and saves nothing @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const lessonId = await createCompleteLesson(courseId, `qa-${randomUUID().slice(0, 8)}`, 'ชื่อเดิม', false);
    const edit = new LessonEditorPage(adminPage);
    await edit.goto(lessonId);
    await adminPage.getByLabel('ชื่อบทเรียน').fill('');
    await adminPage.getByLabel('คำอธิบาย').fill('สรุปที่พิมพ์ไว้');
    await edit.saveButton().click();

    await expect(edit.message()).toContainText('กรุณากรอกชื่อบทเรียน');
    await expect(adminPage.getByLabel('คำอธิบาย')).toHaveValue('สรุปที่พิมพ์ไว้');
    await expect(edit.saveButton()).toBeEnabled();
    const row = await adminClient().from('lessons').select('title, summary').eq('id', lessonId).single();
    expect(row.data).toEqual({ title: 'ชื่อเดิม', summary: null });
  } finally {
    await deleteCourse(courseId);
  }
});
