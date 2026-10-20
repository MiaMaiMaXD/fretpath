'use server';

import { revalidatePath } from 'next/cache';
import { compactChoices, validateQuestionInput, type QuestionInput } from '@/lib/admin/question-form';
import type { ActionState } from '@/lib/action-state';
import { requireAdmin } from '@/lib/data/admin';
import { errorCodeFrom, thaiError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh(lessonId?: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/lessons');
  if (lessonId) revalidatePath(`/admin/lessons/${lessonId}`);
}

function fail(error: { message?: string; code?: string }): ActionState {
  const code = errorCodeFrom(error);
  return { ok: false, code, message: thaiError(code) };
}

export async function saveQuestion(
  lessonId: string,
  questionId: string | null,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const text = (k: string) => {
    const v = fd.get(k);
    return typeof v === 'string' ? v : '';
  };
  const input: QuestionInput = {
    prompt: text('prompt').trim(),
    choices: fd.getAll('choice').map((v) => (typeof v === 'string' ? v : '')),
    correctIndex: text('correctIndex').trim(),
    explanation: text('explanation').trim(),
  };
  const values: Record<string, string> = {
    prompt: input.prompt,
    correctIndex: input.correctIndex,
    explanation: input.explanation,
  };
  const fieldErrors = validateQuestionInput(input);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors, values };
  if (!UUID_RE.test(lessonId) || (questionId !== null && !UUID_RE.test(questionId))) {
    return { ok: false, message: thaiError('UNKNOWN'), values };
  }

  const { choices, correct } = compactChoices(input.choices, Number(input.correctIndex));
  const supabase = await createClient();
  // One RPC = one transaction, so the published-lesson completeness check runs once at commit.
  const { error } = await supabase.rpc('admin_save_question', {
    p_lesson: lessonId,
    p_question: questionId as string,
    p_prompt: input.prompt,
    p_choices: choices,
    p_correct: correct,
    p_explanation: input.explanation,
  });
  if (error) return { ...fail(error), values };

  refresh(lessonId);
  return { ok: true, message: 'บันทึกแล้ว' };
}

export async function deleteQuestion(lessonId: string, questionId: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId);
  if (error) return fail(error);
  refresh(lessonId);
  return { ok: true };
}

export async function moveQuestion(lessonId: string, questionId: string, direction: 'up' | 'down'): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_move_question', { p_question: questionId, p_direction: direction });
  if (error) return fail(error);
  refresh(lessonId);
  return { ok: true };
}
