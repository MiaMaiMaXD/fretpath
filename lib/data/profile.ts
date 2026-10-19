import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type MyProfile = { id: string; displayName: string; weeklyGoalMinutes: number; email: string };

export async function getMyProfile(): Promise<MyProfile> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, weekly_goal_minutes')
    .eq('id', auth.user.id)
    .single();
  if (error || !data) throw new Error('PROFILE_NOT_FOUND');

  return {
    id: data.id,
    displayName: data.display_name ?? '',
    weeklyGoalMinutes: data.weekly_goal_minutes,
    email: auth.user.email ?? '',
  };
}
