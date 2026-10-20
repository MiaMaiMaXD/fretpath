import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Server-side admin check for every admin page/action (defence in depth behind proxy.ts and RLS). */
export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login?next=%2Fadmin');
  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  if (error) throw new Error(error.message);
  if (!isAdmin) redirect('/dashboard');
  return { userId: data.user.id };
}

export type CourseCount = { id: string; slug: string; title: string; published: number; draft: number };
export type AdminOverview = { courses: CourseCount[]; learnerCount: number };

export async function getAdminOverview(): Promise<AdminOverview> {
  await requireAdmin();
  const supabase = await createClient();
  const [courses, lessons, learners] = await Promise.all([
    supabase.from('courses').select('id, slug, title').order('sort_order'),
    supabase.from('lessons').select('course_id, status'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'member'),
  ]);
  if (courses.error) throw new Error(courses.error.message);
  if (lessons.error) throw new Error(lessons.error.message);
  if (learners.error) throw new Error(learners.error.message);
  return {
    courses: (courses.data ?? []).map((c) => {
      const ls = (lessons.data ?? []).filter((l) => l.course_id === c.id);
      const published = ls.filter((l) => l.status === 'published').length;
      return { ...c, published, draft: ls.length - published };
    }),
    learnerCount: learners.count ?? 0,
  };
}
