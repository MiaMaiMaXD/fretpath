import { createClient } from '@/lib/supabase/server';

export { ACTIVITIES, FEELINGS, activityLabel, feelingLabel, practiceTitle } from '@/lib/practice-activities';

export type PracticeLog = {
  id: string;
  practicedOn: string;
  minutes: number;
  activity: string;
  topic: string | null;
  feeling: string | null;
  note: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
};

export async function listMyPracticeLogs(limit = 50): Promise<PracticeLog[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('practice_logs')
    .select('id, practiced_on, minutes, activity, topic, feeling, note, lesson_id, lessons(title)')
    .eq('user_id', auth.user.id)
    .order('practiced_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const lesson = Array.isArray(r.lessons) ? r.lessons[0] : r.lessons;
    return {
      id: r.id,
      practicedOn: r.practiced_on,
      minutes: r.minutes,
      activity: r.activity,
      topic: r.topic,
      feeling: r.feeling,
      note: r.note,
      lessonId: r.lesson_id,
      lessonTitle: lesson?.title ?? null,
    };
  });
}

/** Lifetime totals for the history header (not limited to the rows shown). */
export async function myPracticeTotals(): Promise<{ sessions: number; minutes: number }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { sessions: 0, minutes: 0 };
  const { data, error } = await supabase.from('practice_logs').select('minutes').eq('user_id', auth.user.id);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return { sessions: rows.length, minutes: rows.reduce((s, r) => s + r.minutes, 0) };
}
