'use server';

import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/action-state';
import { errorCodeFrom, thaiError } from '@/lib/errors';
import { isOwnAvatarUrl } from '@/lib/avatar';
import { createClient } from '@/lib/supabase/server';
import { validateProfile } from '@/lib/validation';

const str = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
};

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const displayName = str(formData, 'displayName').trim();
  const weeklyGoalMinutes = str(formData, 'weeklyGoalMinutes').trim();
  const values = { displayName, weeklyGoalMinutes };
  const fieldErrors = validateProfile({ displayName, weeklyGoalMinutes });
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors, values };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: thaiError('NOT_AUTHENTICATED'), values };

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, weekly_goal_minutes: Number(weeklyGoalMinutes) })
    .eq('id', auth.user.id);
  if (error) return { ok: false, message: thaiError(errorCodeFrom(error)), values };

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { ok: true, message: 'บันทึกแล้ว', values };
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
