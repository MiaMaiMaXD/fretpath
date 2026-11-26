import { createClient } from '@/lib/supabase/server';
import { bangkokWeekRange } from '@/lib/bangkok';
import { getPath } from '@/lib/data/path';
import { getMyProfile, type MyProfile } from '@/lib/data/profile';
import { listMyPracticeLogs, myPracticeTotals, type PracticeLog } from '@/lib/data/practice';
import type { PathLesson } from '@/lib/path-state';

export type Dashboard = {
  courseSlug: string;
  lessons: PathLesson[];
  profile: MyProfile;
  recentLogs: PracticeLog[];
  totals: { sessions: number; minutes: number };
  weekLogs: { practicedOn: string; minutes: number }[];
};

/** Returns null when the learner is not enrolled in any course. */
export async function getDashboard(): Promise<Dashboard | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const [path, profile, recentLogs, totals, weekRes] = await Promise.all([
    getPath(),
    getMyProfile(),
    listMyPracticeLogs(5),
    myPracticeTotals(),
    supabase
      .from('practice_logs')
      .select('practiced_on, minutes')
      .eq('user_id', auth.user?.id ?? '')
      .gte('practiced_on', bangkokWeekRange().start),
  ]);
  if (weekRes.error) throw new Error(weekRes.error.message);
  if (!path) return null;
  return {
    courseSlug: path.course.slug,
    lessons: path.lessons,
    profile,
    recentLogs,
    totals,
    weekLogs: (weekRes.data ?? []).map((r) => ({ practicedOn: r.practiced_on, minutes: r.minutes })),
  };
}
