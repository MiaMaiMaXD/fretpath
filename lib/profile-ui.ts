// Pure helpers for the profile page (shared by the page, its client parts and unit tests).

import { DISPLAY_NAME_MAX, WEEKLY_GOAL_MAX } from './validation';

/** Cut a name to DISPLAY_NAME_MAX code points (what the server and the DB count). */
export function clampName(s: string): string {
  const chars = [...s];
  return chars.length > DISPLAY_NAME_MAX ? chars.slice(0, DISPLAY_NAME_MAX).join('') : s;
}

/** Keep digits only, drop leading zeros (but keep a lone 0), at most 4 digits. */
export function goalDigits(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 4);
}

/** Client-side message for the goal box, or '' when the value can be saved. */
export function goalInputError(value: string): string {
  if (value === '') return 'กรุณาใส่จำนวนนาที (ใส่ 0 ถ้าไม่ตั้งเป้าหมาย)';
  if (Number(value) > WEEKLY_GOAL_MAX) return `ใส่ได้ไม่เกิน ${WEEKLY_GOAL_MAX} นาทีต่อสัปดาห์`;
  return '';
}

/**
 * Which sign-in methods the account has, from Supabase `app_metadata`.
 * A password row only makes sense for accounts that have the email (password) identity.
 */
export function loginMethods(appMetadata: Record<string, unknown> | null | undefined): { password: boolean; google: boolean } {
  const list = Array.isArray(appMetadata?.providers)
    ? (appMetadata.providers as unknown[]).filter((p): p is string => typeof p === 'string')
    : typeof appMetadata?.provider === 'string'
      ? [appMetadata.provider]
      : [];
  return { password: list.includes('email'), google: list.includes('google') };
}

/** "20 ต.ค. 2569" in Bangkok time. */
export function thaiJoinDate(iso: string): string {
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(
    new Date(iso),
  );
}
