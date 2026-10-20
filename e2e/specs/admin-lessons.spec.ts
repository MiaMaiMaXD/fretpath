import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';
import { AdminLessonEditPage } from '../pages/admin/AdminLessonEditPage';
import { AdminLessonsPage } from '../pages/admin/AdminLessonsPage';
import { buildAnswers } from '../utils/quiz';
import { adminClient } from '../utils/supabaseAdmin';

/** Own course per test (R2): never touch the seed course. Not enrolled by anyone automatically. */
async function createCourse() {
  const db = adminClient();
  const key = randomUUID().slice(0, 8);
  const { data, error } = await db
    .from('courses')
    .insert({
      slug: `qa-${key}`,
      title: `คอร์สทดสอบ QA ${key}`,
      is_free: false,
      status: 'published',
      sort_order: 1000 + Math.floor(Math.random() * 1_000_000),
    })
    .select('id')
    .single();
  if (error) throw new Error(`createCourse failed: ${error.message}`);
  return data.id;
}

async function deleteCourse(courseId: string) {
  const db = adminClient();
  const lessons = await db.from('lessons').select('id').eq('course_id', courseId);
  const ids = (lessons.data ?? []).map((l) => l.id);
  if (ids.length > 0) {
    await db.from('quiz_attempts').delete().in('lesson_id', ids);
    await db.from('lesson_progress').delete().in('lesson_id', ids);
  }
  const { error } = await db.from('courses').delete().eq('id', courseId);
  if (error) console.warn(`teardown: failed to delete course ${courseId}`, error.message);
}

/** A complete lesson (1 question, 2 choices, key) created straight in the DB. */
async function createCompleteLesson(courseId: string, slug: string, title: string, publish: boolean) {
  const db = adminClient();
  const l = await db
    .from('lessons')
    .insert({ course_id: courseId, slug, title, sort_order: 1, status: 'draft' })
    .select('id')
    .single();
  if (l.error) throw new Error(l.error.message);
  const c = await db.from('lesson_contents').insert({ lesson_id: l.data.id, content_md: 'x' });
  if (c.error) throw new Error(c.error.message);
  const q = await db
    .from('quiz_questions')
    .insert({ lesson_id: l.data.id, prompt: 'ข้อทดสอบ', sort_order: 1 })
    .select('id')
    .single();
  if (q.error) throw new Error(q.error.message);
  const ch = await db
    .from('quiz_choices')
    .insert([
      { question_id: q.data.id, text: 'ถูก', sort_order: 1 },
      { question_id: q.data.id, text: 'ผิด', sort_order: 2 },
    ])
    .select('id, text');
  if (ch.error) throw new Error(ch.error.message);
  const right = ch.data.find((x) => x.text === 'ถูก')!;
  const k = await db.from('quiz_answer_keys').insert({ question_id: q.data.id, correct_choice_id: right.id });
  if (k.error) throw new Error(k.error.message);
  if (publish) {
    const u = await db.from('lessons').update({ status: 'published' }).eq('id', l.data.id);
    if (u.error) throw new Error(u.error.message);
  }
  return l.data.id;
}

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

    const slug = `qa-${randomUUID().slice(0, 8)}`;
    const title = `บททดสอบ QA ${randomUUID()}`;
    const edit = new AdminLessonEditPage(adminPage);
    await edit.gotoNew(courseId);
    await edit.fill({ title, slug, summary: 'สรุปสั้น', contentMd: '# เนื้อหา', passScore: '70' });
    await edit.create();

    await expect(adminPage).toHaveURL(/\/admin\/lessons\/[0-9a-f-]{36}$/);
    await expect(adminPage.getByText('สถานะ: ฉบับร่าง')).toBeVisible();
    await expect(adminPage.getByLabel('ชื่อบท', { exact: true })).toHaveValue(title);

    const list = new AdminLessonsPage(adminPage);
    await list.goto(courseId);
    const row = list.row(title);
    await expect(row).toContainText('ฉบับร่าง');
    await expect(row).toContainText('70');

    const control = await memberDb.from('lessons').select('slug').eq('course_id', courseId).eq('slug', controlSlug);
    expect(control.error).toBeNull();
    expect(control.data).toEqual([{ slug: controlSlug }]);
    const seen = await memberDb.from('lessons').select('id').eq('course_id', courseId).eq('slug', slug);
    expect(seen.error).toBeNull();
    expect(seen.data).toEqual([]);
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-05 publishing an incomplete lesson lists what is missing @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const edit = new AdminLessonEditPage(adminPage);
    await edit.gotoNew(courseId);
    await edit.fill({ title: 'บทว่าง', slug: `qa-${randomUUID().slice(0, 8)}`, passScore: '60' });
    await edit.create();
    await expect(adminPage.getByText('สถานะ: ฉบับร่าง')).toBeVisible();

    await adminPage.getByRole('button', { name: 'เผยแพร่', exact: true }).click();
    const alert = edit.problems();
    await expect(alert).toContainText('ยังเผยแพร่ไม่ได้:');
    await expect(alert).toContainText('ยังไม่มีคำถาม');
    await expect(adminPage.getByText('สถานะ: ฉบับร่าง')).toBeVisible();
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-06 lesson with learners cannot be deleted and offers draft instead @regression', async ({
  adminPage,
  member,
  memberDb,
  adminDb,
}) => {
  const courseId = await createCourse();
  try {
    const db = adminClient();
    const enrol = await db.from('enrollments').insert({ user_id: member.id, course_id: courseId, source: 'purchase' });
    expect(enrol.error).toBeNull();
    const lessonId = await createCompleteLesson(courseId, 'has-learners', 'บทที่มีผู้เรียน', true);

    const answers = await buildAnswers(adminDb, lessonId, 1);
    const res = await memberDb.rpc('submit_quiz', { p_lesson_id: lessonId, p_answers: answers });
    expect(res.error).toBeNull();

    const edit = new AdminLessonEditPage(adminPage);
    await edit.goto(lessonId);
    await expect(adminPage.getByText('สถานะ: เผยแพร่')).toBeVisible();
    await adminPage.getByRole('button', { name: 'ลบบทเรียน' }).click();

    const dialog = adminPage.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'ยกเลิก' })).toBeFocused();
    await dialog.getByRole('button', { name: 'ลบ', exact: true }).click();
    await expect(dialog).toContainText('ลบบทนี้ไม่ได้เพราะมีผู้เรียนแล้ว');
    await dialog.getByRole('button', { name: 'เปลี่ยนเป็นฉบับร่างแทน' }).click();

    await expect(adminPage.getByText('สถานะ: ฉบับร่าง')).toBeVisible();
    const row = await db.from('lessons').select('status').eq('id', lessonId).single();
    expect(row.data?.status).toBe('draft');
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-07 untouched draft can be deleted @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const title = `บทลบได้ ${randomUUID().slice(0, 8)}`;
    const edit = new AdminLessonEditPage(adminPage);
    await edit.gotoNew(courseId);
    await edit.fill({ title, slug: `qa-${randomUUID().slice(0, 8)}`, passScore: '60' });
    await edit.create();
    await expect(adminPage.getByText('สถานะ: ฉบับร่าง')).toBeVisible();

    await adminPage.getByRole('button', { name: 'ลบบทเรียน' }).click();
    const dialog = adminPage.getByRole('dialog');
    await dialog.getByRole('button', { name: 'ลบ', exact: true }).click();

    await expect(adminPage).toHaveURL(/\/admin\/lessons\?course=/);
    await expect(new AdminLessonsPage(adminPage).row(title)).toHaveCount(0);
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-08 lesson form validation keeps values @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const edit = new AdminLessonEditPage(adminPage);
    await edit.gotoNew(courseId);
    await edit.fill({
      title: 'ชื่อที่พิมพ์ไว้',
      slug: 'typed-slug',
      summary: 'สรุปที่พิมพ์ไว้',
      contentMd: 'เนื้อหาที่พิมพ์ไว้',
      passScore: '101',
    });
    await edit.create();

    await expect(adminPage.getByText('เกณฑ์ผ่านต้องเป็นจำนวนเต็ม 1–100')).toBeVisible();
    await expect(adminPage.getByLabel('เกณฑ์ผ่าน (%)')).toHaveValue('101');
    await expect(adminPage.getByLabel('ชื่อบท', { exact: true })).toHaveValue('ชื่อที่พิมพ์ไว้');
    await expect(adminPage.getByLabel('slug', { exact: true })).toHaveValue('typed-slug');
    await expect(adminPage.getByLabel('เนื้อหา (Markdown)')).toHaveValue('เนื้อหาที่พิมพ์ไว้');
    await expect(adminPage).toHaveURL(/\/admin\/lessons\/new/);
  } finally {
    await deleteCourse(courseId);
  }
});
