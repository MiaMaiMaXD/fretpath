import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { createCompleteLesson, createCourse, deleteCourse } from '../utils/adminCourse';
import { adminClient } from '../utils/supabaseAdmin';

const group = (page: Page, name: string) => page.getByRole('group', { name, exact: true });

async function createEmptyDraft(courseId: string) {
  const db = adminClient();
  const l = await db
    .from('lessons')
    .insert({ course_id: courseId, slug: `qa-${randomUUID().slice(0, 8)}`, title: 'บทว่าง', sort_order: 1, status: 'draft' })
    .select('id')
    .single();
  if (l.error) throw new Error(l.error.message);
  const c = await db.from('lesson_contents').insert({ lesson_id: l.data.id, content_md: 'x' });
  if (c.error) throw new Error(c.error.message);
  return l.data.id;
}

test('TC-ADM-09 add question with choices, key and explanation then publish @smoke', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const lessonId = await createEmptyDraft(courseId);
    await adminPage.goto(`/admin/lessons/${lessonId}`);

    await adminPage.getByRole('button', { name: 'เพิ่มคำถาม', exact: true }).click();
    const form = group(adminPage, 'คำถามใหม่');
    await form.getByLabel('คำถาม', { exact: true }).fill('คอร์ด C คือคอร์ดอะไร?');
    await form.getByLabel('ตัวเลือก 1', { exact: true }).fill('C เมเจอร์');
    await form.getByLabel('ตัวเลือก 2', { exact: true }).fill('A ไมเนอร์');
    await form.getByRole('button', { name: 'เพิ่มตัวเลือก' }).click();
    await form.getByLabel('ตัวเลือก 3', { exact: true }).fill('G เซเว่น');
    await form.getByRole('radio', { name: 'ตัวเลือก 1 เป็นข้อที่ถูก' }).check();
    await form.getByLabel('คำอธิบาย', { exact: true }).fill('C เมเจอร์ประกอบด้วย C E G');
    await form.getByRole('button', { name: 'บันทึกคำถาม' }).click();

    const saved = group(adminPage, 'ข้อ 1');
    await expect(saved).toBeVisible();
    await expect(saved.getByLabel('ตัวเลือก 3', { exact: true })).toHaveValue('G เซเว่น');
    await expect(saved.getByRole('radio', { name: 'ตัวเลือก 1 เป็นข้อที่ถูก' })).toBeChecked();

    const db = adminClient();
    const q = await db.from('quiz_questions').select('id').eq('lesson_id', lessonId);
    expect(q.data).toHaveLength(1);
    const key = await db
      .from('quiz_answer_keys')
      .select('explanation, quiz_choices!inner(text)')
      .eq('question_id', q.data![0].id)
      .single();
    expect(key.data?.explanation).toBe('C เมเจอร์ประกอบด้วย C E G');
    expect(key.data?.quiz_choices.text).toBe('C เมเจอร์');

    await adminPage.getByRole('button', { name: 'เผยแพร่', exact: true }).click();
    await expect(adminPage.getByText('สถานะ: เผยแพร่')).toBeVisible();
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-10 choice count limits 2–6 in the editor @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const lessonId = await createEmptyDraft(courseId);
    await adminPage.goto(`/admin/lessons/${lessonId}`);
    await adminPage.getByRole('button', { name: 'เพิ่มคำถาม', exact: true }).click();
    const form = group(adminPage, 'คำถามใหม่');

    await expect(form.getByLabel(/^ตัวเลือก \d$/)).toHaveCount(2);
    await expect(form.getByRole('button', { name: 'ลบตัวเลือก' })).toHaveCount(0);
    for (let n = 3; n <= 6; n++) await form.getByRole('button', { name: 'เพิ่มตัวเลือก' }).click();
    await expect(form.getByLabel(/^ตัวเลือก \d$/)).toHaveCount(6);
    await expect(form.getByRole('button', { name: 'เพิ่มตัวเลือก' })).toHaveCount(0);

    for (let n = 6; n > 2; n--) await form.getByRole('button', { name: 'ลบตัวเลือก' }).first().click();
    await expect(form.getByLabel(/^ตัวเลือก \d$/)).toHaveCount(2);
    await expect(form.getByRole('button', { name: 'ลบตัวเลือก' })).toHaveCount(0);
    await expect(form.getByRole('button', { name: 'เพิ่มตัวเลือก' })).toBeVisible();

    // failed validation keeps what was typed
    await form.getByLabel('คำถาม', { exact: true }).fill('คำถามที่พิมพ์ไว้');
    await form.getByLabel('ตัวเลือก 1', { exact: true }).fill('ก');
    await form.getByRole('button', { name: 'บันทึกคำถาม' }).click();
    await expect(form.getByText('ต้องมีตัวเลือก 2–6 ข้อ')).toBeVisible();
    await expect(form.getByText('กรุณาเลือกข้อที่ถูก')).toBeVisible();
    await expect(form.getByLabel('คำถาม', { exact: true })).toHaveValue('คำถามที่พิมพ์ไว้');
    await expect(form.getByLabel('ตัวเลือก 1', { exact: true })).toHaveValue('ก');
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-11 editing a published lesson into an incomplete state is refused @regression', async ({
  adminPage,
  adminDb,
}) => {
  const courseId = await createCourse();
  try {
    const lessonId = await createCompleteLesson(courseId, 'pub', 'บทเผยแพร่', true);
    await adminPage.goto(`/admin/lessons/${lessonId}`);
    await expect(group(adminPage, 'ข้อ 1')).toBeVisible();

    // The last question of a published lesson cannot be deleted.
    await group(adminPage, 'ข้อ 1').getByRole('button', { name: 'ลบคำถาม' }).click();
    await expect(group(adminPage, 'ข้อ 1').getByRole('alert')).toContainText('บทนี้เผยแพร่อยู่');
    await adminPage.reload();
    await expect(group(adminPage, 'ข้อ 1')).toBeVisible();
    await expect(group(adminPage, 'ข้อ 1').getByLabel('ตัวเลือก 2', { exact: true })).toHaveValue('ผิด');

    // A save that would leave one choice is refused by the database and rolls back whole.
    const q = await adminClient().from('quiz_questions').select('id').eq('lesson_id', lessonId).single();
    const res = await adminDb.rpc('admin_save_question', {
      p_lesson: lessonId,
      p_question: q.data!.id,
      p_prompt: 'เปลี่ยนแล้ว',
      p_choices: ['เหลือข้อเดียว'],
      p_correct: 0,
      p_explanation: '',
    });
    expect(res.error?.message).toContain('LESSON_PUBLISHED_INCOMPLETE');
    const after = await adminClient().from('quiz_questions').select('prompt').eq('id', q.data!.id).single();
    expect(after.data?.prompt).toBe('ข้อทดสอบ');
    const choices = await adminClient().from('quiz_choices').select('id').eq('question_id', q.data!.id);
    expect(choices.data).toHaveLength(2);
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-12 move question up and down swaps the order @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const lessonId = await createCompleteLesson(courseId, 'mv', 'บทเรียงข้อ', false);
    const db = adminClient();
    const q2 = await db.from('quiz_questions').insert({ lesson_id: lessonId, prompt: 'ข้อสอง', sort_order: 2 }).select('id').single();
    const ch = await db
      .from('quiz_choices')
      .insert([
        { question_id: q2.data!.id, text: 'A', sort_order: 1 },
        { question_id: q2.data!.id, text: 'B', sort_order: 2 },
      ])
      .select('id');
    await db.from('quiz_answer_keys').insert({ question_id: q2.data!.id, correct_choice_id: ch.data![0].id });

    await adminPage.goto(`/admin/lessons/${lessonId}`);
    const prompt = (n: number) => group(adminPage, `ข้อ ${n}`).getByLabel('คำถาม', { exact: true });
    await expect(prompt(2)).toHaveValue('ข้อสอง');
    await group(adminPage, 'ข้อ 2').getByRole('button', { name: 'เลื่อนขึ้น' }).click();
    await expect(prompt(1)).toHaveValue('ข้อสอง');
    await expect(prompt(2)).toHaveValue('ข้อทดสอบ');
    await group(adminPage, 'ข้อ 1').getByRole('button', { name: 'เลื่อนลง' }).click();
    await expect(prompt(1)).toHaveValue('ข้อทดสอบ');
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-SEC-20 member calling admin question action directly is refused @security', async ({ memberDb }) => {
  const id = randomUUID();
  const save = await memberDb.rpc('admin_save_question', {
    p_lesson: id,
    p_question: null as unknown as string,
    p_prompt: 'x',
    p_choices: ['a', 'b'],
    p_correct: 0,
    p_explanation: '',
  });
  expect(save.error?.message).toContain('NOT_ADMIN');
  const move = await memberDb.rpc('admin_move_question', { p_question: id, p_direction: 'up' });
  expect(move.error?.message).toContain('NOT_ADMIN');
  const key = await memberDb
    .from('quiz_answer_keys')
    .insert({ question_id: id, correct_choice_id: randomUUID(), explanation: 'x' });
  expect(key.error).not.toBeNull();
});
