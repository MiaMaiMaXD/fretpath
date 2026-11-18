/** Password-reset OTP rules shared by the server actions and the OTP page (no server-only imports). */

export const OTP_LENGTH = 6;
/** The app accepts a code for 3 minutes after it was sent (Supabase's own limit is longer; see docs/deploy/supabase.md). */
export const OTP_TTL_SECONDS = 180;
/** "ส่งอีกครั้ง" unlocks this long after the last send. */
export const OTP_RESEND_SECONDS = 30;

export const OTP_INVALID_MESSAGE = 'รหัส OTP ไม่ถูกต้อง';
export const OTP_EXPIRED_MESSAGE = 'รหัส OTP หมดอายุ กรุณากดส่งอีกครั้ง';

export function isOtpCode(s: string): boolean {
  return s.length === OTP_LENGTH && /^[0-9]+$/.test(s);
}

/** Whole seconds left of a `total`-second window that started at `sentAt` (ms), never below 0. */
export function secondsLeft(sentAt: number, total: number, now: number): number {
  return Math.max(0, Math.ceil((sentAt + total * 1000 - now) / 1000));
}

/** 150 → "2:30" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Digits from typed or pasted text, at most OTP_LENGTH of them. */
export function otpDigits(text: string): string[] {
  return text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('').filter(Boolean);
}
