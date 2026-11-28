import { marked } from 'marked';
import type { EditorPage } from '@/lib/admin/lesson-pages';
import type { QuizQuestionDraft } from '@/lib/admin/quiz-editor';
import { parseDraft, type EditorState } from '@/lib/admin/editor-state';
import { isChordName, type ChordName } from '@/lib/audio/chords';
import { sanitizeLessonHtml } from '@/lib/html';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './admin';

export type AdminCourse = { id: string; slug: string; title: string };
export type AdminLessonRow = {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  sortOrder: number;
  passScore: number;
  questionCount: number;
  sectionId: string | null;
};

/** Courses ordered by sort_order; the first one is the default for the lessons admin. */
export async function getAdminCourses(): Promise<AdminCourse[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from('courses').select('id, slug, title').order('sort_order');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAdminLessons(courseId: string): Promise<AdminLessonRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('id, slug, title, status, sort_order, pass_score, section_id, quiz_questions(count)')
    .eq('course_id', courseId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    status: l.status,
    sortOrder: l.sort_order,
    passScore: l.pass_score,
    questionCount: l.quiz_questions[0]?.count ?? 0,
    sectionId: l.section_id,
  }));
}

export type AdminSection = { id: string; title: string; sortOrder: number };

/** A course's sections ("ช่วง") in display order. */
export async function getAdminSections(courseId: string): Promise<AdminSection[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('course_sections')
    .select('id, title, sort_order')
    .eq('course_id', courseId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({ id: s.id, title: s.title, sortOrder: s.sort_order }));
}

export type AdminQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  /** Choice ids aligned with `choices`. */
  choiceIds: string[];
  /** Index into `choices` of the correct one, or null when the key is missing. */
  correctIndex: number | null;
  explanation: string;
  kind: 'choice' | 'practical';
  /** practical questions: the chords to play */
  chords: ChordName[];
};

/** Questions of a lesson in display order, with their choices, answer key and explanation. */
export async function getAdminQuestions(lessonId: string): Promise<AdminQuestion[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('id, prompt, kind, practical_chords, quiz_choices(id, text, sort_order, created_at), quiz_answer_keys(correct_choice_id, explanation)')
    .eq('lesson_id', lessonId)
    .order('sort_order')
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map((q) => {
    const choices = [...q.quiz_choices].sort(
      (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
    );
    const key = Array.isArray(q.quiz_answer_keys) ? q.quiz_answer_keys[0] : q.quiz_answer_keys;
    const idx = key ? choices.findIndex((c) => c.id === key.correct_choice_id) : -1;
    return {
      id: q.id,
      prompt: q.prompt,
      choices: choices.map((c) => c.text),
      choiceIds: choices.map((c) => c.id),
      correctIndex: idx >= 0 ? idx : null,
      explanation: key?.explanation ?? '',
      kind: q.kind === 'practical' ? 'practical' : 'choice',
      chords: q.practical_chords.filter(isChordName),
    };
  });
}

export type AdminLessonEditor = {
  id: string;
  courseId: string;
  slug: string;
  /** 1-based position in the course (drafts included), as on the admin list. */
  no: number;
  title: string;
  summary: string;
  status: 'draft' | 'published';
  chords: ChordName[];
  pages: EditorPage[];
  passScore: number;
  maxAttempts: number | null;
  questions: QuizQuestionDraft[];
  /** The saved, not-yet-live draft of a published lesson (null when there is none). */
  draft: EditorState | null;
};

/** Everything the lesson editor needs. Legacy markdown pages are converted to HTML for the editor. */
export async function getAdminLessonEditor(id: string): Promise<AdminLessonEditor | null> {
  await requireAdmin();
  const supabase = await createClient();
  const lesson = await supabase
    .from('lessons')
    .select('id, course_id, slug, title, summary, status, example_chords, pass_score, quiz_max_attempts')
    .eq('id', id)
    .maybeSingle();
  if (lesson.error) throw new Error(lesson.error.message);
  if (!lesson.data) return null;
  const l = lesson.data;
  const [pages, order, questions, draft] = await Promise.all([
    supabase.from('lesson_pages').select('id, kind, title, body_html, body_md, video_url').eq('lesson_id', id).order('sort_order'),
    supabase.from('lessons').select('id').eq('course_id', l.course_id).order('sort_order'),
    getAdminQuestions(id),
    supabase.from('lesson_drafts').select('data').eq('lesson_id', id).maybeSingle(),
  ]);
  if (draft.error) throw new Error(draft.error.message);
  if (pages.error) throw new Error(pages.error.message);
  if (order.error) throw new Error(order.error.message);
  return {
    id: l.id,
    courseId: l.course_id,
    slug: l.slug,
    no: (order.data ?? []).findIndex((x) => x.id === id) + 1,
    title: l.title,
    summary: l.summary ?? '',
    status: l.status,
    chords: l.example_chords.filter(isChordName),
    pages: (pages.data ?? []).map((p) => ({
      key: p.id,
      id: p.id,
      kind: p.kind as EditorPage['kind'],
      title: p.title,
      html:
        p.body_html ??
        (p.body_md ? sanitizeLessonHtml(marked.parse(p.body_md, { async: false, gfm: true })) : ''),
      videoUrl: p.video_url ?? '',
    })),
    passScore: l.pass_score,
    maxAttempts: l.quiz_max_attempts,
    questions: questions.map((q) => ({
      key: q.id,
      id: q.id,
      kind: q.kind,
      prompt: q.prompt,
      choices: q.choices,
      choiceIds: q.choiceIds,
      correct: q.correctIndex,
      explanation: q.explanation,
      chords: q.chords,
    })),
    draft: draft.data ? parseDraft(draft.data.data) : null,
  };
}
