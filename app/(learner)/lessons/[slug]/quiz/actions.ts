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
  revalidatePath('/path');
  revalidatePath('/dashboard');
  return { ok: true, result: data as unknown as QuizResult };
}
