import { createClient } from '@/lib/supabase/server';
import { bangkokLastDays, bangkokWeekRange } from '@/lib/bangkok';
import { getPath } from '@/lib/data/path';
import { getMyProfile, type MyProfile } from '@/lib/data/profile';
import { listMyPracticeLogs, type PracticeLog } from '@/lib/data/practice';
import type { PathLesson } from '@/lib/path-state';

export type Dashboard = {
  lessons: PathLesson[];
  profile: MyProfile;
  recentLogs: PracticeLog[];
  weekLogs: { practicedOn: string; minutes: number }[];
};

/** Returns null when the learner is not enrolled in any course. */
export async function getDashboard(): Promise<Dashboard | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const since = [bangkokWeekRange().start, bangkokLastDays(7)[0]].sort()[0];
  const [path, profile, recentLogs, weekRes] = await Promise.all([
    getPath(),
    getMyProfile(),
    listMyPracticeLogs(5),
    supabase
      .from('practice_logs')
      .select('practiced_on, minutes')
      .eq('user_id', auth.user?.id ?? '')
      .gte('practiced_on', since),
  ]);
  if (weekRes.error) throw new Error(weekRes.error.message);
  if (!path) return null;
  return {
    lessons: path.lessons,
    profile,
    recentLogs,
    weekLogs: (weekRes.data ?? []).map((r) => ({ practicedOn: r.practiced_on, minutes: r.minutes })),
  };
}
