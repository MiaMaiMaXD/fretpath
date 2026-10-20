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

export function validateCredentials(input: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_RE.test(input.email)) errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
  if (len(input.password) < 8) errors.password = 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร';
  return errors;
}

export function validateProfile(input: { displayName: string; weeklyGoalMinutes: string }): FieldErrors {
  const errors: FieldErrors = {};
  const n = len(input.displayName);
  if (n < 1 || n > 50) errors.displayName = 'ชื่อที่แสดงต้องยาว 1–50 ตัวอักษร';
  if (!intInRange(input.weeklyGoalMinutes, 0, 5000)) errors.weeklyGoalMinutes = 'เป้าหมายต้องเป็นจำนวนเต็ม 0–5000 นาที';
  return errors;
}

export function validatePractice(
  input: { practicedOn: string; minutes: string; activity: string; note: string },
  today: string,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!isRealDate(input.practicedOn)) errors.practicedOn = 'กรุณาเลือกวันที่';
  else if (input.practicedOn > today) errors.practicedOn = thaiError('FUTURE_DATE');
  if (!intInRange(input.minutes, 1, 600)) errors.minutes = 'จำนวนนาทีต้องเป็นจำนวนเต็ม 1–600';
  if (input.activity === '') errors.activity = 'กรุณาเลือกหัวข้อที่ฝึก';
  if (len(input.note) > 500) errors.note = 'บันทึกสั้นต้องไม่เกิน 500 ตัวอักษร';
  return errors;
}
