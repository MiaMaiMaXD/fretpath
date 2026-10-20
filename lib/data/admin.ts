import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/data/paging';
import { bangkokWeekRange } from '@/lib/bangkok';
import { toPathLessons } from '@/lib/path-state';
import { averageBestScore, lessonsProgress, weeklyMinutes } from '@/lib/stats';

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

export type Learner = {
  id: string;
  displayName: string;
  role: 'member' | 'admin';
  completed: number;
  /** null when the learner is not enrolled in any course. */
  total: number | null;
  avgBestScore: number | null;
  weekMinutes: number;
  lastPracticedOn: string | null;
};

/** All profiles with progress, aggregated in memory from a few admin-RLS queries (no N+1). */
export async function listLearners(): Promise<Learner[]> {
  await requireAdmin();
  const supabase = await createClient();
  const week = bangkokWeekRange();
  const [profiles, progress, logs, enrollments, lessons, lastPractice] = await Promise.all([
    fetchAll((f, t) => supabase.from('profiles').select('id, display_name, role').order('id').range(f, t)),
    fetchAll((f, t) =>
      supabase.from('lesson_progress').select('user_id, lesson_id, status, best_score').order('user_id').order('lesson_id').range(f, t),
    ),
    fetchAll((f, t) =>
      supabase
        .from('practice_logs')
        .select('id, user_id, practiced_on, minutes')
        .gte('practiced_on', week.start)
        .lte('practiced_on', week.end)
        .order('id')
        .range(f, t),
    ),
    fetchAll((f, t) => supabase.from('enrollments').select('user_id, courses(id, sort_order)').order('user_id').order('course_id').range(f, t)),
    supabase.from('lessons').select('id, slug, title, summary, sort_order, pass_score, course_id').eq('status', 'published'),
    fetchAll((f, t) => supabase.rpc('admin_last_practice').order('user_id').range(f, t)),
  ]);
  if (lessons.error) throw new Error(lessons.error.message);
  const lastBy = new Map(lastPractice.map((r) => [r.user_id, r.last_practiced_on]));

  const lessonsByCourse = new Map<string, NonNullable<typeof lessons.data>>();
  for (const l of lessons.data ?? []) {
    const list = lessonsByCourse.get(l.course_id) ?? [];
    list.push(l);
    lessonsByCourse.set(l.course_id, list);
  }
  // First enrolled course by sort_order, same rule as getPath.
  const firstCourse = new Map<string, { id: string; sort: number }>();
  for (const e of enrollments) {
    const c = e.courses;
    if (!c || Array.isArray(c)) continue;
    const cur = firstCourse.get(e.user_id);
    if (!cur || c.sort_order < cur.sort) firstCourse.set(e.user_id, { id: c.id, sort: c.sort_order });
  }
  const group = <T extends { user_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.user_id, [...(m.get(r.user_id) ?? []), r]);
    return m;
  };
  const progressBy = group(progress);
  const logsBy = group(logs);

  return profiles
    .map((p): Learner => {
      const course = firstCourse.get(p.id);
      const ul = logsBy.get(p.id) ?? [];
      const base = {
        id: p.id,
        displayName: p.display_name ?? '',
        role: p.role,
        weekMinutes: weeklyMinutes(
          ul.map((l) => ({ practicedOn: l.practiced_on, minutes: l.minutes })),
          week,
        ),
        lastPracticedOn: lastBy.get(p.id) ?? null,
      };
      if (!course) return { ...base, completed: 0, total: null, avgBestScore: null };
      const path = toPathLessons(lessonsByCourse.get(course.id) ?? [], progressBy.get(p.id) ?? []);
      const { completed, total } = lessonsProgress(path);
      return { ...base, completed, total, avgBestScore: averageBestScore(path) };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'th'));
}
