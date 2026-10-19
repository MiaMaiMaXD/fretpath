'use server';

import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/action-state';
import { bangkokToday } from '@/lib/bangkok';
import { errorCodeFrom, thaiError } from '@/lib/errors';
import { ACTIVITIES } from '@/lib/practice-activities';
import { createClient } from '@/lib/supabase/server';
import { validatePractice } from '@/lib/validation';

const str = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
};

function parse(formData: FormData) {
  const values = {
    practicedOn: str(formData, 'practicedOn').trim(),
    minutes: str(formData, 'minutes').trim(),
    activity: str(formData, 'activity'),
    note: str(formData, 'note'),
    lessonId: str(formData, 'lessonId'),
  };
  const fieldErrors = validatePractice(values, bangkokToday());
  if (values.activity !== '' && !ACTIVITIES.some((a) => a.value === values.activity)) {
    fieldErrors.activity = 'กรุณาเลือกหัวข้อที่ฝึก';
  }
  return { values, fieldErrors };
}

function dbMessage(error: { message?: string; code?: string }): string {
  // CHECK violations (23514) are caught by validation first; show the generic Thai message if one slips through.
  return thaiError(error.code === '23514' ? 'UNKNOWN' : errorCodeFrom(error));
}

function refresh() {
  revalidatePath('/practice');
  revalidatePath('/dashboard');
}

export async function createPracticeLog(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { values, fieldErrors } = parse(formData);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors, values };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: thaiError('NOT_AUTHENTICATED'), values };

  const { error } = await supabase.from('practice_logs').insert({
    user_id: auth.user.id,
    practiced_on: values.practicedOn,
    minutes: Number(values.minutes),
    activity: values.activity,
    note: values.note === '' ? null : values.note,
    lesson_id: values.lessonId === '' ? null : values.lessonId,
  });
  if (error) return { ok: false, message: dbMessage(error), values };

  refresh();
  return { ok: true, message: 'บันทึกแล้ว' };
}

export async function updatePracticeLog(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { values, fieldErrors } = parse(formData);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors, values };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: thaiError('NOT_AUTHENTICATED'), values };

  const { error } = await supabase
    .from('practice_logs')
    .update({
      practiced_on: values.practicedOn,
      minutes: Number(values.minutes),
      activity: values.activity,
      note: values.note === '' ? null : values.note,
      lesson_id: values.lessonId === '' ? null : values.lessonId,
    })
    .eq('id', id)
    .eq('user_id', auth.user.id);
  if (error) return { ok: false, message: dbMessage(error), values };

  refresh();
  return { ok: true, message: 'บันทึกแล้ว' };
}

export async function deletePracticeLog(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: thaiError('NOT_AUTHENTICATED') };

  const { error } = await supabase.from('practice_logs').delete().eq('id', id).eq('user_id', auth.user.id);
  if (error) return { ok: false, message: dbMessage(error) };

  refresh();
  return { ok: true };
}
