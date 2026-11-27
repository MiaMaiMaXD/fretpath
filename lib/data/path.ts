import { createClient } from '@/lib/supabase/server';
import type { SectionInfo } from '@/lib/path-frets';
import { toPathLessons, type PathLesson } from '@/lib/path-state';

export type LearningPath = { course: { slug: string; title: string }; lessons: PathLesson[]; sections: SectionInfo[] };

export async function getPath(): Promise<LearningPath | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: enrollments, error: eErr } = await supabase
    .from('enrollments')
    .select('courses(id, slug, title, sort_order)')
    .eq('user_id', auth.user.id);
  if (eErr) throw new Error(eErr.message);

  const courses = (enrollments ?? [])
    .map((e) => e.courses)
    .filter((c): c is NonNullable<typeof c> => c !== null && !Array.isArray(c))
    .sort((a, b) => a.sort_order - b.sort_order);
  const course = courses[0];
  if (!course) return null;

  const [lessonsRes, progressRes, sectionsRes] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, slug, title, summary, sort_order, pass_score, section_id')
      .eq('course_id', course.id)
      .eq('status', 'published')
      .order('sort_order'),
    supabase.from('lesson_progress').select('lesson_id, status, best_score').eq('user_id', auth.user.id),
    supabase.from('course_sections').select('id, title').eq('course_id', course.id).order('sort_order'),
  ]);
  if (lessonsRes.error) throw new Error(lessonsRes.error.message);
  if (progressRes.error) throw new Error(progressRes.error.message);
  if (sectionsRes.error) throw new Error(sectionsRes.error.message);

  return {
    course: { slug: course.slug, title: course.title },
    lessons: toPathLessons(lessonsRes.data ?? [], progressRes.data ?? []),
    sections: sectionsRes.data ?? [],
  };
}
