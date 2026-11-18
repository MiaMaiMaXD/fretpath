'use server';

import { redirect } from 'next/navigation';
import type { ActionState } from '@/lib/action-state';
import { errorCodeFrom, thaiError } from '@/lib/errors';
import { safeNextPath } from '@/lib/safe-next';
import { siteUrl } from '@/lib/site-url';
import {
  OTP_EXPIRED_MESSAGE,
  OTP_INVALID_MESSAGE,
  OTP_RESEND_SECONDS,
  OTP_TTL_SECONDS,
  isOtpCode,
  secondsLeft,
} from '@/lib/otp';
import { type OtpKind, clearOtp, readOtp, writeOtp } from '@/lib/reset-otp';
import { createClient } from '@/lib/supabase/server';
import { validateCredentials, validateNewPassword, validateSignup } from '@/lib/validation';

const str = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
};

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = str(formData, 'email').trim();
  const password = str(formData, 'password');
  const confirm = str(formData, 'confirm');
  const fieldErrors = validateSignup({ email, password, confirm });
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors, values: { email } };

  const supabase = await createClient();
  // The confirmation template shows a 6-digit {{ .Token }}. For an address that already has an account Supabase
  // answers the same way and sends nothing, so the page never reveals who is a member.
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const code = errorCodeFrom(error);
    // Only outages and rate limits are shown; anything else would hint at whether the account exists.
    if (code === 'RATE_LIMITED' || code === 'NETWORK') return { ok: false, code, message: thaiError(code), values: { email } };
  }
  await writeOtp('signup', email);
  redirect('/signup/verify');
}

/** Login with an unconfirmed account: email a fresh signup code and continue on the code page. */
export async function confirmPendingSignup(email: string): Promise<void> {
  const clean = email.trim();
  if (!clean) redirect('/signup');
  await sendCode('signup', clean);
  await writeOtp('signup', clean);
  redirect('/signup/verify');
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
    // Unknown user and wrong password must look identical; outages and rate limits keep their own message.
    const clientError = typeof error.status === 'number' && error.status >= 400 && error.status < 500;
    const shown = code === 'UNKNOWN' && clientError ? 'INVALID_CREDENTIALS' : code;
    return { ok: false, code: shown, message: thaiError(shown), values: { email } };
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

  await sendCode('reset', email);
  // Every valid address goes on to the OTP page, so the page never reveals whether the account exists.
  await writeOtp('reset', email);
  redirect('/forgot-password/verify');
}

/** Emails a 6-digit code: recovery for a reset, a fresh confirmation for a signup (both templates show {{ .Token }}). */
async function sendCode(kind: OtpKind, email: string): Promise<void> {
  const supabase = await createClient();
  // Errors are deliberately ignored so the response never reveals whether the account exists.
  try {
    if (kind === 'reset') await supabase.auth.resetPasswordForEmail(email);
    else await supabase.auth.resend({ type: 'signup', email });
  } catch {
    // ignored on purpose
  }
}

async function verifyCode(kind: OtpKind, formData: FormData): Promise<ActionState | null> {
  const token = str(formData, 'token');
  const otp = await readOtp(kind);
  if (!otp) return { ok: false, code: 'OTP_EXPIRED', message: OTP_EXPIRED_MESSAGE };
  if (!isOtpCode(token)) return { ok: false, code: 'OTP_INVALID', message: OTP_INVALID_MESSAGE };
  if (secondsLeft(otp.sentAt, OTP_TTL_SECONDS, Date.now()) === 0) {
    return { ok: false, code: 'OTP_EXPIRED', message: OTP_EXPIRED_MESSAGE };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: otp.email, token, type: kind === 'reset' ? 'recovery' : 'email' });
  if (error) {
    const code = errorCodeFrom(error);
    if (code === 'RATE_LIMITED' || code === 'NETWORK') return { ok: false, code, message: thaiError(code) };
    return { ok: false, code: 'OTP_INVALID', message: OTP_INVALID_MESSAGE };
  }
  await clearOtp(kind);
  return null;
}

async function resendCode(kind: OtpKind): Promise<{ ok: boolean; message?: string }> {
  const otp = await readOtp(kind);
  if (!otp) return { ok: false, message: OTP_EXPIRED_MESSAGE };
  const wait = secondsLeft(otp.sentAt, OTP_RESEND_SECONDS, Date.now());
  if (wait > 0) return { ok: false, message: `ส่งอีกครั้งได้ในอีก ${wait} วินาที` };
  await sendCode(kind, otp.email);
  await writeOtp(kind, otp.email);
  return { ok: true, message: 'ส่งรหัสใหม่แล้ว' };
}

export async function verifyResetOtp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const failed = await verifyCode('reset', formData);
  if (failed) return failed;
  redirect('/forgot-password/new-password');
}

export async function resendResetOtp(): Promise<{ ok: boolean; message?: string }> {
  return resendCode('reset');
}

export async function verifySignupOtp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const failed = await verifyCode('signup', formData);
  if (failed) return failed;
  // Verifying signs the new member in; sign out so the success page's "back to login" really opens /login.
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/signup/success');
}

export async function resendSignupOtp(): Promise<{ ok: boolean; message?: string }> {
  return resendCode('signup');
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = str(formData, 'password');
  const confirm = str(formData, 'confirm');
  const fieldErrors = validateNewPassword({ password, confirm });
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: thaiError(errorCodeFrom(error)) };
  // Sign out (every device) so the success page's "back to login" really opens /login with the new password.
  await supabase.auth.signOut();
  redirect('/forgot-password/success');
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl()}/auth/callback?next=/dashboard` },
  });
  if (error || !data.url) redirect('/login?error=link');
  redirect(data.url);
}
