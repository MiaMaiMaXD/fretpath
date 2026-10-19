export type ErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'LESSON_LOCKED'
  | 'INVALID_ANSWERS'
  | 'LESSON_INCOMPLETE'
  | 'LESSON_HAS_LEARNERS'
  | 'FUTURE_DATE'
  | 'NOT_ADMIN'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'NETWORK'
  | 'UNKNOWN';

const MESSAGES: Record<ErrorCode, string> = {
  NOT_AUTHENTICATED: 'กรุณาเข้าสู่ระบบก่อน',
  LESSON_LOCKED: 'บทเรียนนี้ยังล็อกอยู่',
  INVALID_ANSWERS: 'กรุณาตอบให้ครบทุกข้อ',
  LESSON_INCOMPLETE: 'บทเรียนนี้ยังไม่พร้อมให้ทำแบบทดสอบ',
  LESSON_HAS_LEARNERS: 'ลบบทนี้ไม่ได้เพราะมีผู้เรียนแล้ว',
  FUTURE_DATE: 'วันที่ต้องไม่เป็นวันในอนาคต',
  NOT_ADMIN: 'เฉพาะผู้ดูแลระบบเท่านั้น',
  INVALID_CREDENTIALS: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  EMAIL_NOT_CONFIRMED: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
  NETWORK: 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่',
  UNKNOWN: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
};

function isErrorCode(code: string): code is ErrorCode {
  return Object.hasOwn(MESSAGES, code);
}

export function thaiError(code: string): string {
  return isErrorCode(code) ? MESSAGES[code] : MESSAGES.UNKNOWN;
}

const AUTH_CODES: Record<string, ErrorCode> = {
  invalid_credentials: 'INVALID_CREDENTIALS',
  email_not_confirmed: 'EMAIL_NOT_CONFIRMED',
};

export function errorCodeFrom(e: { message?: string; code?: string } | null): ErrorCode {
  if (!e) return 'UNKNOWN';
  if (e.code && Object.hasOwn(AUTH_CODES, e.code)) return AUTH_CODES[e.code];
  if (e.message && isErrorCode(e.message)) return e.message;
  return 'UNKNOWN';
}
