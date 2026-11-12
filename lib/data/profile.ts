import { redirect } from 'next/navigation';
import { loginMethods } from '@/lib/profile-ui';
import { createClient } from '@/lib/supabase/server';

export type MyProfile = {
  id: string;
  displayName: string;
  weeklyGoalMinutes: number;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  /** Sign-in methods on the account: password (email identity) and/or Google. */
  login: { password: boolean; google: boolean };
};

export async function getMyProfile(): Promise<MyProfile> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, weekly_goal_minutes, avatar_url, created_at')
    .eq('id', auth.user.id)
    .single();
  if (error || !data) throw new Error('PROFILE_NOT_FOUND');

  return {
    id: data.id,
    displayName: data.display_name ?? '',
    weeklyGoalMinutes: data.weekly_goal_minutes,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
    email: auth.user.email ?? '',
    login: loginMethods(auth.user.app_metadata),
  };
}
