import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';
import { LessonEditorPage } from '../pages/admin/LessonEditorPage';
import { buildAnswers } from '../utils/quiz';
import { createCompleteLesson, createCourse, deleteCourse } from '../utils/adminCourse';
import { adminClient } from '../utils/supabaseAdmin';

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

test('TC-ADM-09 add question with choices and key then publish @smoke', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const lessonId = await createEmptyDraft(courseId);
    const edit = new LessonEditorPage(adminPage);
    await edit.goto(lessonId);
    await edit.openQuiz();
    await edit.addChoiceQuestion('คอร์ด C คือคอร์ดอะไร?', ['C เมเจอร์', 'A ไมเนอร์', 'G เซเว่น', 'D เมเจอร์'], 0);
    await edit.saveDraft();

    const db = adminClient();
    const q = await db.from('quiz_questions').select('id').eq('lesson_id', lessonId);
    expect(q.data).toHaveLength(1);
    const key = await db.from('quiz_answer_keys').select('quiz_choices!inner(text)').eq('question_id', q.data![0].id).single();
    expect(key.data?.quiz_choices.text).toBe('C เมเจอร์');
    const choices = await db.from('quiz_choices').select('text').eq('question_id', q.data![0].id).order('sort_order');
    expect(choices.data?.map((c) => c.text)).toEqual(['C เมเจอร์', 'A ไมเนอร์', 'G เซเว่น', 'D เมเจอร์']);

    await adminPage.reload();
    await edit.openQuiz();
    await expect(edit.questions()).toHaveCount(1);

    await edit.status().click();
    await edit.dialog().getByRole('button', { name: 'ตกลง' }).click();
    await expect(edit.status()).toHaveText('เผยแพร่');
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-10 an incomplete question is not saved and keeps what was typed @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const lessonId = await createEmptyDraft(courseId);
    const edit = new LessonEditorPage(adminPage);
    await edit.goto(lessonId);
    await edit.openQuiz();
    await adminPage.getByRole('button', { name: '+ เพิ่มปรนัย' }).click();
    const q = edit.questions().last();
    // new questions come with four choices
    await expect(q.getByLabel(/^ตัวเลือกที่ \d$/)).toHaveCount(4);
    await q.getByPlaceholder('กรอกคำถาม').fill('คำถามที่พิมพ์ไว้');
    await q.getByLabel('ตัวเลือกที่ 1', { exact: true }).fill('ก');
    await edit.saveButton().click();

    await expect(edit.message()).toContainText('ข้อที่ 1: กรอกตัวเลือกให้ครบทุกช่อง');
    await expect(edit.message()).toContainText('ข้อที่ 1: เลือกข้อที่ถูก');
    await expect(q.getByPlaceholder('กรอกคำถาม')).toHaveValue('คำถามที่พิมพ์ไว้');
    await expect(q.getByLabel('ตัวเลือกที่ 1', { exact: true })).toHaveValue('ก');
    const rows = await adminClient().from('quiz_questions').select('id').eq('lesson_id', lessonId);
    expect(rows.data).toEqual([]);
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-11 updating a published lesson into an incomplete state is refused @regression', async ({
  adminPage,
  adminDb,
}) => {
  const courseId = await createCourse();
  try {
    const lessonId = await createCompleteLesson(courseId, 'pub', 'บทเผยแพร่', true);
    const edit = new LessonEditorPage(adminPage);
    await edit.goto(lessonId);
    await edit.openQuiz();
    await expect(edit.questions()).toHaveCount(1);

    // remove the only question, then try to make it live
    await edit.questions().first().getByRole('button', { name: 'ลบข้อที่ 1' }).click();
    await edit.dialog().getByRole('button', { name: 'ลบ', exact: true }).click();
    await expect(edit.questions()).toHaveCount(0);
    await expect(edit.status()).toHaveText('อัปเดต');
    await edit.status().click();
    await expect(edit.message()).toContainText('บทนี้เผยแพร่อยู่');
    const still = await adminClient().from('quiz_questions').select('id').eq('lesson_id', lessonId);
    expect(still.data).toHaveLength(1);

    // the database refuses a save that would leave one choice, and rolls back whole
    const q = await adminClient().from('quiz_questions').select('id').eq('lesson_id', lessonId).single();
    const res = await adminDb.rpc('admin_save_question', {
      p_lesson: lessonId,
      p_question: q.data!.id,
      p_prompt: 'เปลี่ยนแล้ว',
      p_choices: ['เหลือข้อเดียว'],
      p_choice_ids: [null as unknown as string],
      p_correct: 0,
      p_explanation: '',
    });
    expect(res.error?.message).toContain('LESSON_PUBLISHED_INCOMPLETE');
    const after = await adminClient().from('quiz_questions').select('prompt').eq('id', q.data!.id).single();
    expect(after.data?.prompt).toBe('ข้อทดสอบ');
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-19 dragging a question changes the order @regression', async ({ adminPage }) => {
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

    const edit = new LessonEditorPage(adminPage);
    await edit.goto(lessonId);
    await edit.openQuiz();
    await expect(edit.questions().nth(1)).toContainText('ข้อสอง');
    await edit.questions().nth(1).locator('.qz-head .grip').dragTo(edit.questions().nth(0));
    await expect(edit.questions().nth(0)).toContainText('ข้อสอง');
    await edit.saveDraft();

    const rows = await db.from('quiz_questions').select('prompt').eq('lesson_id', lessonId).order('sort_order');
    expect(rows.data?.map((r) => r.prompt)).toEqual(['ข้อสอง', 'ข้อทดสอบ']);
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-ADM-20 delete asks first and an answered question cannot be deleted @regression', async ({
  adminPage,
  adminDb,
  member,
  memberDb,
}) => {
  const courseId = await createCourse();
  try {
    const enrol = await adminClient()
      .from('enrollments')
      .insert({ user_id: member.id, course_id: courseId, source: 'purchase' });
    expect(enrol.error).toBeNull();
    // built as a draft so the second question can be added, then published
    const lessonId = await createCompleteLesson(courseId, 'ans', 'บทที่มีผู้ตอบ', false);
    // a second question keeps the lesson complete without the answered one
    const db = adminClient();
    const q2 = await db.from('quiz_questions').insert({ lesson_id: lessonId, prompt: 'ข้อสอง', sort_order: 2 }).select('id').single();
    const ch = await db.from('quiz_choices').insert([{ question_id: q2.data!.id, text: 'A', sort_order: 1 }, { question_id: q2.data!.id, text: 'B', sort_order: 2 }]).select('id');
    await db.from('quiz_answer_keys').insert({ question_id: q2.data!.id, correct_choice_id: ch.data![0].id });
    const pub = await db.from('lessons').update({ status: 'published' }).eq('id', lessonId);
    expect(pub.error).toBeNull();
    const res = await memberDb.rpc('submit_quiz', { p_lesson_id: lessonId, p_answers: await buildAnswers(adminDb, lessonId, 1) });
    expect(res.error).toBeNull();

    const edit = new LessonEditorPage(adminPage);
    await edit.goto(lessonId);
    await edit.openQuiz();
    await edit.questions().first().getByRole('button', { name: 'ลบข้อที่ 1' }).click();
    await expect(edit.dialog()).toContainText('ข้อที่ 1');
    await expect(edit.dialog().getByRole('button', { name: 'ยกเลิก' })).toBeFocused();
    await edit.dialog().getByRole('button', { name: 'ลบ', exact: true }).click();
    await edit.status().click(); // อัปเดต
    await expect(edit.message()).toContainText('มีผู้เรียนตอบข้อนี้แล้ว');

    // the answered question and the learner's history are untouched
    const q = await db.from('quiz_questions').select('id').eq('lesson_id', lessonId).eq('prompt', 'ข้อทดสอบ').single();
    const answers = await db.from('quiz_attempt_answers').select('choice_id').eq('question_id', q.data!.id);
    expect(answers.data).toHaveLength(1);
    const drop = await adminDb.rpc('admin_save_question', {
      p_lesson: lessonId,
      p_question: q.data!.id,
      p_prompt: 'x',
      p_choices: ['ใหม่1', 'ใหม่2'],
      p_choice_ids: [null as unknown as string, null as unknown as string],
      p_correct: 0,
      p_explanation: '',
    });
    expect(drop.error?.message).toContain('QUESTION_HAS_ANSWERS');
    const still = await db.from('quiz_attempt_answers').select('choice_id').eq('question_id', q.data!.id);
    expect(still.data).toEqual(answers.data);
  } finally {
    await deleteCourse(courseId);
  }
});

test('TC-SEC-20 member calling admin question action directly is refused @security', async ({ memberDb }) => {
  const courseId = await createCourse();
  try {
    const lessonId = await createCompleteLesson(courseId, 'sec', 'บทความปลอดภัย', false);
    const q = await adminClient().from('quiz_questions').select('id').eq('lesson_id', lessonId).single();
    const k = await adminClient().from('quiz_answer_keys').select('correct_choice_id').eq('question_id', q.data!.id).single();
    await memberSecurityChecks(memberDb, lessonId, q.data!.id, k.data!.correct_choice_id);
  } finally {
    await deleteCourse(courseId);
  }
});

async function memberSecurityChecks(
  memberDb: Parameters<Parameters<typeof test>[2]>[0]['memberDb'],
  lessonId: string,
  questionId: string,
  choiceId: string,
) {
  const id = questionId;
  const save = await memberDb.rpc('admin_save_question', {
    p_lesson: lessonId,
    p_question: null as unknown as string,
    p_prompt: 'x',
    p_choices: ['a', 'b'],
    p_choice_ids: [null as unknown as string, null as unknown as string],
    p_correct: 0,
    p_explanation: '',
  });
  expect(save.error?.message).toContain('NOT_ADMIN');
  const move = await memberDb.rpc('admin_move_question', { p_question: id, p_direction: 'up' });
  expect(move.error?.message).toContain('NOT_ADMIN');
  const del = await memberDb.rpc('admin_delete_question', { p_question: id });
  expect(del.error?.message).toContain('NOT_ADMIN');
  // RLS refusal on a real row: the question exists and has a key, yet a member cannot write it.
  const key = await memberDb
    .from('quiz_answer_keys')
    .update({ correct_choice_id: choiceId, explanation: 'hacked' })
    .eq('question_id', id)
    .select();
  expect(key.data ?? []).toEqual([]);
  const ins = await memberDb
    .from('quiz_answer_keys')
    .insert({ question_id: id, correct_choice_id: choiceId, explanation: 'x' });
  expect(ins.error).not.toBeNull();
  const after = await adminClient().from('quiz_answer_keys').select('explanation').eq('question_id', id).single();
  expect(after.data?.explanation).not.toBe('hacked');
}
