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
    .select('id, slug, title, status, sort_order, pass_score, quiz_questions(count)')
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
  }));
}

export type AdminLessonDetail = {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  summary: string;
  status: 'draft' | 'published';
  passScore: number;
  contentMd: string;
  videoUrl: string;
  /** Question ids in sort_order, used to label publish problems as "ข้อ N". */
  questionIds: string[];
};

export async function getAdminLesson(id: string): Promise<AdminLessonDetail | null> {
  await requireAdmin();
  const supabase = await createClient();
  const [lesson, content, questions] = await Promise.all([
    supabase.from('lessons').select('id, course_id, slug, title, summary, status, pass_score').eq('id', id).maybeSingle(),
    supabase.from('lesson_contents').select('content_md, video_url').eq('lesson_id', id).maybeSingle(),
    supabase.from('quiz_questions').select('id').eq('lesson_id', id).order('sort_order').order('created_at'),
  ]);
  if (lesson.error) throw new Error(lesson.error.message);
  if (content.error) throw new Error(content.error.message);
  if (questions.error) throw new Error(questions.error.message);
  if (!lesson.data) return null;
  const l = lesson.data;
  return {
    id: l.id,
    courseId: l.course_id,
    slug: l.slug,
    title: l.title,
    summary: l.summary ?? '',
    status: l.status,
    passScore: l.pass_score,
    contentMd: content.data?.content_md ?? '',
    videoUrl: content.data?.video_url ?? '',
    questionIds: (questions.data ?? []).map((q) => q.id),
  };
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
};

/** Questions of a lesson in display order, with their choices, answer key and explanation. */
export async function getAdminQuestions(lessonId: string): Promise<AdminQuestion[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('id, prompt, quiz_choices(id, text, sort_order, created_at), quiz_answer_keys(correct_choice_id, explanation)')
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
    };
  });
}
