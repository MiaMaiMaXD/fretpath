import { randomUUID } from 'node:crypto';
import { adminClient } from './supabaseAdmin';

/** Own course per test (R2): sort_order >= 1000, not free, published; never the seed course. */
export async function createCourse() {
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

export async function deleteCourse(courseId: string) {
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
export async function createCompleteLesson(courseId: string, slug: string, title: string, publish: boolean) {
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
