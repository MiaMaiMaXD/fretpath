'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/data/admin';
import { errorCodeFrom, thaiError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

export type RoleResult = { ok: boolean; message?: string };

export async function setUserRole(userId: string, role: 'member' | 'admin'): Promise<RoleResult> {
  await requireAdmin();
  if (role !== 'member' && role !== 'admin') return { ok: false, message: thaiError('UNKNOWN') };
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_user_role', { p_user: userId, p_role: role });
  if (error) return { ok: false, message: thaiError(errorCodeFrom(error)) };
  revalidatePath('/admin/learners');
  revalidatePath('/admin');
  return { ok: true };
}
