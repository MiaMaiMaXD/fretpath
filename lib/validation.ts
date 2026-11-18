import { thaiError } from './errors';

export type FieldErrors = Partial<Record<string, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGITS_RE = /^\d+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const len = (s: string) => [...s].length;

function intInRange(s: string, min: number, max: number): boolean {
  if (!DIGITS_RE.test(s)) return false;
  const n = Number(s);
  return Number.isSafeInteger(n) && n >= min && n <= max;
}

function isRealDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Same email shape check the server uses; safe to run in the browser while the user types. */
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function validateCredentials(input: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_RE.test(input.email)) errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
  if (len(input.password) < 8) errors.password = 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร';
  return errors;
}

export const PASSWORD_MISMATCH = 'รหัสผ่านไม่ตรงกัน';
export const PASSWORD_REQUIRED = 'กรุณากรอกรหัสผ่าน';

/**
 * Rules for a NEW password (reset page), checked in order so only the first problem shows:
 * no whitespace, at least 8 characters, and upper-case, lower-case and a digit.
 */
export function newPasswordError(password: string): string | undefined {
  if (password === '') return PASSWORD_REQUIRED;
  if (/\s/.test(password)) return 'รหัสผ่านห้ามมีช่องว่าง';
  if (len(password) < 8) return 'รหัสผ่านควรมีอย่างน้อย 8 ตัว';
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'รหัสผ่านควรมีตัวอักษรพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลข';
  }
  return undefined;
}

export function validateNewPassword(input: { password: string; confirm: string }): FieldErrors {
  const errors: FieldErrors = {};
  const passwordError = newPasswordError(input.password);
  if (passwordError) errors.password = passwordError;
  if (input.confirm !== input.password) errors.confirm = PASSWORD_MISMATCH;
  return errors;
}

export const DISPLAY_NAME_MAX = 50;
export const WEEKLY_GOAL_MAX = 5000;

/** Length the way the server and the DB count it: code points, so Thai vowels and tone marks count too. */
export const nameLength = len;

export function validateDisplayName(displayName: string): string | undefined {
  const n = len(displayName);
  if (n < 1 || n > DISPLAY_NAME_MAX) return `ชื่อที่แสดงต้องยาว 1–${DISPLAY_NAME_MAX} ตัวอักษร`;
}

export function validateWeeklyGoal(weeklyGoalMinutes: string): string | undefined {
  if (!intInRange(weeklyGoalMinutes, 0, WEEKLY_GOAL_MAX)) return `เป้าหมายต้องเป็นจำนวนเต็ม 0–${WEEKLY_GOAL_MAX} นาที`;
}

export function validateProfile(input: { displayName: string; weeklyGoalMinutes: string }): FieldErrors {
  const errors: FieldErrors = {};
  const name = validateDisplayName(input.displayName);
  if (name) errors.displayName = name;
  const goal = validateWeeklyGoal(input.weeklyGoalMinutes);
  if (goal) errors.weeklyGoalMinutes = goal;
  return errors;
}

export function validatePractice(
  input: { practicedOn: string; minutes: string; activity: string; note: string; topic?: string },
  today: string,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!isRealDate(input.practicedOn)) errors.practicedOn = 'กรุณาเลือกวันที่';
  else if (input.practicedOn > today) errors.practicedOn = thaiError('FUTURE_DATE');
  if (!intInRange(input.minutes, 1, 600)) errors.minutes = 'จำนวนนาทีต้องเป็นจำนวนเต็ม 1–600';
  if (input.activity === '') errors.activity = 'กรุณาเลือกหมวดที่ฝึก';
  if (len(input.topic ?? '') > 120) errors.topic = 'หัวข้อต้องไม่เกิน 120 ตัวอักษร';
  if (len(input.note) > 500) errors.note = 'บันทึกช่วยจำต้องไม่เกิน 500 ตัวอักษร';
  return errors;
}
