// Server-only: uses next/headers cookies(); import from server actions and server components only.
import { cookies } from 'next/headers';
import { OTP_RESEND_SECONDS, OTP_TTL_SECONDS, secondsLeft } from './otp';

/**
 * Remembers which email the reset code went to, and when, between the forgot-password page,
 * the OTP page and "ส่งอีกครั้ง". httpOnly, so page scripts cannot read the address.
 * Not signed: editing it only changes the app's own 3-minute window for your own attempts;
 * Supabase still checks the code against the email and expires it on its own clock.
 */
const COOKIE = 'fp_reset_otp';

export type ResetOtp = { email: string; sentAt: number };

export async function readResetOtp(): Promise<ResetOtp | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ResetOtp>;
    if (typeof v.email !== 'string' || !v.email || typeof v.sentAt !== 'number' || !Number.isFinite(v.sentAt)) return null;
    return { email: v.email, sentAt: v.sentAt };
  } catch {
    return null;
  }
}

export async function writeResetOtp(email: string, sentAt = Date.now()): Promise<void> {
  (await cookies()).set(COOKIE, JSON.stringify({ email, sentAt }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  });
}

export async function clearResetOtp(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Seconds left on the code and on the resend cooldown for the current request, or null when no code was asked for. */
export async function readResetOtpWindow(): Promise<{ expiresIn: number; resendIn: number } | null> {
  const otp = await readResetOtp();
  if (!otp) return null;
  const now = Date.now();
  return {
    expiresIn: secondsLeft(otp.sentAt, OTP_TTL_SECONDS, now),
    resendIn: secondsLeft(otp.sentAt, OTP_RESEND_SECONDS, now),
  };
}
