'use server';

import { revalidatePath } from 'next/cache';
import { errorCodeFrom, type ErrorCode } from '@/lib/errors';
import type { QuizResult } from '@/lib/quiz';
import { createClient } from '@/lib/supabase/server';

export async function submitQuiz(
  lessonId: string,
  answers: { question_id: string; choice_id: string }[],
): Promise<{ ok: true; result: QuizResult } | { ok: false; code: ErrorCode }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('submit_quiz', { p_lesson_id: lessonId, p_answers: answers });
  if (error) return { ok: false, code: errorCodeFrom(error) };
  // not the quiz page itself: refreshing it here would swap the result for the "come back tomorrow" box
  // after the last attempt of the day. It is rendered per request, so the next visit is up to date.
  revalidatePath('/path');
  revalidatePath('/dashboard');
  // the RPC also returns the answer key and explanations; learners only get right/wrong for their own choice
  const raw = data as unknown as QuizResult & { results: (QuizResult['results'][number] & Record<string, unknown>)[] };
  const result: QuizResult = {
    ...raw,
    results: raw.results.map((r) => ({ question_id: r.question_id, choice_id: r.choice_id, is_correct: r.is_correct })),
  };
  return { ok: true, result };
}
