'use server';

import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/action-state';
import { errorCodeFrom, thaiError } from '@/lib/errors';
import { isOwnAvatarUrl } from '@/lib/avatar';
import { createClient } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/site-url';
import { validateDisplayName, validateWeeklyGoal } from '@/lib/validation';

async function saveProfileField(update: { display_name: string } | { weekly_goal_minutes: number }): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: thaiError('NOT_AUTHENTICATED') };

  const { error } = await supabase.from('profiles').update(update).eq('id', auth.user.id);
  if (error) return { ok: false, message: thaiError(errorCodeFrom(error)) };

  // The name shows in the header menu of every learner page; the goal drives the dashboard and practice bars.
  revalidatePath('/', 'layout');
  return { ok: true, message: 'บันทึกแล้ว' };
}

export async function updateDisplayName(raw: string): Promise<ActionState> {
  const displayName = typeof raw === 'string' ? raw.trim() : '';
  const err = validateDisplayName(displayName);
  if (err) return { ok: false, message: err, fieldErrors: { displayName: err } };
  return saveProfileField({ display_name: displayName });
}

export async function updateWeeklyGoal(raw: string): Promise<ActionState> {
  const value = typeof raw === 'string' ? raw.trim() : '';
  const err = validateWeeklyGoal(value);
  if (err) return { ok: false, message: err, fieldErrors: { weeklyGoalMinutes: err } };
  return saveProfileField({ weekly_goal_minutes: Number(value) });
}

/** Send a reset link to the signed-in user's own email (never an address from the client). */
export async function sendMyPasswordReset(): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email;
  if (!email) return { ok: false, message: thaiError('NOT_AUTHENTICATED') };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) return { ok: false, message: thaiError(errorCodeFrom(error)) };
  return { ok: true, message: 'ส่งลิงก์แล้ว — เช็กอีเมลของคุณ' };
}

export async function updateAvatar(url: string | null): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: thaiError('NOT_AUTHENTICATED') };
  const uid = auth.user.id;

  if (url !== null) {
    if (typeof url !== 'string' || !isOwnAvatarUrl(url, uid, process.env.NEXT_PUBLIC_SUPABASE_URL)) {
      return { ok: false, message: thaiError('INVALID_AVATAR') };
    }
  } else {
    const list = await supabase.storage.from('avatars').list(uid);
    const names = (list.data ?? []).map((f) => `${uid}/${f.name}`);
    if (names.length > 0) await supabase.storage.from('avatars').remove(names);
  }

  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', uid);
  if (error) return { ok: false, message: thaiError(errorCodeFrom(error)) };

  revalidatePath('/', 'layout');
  return { ok: true, message: 'บันทึกแล้ว' };
}
