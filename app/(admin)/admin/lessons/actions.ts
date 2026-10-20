'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CONFLICT_MESSAGE, uniqueViolationKind, validateLessonInput, type LessonInput } from '@/lib/admin/lesson-form';
import type { ActionState } from '@/lib/action-state';
import { requireAdmin } from '@/lib/data/admin';
import { errorCodeFrom, thaiError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

export type LessonActionResult = ActionState & { problems?: string[]; offerDraft?: boolean };

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};

function parse(fd: FormData): { input: LessonInput; values: Record<string, string> } {
  const input: LessonInput = {
    title: str(fd, 'title').trim(),
    slug: str(fd, 'slug').trim(),
    summary: str(fd, 'summary').trim(),
    contentMd: str(fd, 'contentMd'),
    videoUrl: str(fd, 'videoUrl').trim(),
    passScore: str(fd, 'passScore').trim(),
  };
  return { input, values: { ...input } };
}

function refresh(id?: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/lessons');
  if (id) revalidatePath(`/admin/lessons/${id}`);
  revalidatePath('/path');
  revalidatePath('/dashboard');
}

type DbError = { message?: string; code?: string; details?: string };

function failure(error: DbError, values: Record<string, string>): ActionState {
  const unique = uniqueViolationKind(error);
  if (unique === 'slug') return { ok: false, fieldErrors: { slug: 'slug นี้ถูกใช้แล้ว' }, values };
  if (unique === 'sort_order') return { ok: false, message: CONFLICT_MESSAGE, values };
  if (error.code === '23514' && error.message?.includes('video_url')) {
    return { ok: false, fieldErrors: { videoUrl: 'ต้องเป็นลิงก์ YouTube' }, values };
  }
  return { ok: false, message: thaiError(error.code === '23514' ? 'UNKNOWN' : errorCodeFrom(error)), values };
}

export async function createLesson(courseId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const { input, values } = parse(fd);
  const fieldErrors = validateLessonInput(input);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors, values };

  // One RPC = one transaction: lesson (always draft) + contents, sort_order = max+1 under a course lock.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_create_lesson', {
    p_course: courseId,
    p_slug: input.slug,
    p_title: input.title,
    p_summary: input.summary,
    p_pass_score: Number(input.passScore),
    p_content_md: input.contentMd,
    p_video_url: input.videoUrl,
  });
  if (error) return failure(error, values);

  refresh(data);
  redirect(`/admin/lessons/${data}`);
}

export async function updateLesson(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const { input, values } = parse(fd);
  const fieldErrors = validateLessonInput(input);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_update_lesson', {
    p_id: id,
    p_slug: input.slug,
    p_title: input.title,
    p_summary: input.summary,
    p_pass_score: Number(input.passScore),
    p_content_md: input.contentMd,
    p_video_url: input.videoUrl,
  });
  if (error) return failure(error, values);

  refresh(id);
  return { ok: true, message: 'บันทึกแล้ว' };
}

export async function publishLesson(id: string): Promise<LessonActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const check = await supabase.rpc('lesson_publish_problems', { p_lesson: id });
  if (check.error) {
    const code = errorCodeFrom(check.error);
    return { ok: false, code, message: thaiError(code) };
  }
  if (check.data.length > 0) return { ok: false, problems: check.data };

  const { error } = await supabase.from('lessons').update({ status: 'published' }).eq('id', id);
  if (error) {
    const code = errorCodeFrom(error);
    return { ok: false, code, message: thaiError(code) };
  }
  refresh(id);
  return { ok: true };
}

export async function unpublishLesson(id: string): Promise<LessonActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('lessons').update({ status: 'draft' }).eq('id', id);
  if (error) {
    const code = errorCodeFrom(error);
    return { ok: false, code, message: thaiError(code) };
  }
  refresh(id);
  return { ok: true };
}

export async function deleteLesson(id: string): Promise<LessonActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('lessons').delete().eq('id', id);
  if (error) {
    const code = errorCodeFrom(error);
    return { ok: false, code, message: thaiError(code), offerDraft: code === 'LESSON_HAS_LEARNERS' };
  }
  refresh();
  return { ok: true };
}
