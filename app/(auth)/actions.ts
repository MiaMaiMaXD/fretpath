'use server';

import { redirect } from 'next/navigation';
import type { ActionState } from '@/lib/action-state';
import { errorCodeFrom, thaiError } from '@/lib/errors';
import { safeNextPath } from '@/lib/safe-next';
import { siteUrl } from '@/lib/site-url';
import { createClient } from '@/lib/supabase/server';
import { validateCredentials } from '@/lib/validation';

const str = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
};

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = str(formData, 'email').trim();
  const password = str(formData, 'password');
  const fieldErrors = validateCredentials({ email, password });
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors, values: { email } };

  // Created inside the action so the PKCE code-verifier cookie is set on this response.
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/dashboard` },
  });
  if (error) return { ok: false, message: thaiError(errorCodeFrom(error)), values: { email } };
  return { ok: true, message: 'เราส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว' };
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = str(formData, 'email').trim();
  const password = str(formData, 'password');
  const next = safeNextPath(str(formData, 'next'));
  if (!email || !password) return { ok: false, message: thaiError('INVALID_CREDENTIALS'), values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const code = errorCodeFrom(error);
    // Unknown user and wrong password must look identical.
    return { ok: false, message: thaiError(code === 'UNKNOWN' ? 'INVALID_CREDENTIALS' : code), values: { email } };
  }
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = str(formData, 'email').trim();
  const fieldErrors = validateCredentials({ email, password: '12345678' });
  if (fieldErrors.email) return { ok: false, fieldErrors: { email: fieldErrors.email }, values: { email } };

  const supabase = await createClient();
  // Errors are deliberately ignored so the response never reveals whether the account exists.
  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
    });
  } catch {
    // ignored on purpose
  }
  return { ok: true, message: 'ถ้ามีบัญชีนี้ เราได้ส่งลิงก์ไปแล้ว' };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = str(formData, 'password');
  const fieldErrors = validateCredentials({ email: 'a@b.co', password });
  if (fieldErrors.password) return { ok: false, fieldErrors: { password: fieldErrors.password } };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: thaiError(errorCodeFrom(error)) };
  redirect('/dashboard');
}
