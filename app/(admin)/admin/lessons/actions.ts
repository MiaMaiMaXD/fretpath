'use server';

import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/action-state';
import type { EditorState } from '@/lib/admin/editor-state';
import { editorProblems } from '@/lib/admin/lesson-pages';
import { quizProblems } from '@/lib/admin/quiz-editor';
import type { Json } from '@/lib/database.types';
import { sanitizeLessonHtml } from '@/lib/html';
import { requireAdmin } from '@/lib/data/admin';
import { getAdminLessons } from '@/lib/data/admin-lessons';
import { errorCodeFrom, thaiError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

export type LessonActionResult = ActionState & { problems?: string[]; offerDraft?: boolean };

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};

function refresh(id?: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/lessons');
  if (id) revalidatePath(`/admin/lessons/${id}`);
  revalidatePath('/lessons/[slug]', 'page');
  revalidatePath('/path');
  revalidatePath('/dashboard');
}

type DbError = { message?: string; code?: string; details?: string };

export async function publishLesson(id: string): Promise<LessonActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const check = await supabase.rpc('lesson_publish_problems', { p_lesson: id });
  if (check.error) {
    const code = errorCodeFrom(check.error);
    return { ok: false, code, message: thaiError(code) };
  }
  if (check.data.length > 0) return { ok: false, problems: check.data };

  const { data, error } = await supabase.from('lessons').update({ status: 'published' }).eq('id', id).select('id');
  if (error) {
    const code = errorCodeFrom(error);
    return { ok: false, code, message: thaiError(code) };
  }
  if (!data || data.length === 0) return { ok: false, code: 'LESSON_NOT_FOUND', message: thaiError('LESSON_NOT_FOUND') };
  refresh(id);
  return { ok: true };
}

export async function unpublishLesson(id: string): Promise<LessonActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from('lessons').update({ status: 'draft' }).eq('id', id).select('id');
  if (error) {
    const code = errorCodeFrom(error);
    return { ok: false, code, message: thaiError(code) };
  }
  if (!data || data.length === 0) return { ok: false, code: 'LESSON_NOT_FOUND', message: thaiError('LESSON_NOT_FOUND') };
  refresh(id);
  return { ok: true };
}

export async function deleteLesson(id: string): Promise<LessonActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from('lessons').delete().eq('id', id).select('id');
  if (error) {
    const code = errorCodeFrom(error);
    return { ok: false, code, message: thaiError(code), offerDraft: code === 'LESSON_HAS_LEARNERS' };
  }
  if (!data || data.length === 0) return { ok: false, code: 'LESSON_NOT_FOUND', message: thaiError('LESSON_NOT_FOUND') };
  refresh();
  return { ok: true };
}

export async function reorderLessons(courseId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const current = await getAdminLessons(courseId);
  const values: Record<string, string> = {};
  const nums: number[] = [];
  let invalid = false;
  for (const l of current) {
    const raw = str(fd, `order-${l.id}`).trim();
    values[`order-${l.id}`] = raw;
    if (/^[1-9]\d{0,8}$/.test(raw)) nums.push(Number(raw));
    else {
      invalid = true;
      nums.push(0);
    }
  }
  if (invalid) return { ok: false, message: 'ลำดับต้องเป็นจำนวนเต็มบวก', values };

  // Ties keep the current order (getAdminLessons is sorted by sort_order).
  const ids = current
    .map((l, i) => ({ id: l.id, n: nums[i], i }))
    .sort((a, b) => a.n - b.n || a.i - b.i)
    .map((x) => x.id);

  const supabase = await createClient();
  const { error } = await supabase.rpc('reorder_lessons', { p_course: courseId, p_lesson_ids: ids });
  if (error) return { ok: false, message: thaiError(errorCodeFrom(error)), values };

  refresh();
  return { ok: true, message: 'บันทึกลำดับแล้ว' };
}

// ---------------------------------------------------------------- sections ("ช่วง")

type Done = { ok: boolean; message?: string; id?: string };

async function rpcDone(fn: () => PromiseLike<{ data: unknown; error: DbError | null }>): Promise<Done> {
  await requireAdmin();
  const { data, error } = await fn();
  if (error) return { ok: false, message: thaiError(errorCodeFrom(error)) };
  refresh();
  return { ok: true, id: typeof data === 'string' ? data : undefined };
}

const SECTION_TITLE_MAX = 120;

export async function addSection(courseId: string): Promise<Done> {
  const supabase = await createClient();
  return rpcDone(() => supabase.rpc('admin_add_section', { p_course: courseId, p_title: '' }));
}

export async function renameSection(sectionId: string, title: string): Promise<Done> {
  const t = title.trim();
  if (t.length > SECTION_TITLE_MAX) return { ok: false, message: `ชื่อช่วงยาวได้ไม่เกิน ${SECTION_TITLE_MAX} ตัวอักษร` };
  const supabase = await createClient();
  return rpcDone(() => supabase.rpc('admin_rename_section', { p_section: sectionId, p_title: t }));
}

export async function deleteSection(sectionId: string): Promise<Done> {
  const supabase = await createClient();
  return rpcDone(() => supabase.rpc('admin_delete_section', { p_section: sectionId }));
}

/** New draft lesson "บทเรียนใหม่!" at the end of a section. */
export async function addLessonToSection(sectionId: string): Promise<Done> {
  const supabase = await createClient();
  return rpcDone(() => supabase.rpc('admin_add_lesson', { p_section: sectionId }));
}

// ---------------------------------------------------------------- lesson editor (pages)

export type SaveLessonResult = {
  ok: boolean;
  message?: string;
  problems?: string[];
  pageIds?: string[];
  questionIds?: string[];
  /** where the state went: "draft" (published lesson, not live yet) or "live" */
  savedTo?: 'draft' | 'live';
};

type Db = Awaited<ReturnType<typeof createClient>>;

/** Writes the editor state into the live tables in one transaction and drops any draft. */
async function applyLive(supabase: Db, lessonId: string, state: EditorState): Promise<SaveLessonResult> {
  const { info, pages, quiz, questions } = state;
  const { data, error } = await supabase.rpc('admin_save_lesson_editor', {
    p_lesson: lessonId,
    p_title: info.title.trim(),
    p_summary: info.summary.trim(),
    p_chords: info.chords,
    p_pages: pages.map((p) => ({
      ...(p.id ? { id: p.id } : {}),
      kind: p.kind,
      title: p.title.trim(),
      ...(p.kind === 'text' ? { body_html: sanitizeLessonHtml(p.html) } : {}),
      ...(p.kind === 'video' ? { video_url: p.videoUrl.trim() } : {}),
    })),
    p_pass_score: Number(quiz.passScore),
    p_max_attempts: quiz.maxAttempts.trim() ? Number(quiz.maxAttempts) : (null as unknown as number),
    p_questions: questions.map((q) =>
      q.kind === 'choice'
        ? {
            ...(q.id ? { id: q.id } : {}),
            kind: 'choice',
            prompt: q.prompt.trim(),
            choices: q.choices.map((c) => c.trim()),
            choice_ids: q.choiceIds,
            correct: q.correct,
            explanation: q.explanation,
          }
        : { ...(q.id ? { id: q.id } : {}), kind: 'practical', prompt: q.prompt.trim(), chords: q.chords },
    ),
  });
  if (error) return { ok: false, message: thaiError(errorCodeFrom(error)) };
  const del = await supabase.from('lesson_drafts').delete().eq('lesson_id', lessonId);
  if (del.error) return { ok: false, message: thaiError(errorCodeFrom(del.error)) };
  const ids = data as { pages: string[]; questions: string[] };
  return { ok: true, savedTo: 'live', pageIds: ids.pages ?? [], questionIds: ids.questions ?? [] };
}

async function lessonStatus(supabase: Db, lessonId: string) {
  const { data, error } = await supabase.from('lessons').select('status').eq('id', lessonId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.status ?? null;
}

/**
 * "บันทึกแบบร่าง" (target "draft") and "อัปเดต" (target "live"). A published lesson's draft is kept in
 * lesson_drafts so learners keep seeing the live version until "อัปเดต"; an unpublished lesson is
 * always saved to the live tables (nobody sees it yet).
 */
export async function saveLessonEditor(lessonId: string, state: EditorState, target: 'draft' | 'live'): Promise<SaveLessonResult> {
  const { userId } = await requireAdmin();
  const problems = [...editorProblems(state.info, state.pages), ...quizProblems(state.quiz, state.questions)];
  if (problems.length > 0) return { ok: false, problems };
  const supabase = await createClient();
  const status = await lessonStatus(supabase, lessonId);
  if (!status) return { ok: false, message: thaiError('LESSON_NOT_FOUND') };

  if (target === 'draft' && status === 'published') {
    const { error } = await supabase
      .from('lesson_drafts')
      .upsert({ lesson_id: lessonId, data: state as unknown as { [key: string]: Json }, updated_by: userId });
    if (error) return { ok: false, message: thaiError(errorCodeFrom(error)) };
    refresh(lessonId);
    return { ok: true, savedTo: 'draft' };
  }
  const res = await applyLive(supabase, lessonId, state);
  if (res.ok) refresh(lessonId);
  return res;
}

/**
 * Status button: publish applies the current editor state and publishes; unpublish applies any
 * pending changes too (nobody will see them) and turns the lesson back into a draft.
 */
export async function setLessonPublished(lessonId: string, state: EditorState, publish: boolean): Promise<LessonActionResult & SaveLessonResult> {
  await requireAdmin();
  const problems = [...editorProblems(state.info, state.pages), ...quizProblems(state.quiz, state.questions)];
  if (problems.length > 0) return { ok: false, problems };
  const supabase = await createClient();
  const saved = await applyLive(supabase, lessonId, state);
  if (!saved.ok) return saved;
  const res = publish ? await publishLesson(lessonId) : await unpublishLesson(lessonId);
  refresh(lessonId);
  return { ...res, pageIds: saved.pageIds, questionIds: saved.questionIds, savedTo: 'live' };
}
