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
