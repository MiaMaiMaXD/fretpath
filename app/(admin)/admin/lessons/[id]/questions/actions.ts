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

/** Admin-appropriate wording: the learner/lesson messages do not fit the question editor. */
function fail(error: { message?: string; code?: string }, context: 'save' | 'move' | 'delete'): ActionState {
  const code = errorCodeFrom(error);
  if (code === 'INVALID_ANSWERS') return { ok: false, code, message: 'ข้อมูลคำถามไม่ถูกต้อง' };
  if (code === 'INVALID_ORDER' || (context === 'move' && code === 'UNKNOWN')) {
    return { ok: false, code, message: 'ลำดับคำถามไม่ถูกต้อง กรุณาโหลดหน้าใหม่' };
  }
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
  const strings = (k: string) => fd.getAll(k).map((v) => (typeof v === 'string' ? v : ''));
  const input: QuestionInput = {
    prompt: text('prompt').trim(),
    choices: strings('choice'),
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
  const rawIds = strings('choiceId');
  if (
    !UUID_RE.test(lessonId) ||
    (questionId !== null && !UUID_RE.test(questionId)) ||
    rawIds.length !== input.choices.length ||
    rawIds.some((id) => id !== '' && !UUID_RE.test(id))
  ) {
    return { ok: false, message: thaiError('UNKNOWN'), values };
  }

  const { choices, ids, correct } = compactChoices(input.choices, rawIds, Number(input.correctIndex));
  const supabase = await createClient();
  // One RPC = one transaction, so the published-lesson completeness check runs once at commit.
  // Choices keep their ids so learners' recorded answers keep pointing at the same choice.
  const { error } = await supabase.rpc('admin_save_question', {
    p_lesson: lessonId,
    p_question: questionId as string,
    p_prompt: input.prompt,
    p_choices: choices,
    p_choice_ids: ids as string[],
    p_correct: correct,
    p_explanation: input.explanation,
  });
  if (error) return { ...fail(error, 'save'), values };

  refresh(lessonId);
  return { ok: true, message: 'บันทึกแล้ว' };
}

export async function deleteQuestion(lessonId: string, questionId: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  // RPC refuses a question learners have answered (history) and reports a missing one.
  const { error } = await supabase.rpc('admin_delete_question', { p_question: questionId });
  if (error) return fail(error, 'delete');
  refresh(lessonId);
  return { ok: true };
}

export async function moveQuestion(lessonId: string, questionId: string, direction: 'up' | 'down'): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_move_question', { p_question: questionId, p_direction: direction });
  if (error) return fail(error, 'move');
  refresh(lessonId);
  return { ok: true };
}
