import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type Db = SupabaseClient<Database>;

export type QuizAnswer = { question_id: string; choice_id: string };

/** Resolve a lesson id of the seed course `guitar-basics` by lesson slug. */
export async function lessonIdBySlug(db: Db, slug: string): Promise<string> {
  const course = await db.from('courses').select('id').eq('slug', 'guitar-basics').single();
  if (course.error) throw new Error(`course lookup failed: ${course.error.message}`);
  const lesson = await db
    .from('lessons')
    .select('id')
    .eq('course_id', course.data.id)
    .eq('slug', slug)
    .single();
  if (lesson.error) throw new Error(`lesson lookup failed (${slug}): ${lesson.error.message}`);
  return lesson.data.id;
}

/**
 * Build a full answer set: the correct choice for the first `correctCount`
 * questions (by sort_order) and a wrong choice for the rest.
 * Reads the answer keys, so `adminDb` must have admin rights. Tests only.
 */
export async function buildAnswers(
  adminDb: Db,
  lessonId: string,
  correctCount: number,
): Promise<QuizAnswer[]> {
  const qs = await adminDb
    .from('quiz_questions')
    .select('id')
    .eq('lesson_id', lessonId)
    .order('sort_order');
  if (qs.error) throw new Error(`questions failed: ${qs.error.message}`);
  const ids = qs.data.map((q) => q.id);

  const [choices, keys] = await Promise.all([
    adminDb
      .from('quiz_choices')
      .select('id, question_id, sort_order')
      .in('question_id', ids)
      .order('sort_order'),
    adminDb.from('quiz_answer_keys').select('question_id, correct_choice_id').in('question_id', ids),
  ]);
  if (choices.error) throw new Error(`choices failed: ${choices.error.message}`);
  if (keys.error) throw new Error(`answer keys failed: ${keys.error.message}`);

  return ids.map((questionId, i) => {
    const correct = keys.data.find((k) => k.question_id === questionId)?.correct_choice_id;
    if (!correct) throw new Error(`no answer key for question ${questionId}`);
    if (i < correctCount) return { question_id: questionId, choice_id: correct };
    const wrong = choices.data.find((c) => c.question_id === questionId && c.id !== correct);
    if (!wrong) throw new Error(`no wrong choice for question ${questionId}`);
    return { question_id: questionId, choice_id: wrong.id };
  });
}

/** YYYY-MM-DD for today (Asia/Bangkok) shifted by `offsetDays`. */
export function bangkokDate(offsetDays: number): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [y, m, d] = fmt.format(new Date()).split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return shifted.toISOString().slice(0, 10);
}

/** Map each answer's choice_id to its visible choice text (page order = answer order). */
export async function choiceTexts(db: Db, answers: QuizAnswer[]): Promise<string[]> {
  const res = await db
    .from('quiz_choices')
    .select('id, text')
    .in(
      'id',
      answers.map((a) => a.choice_id),
    );
  if (res.error) throw new Error(`choice text lookup failed: ${res.error.message}`);
  return answers.map((a) => {
    const c = res.data.find((x) => x.id === a.choice_id);
    if (!c) throw new Error(`choice ${a.choice_id} not found`);
    return c.text;
  });
}
