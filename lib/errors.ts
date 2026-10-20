export type ErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'LESSON_LOCKED'
  | 'INVALID_ANSWERS'
  | 'LESSON_INCOMPLETE'
  | 'LESSON_HAS_LEARNERS'
  | 'FUTURE_DATE'
  | 'NOT_ADMIN'
  | 'LESSON_PUBLISHED_INCOMPLETE'
  | 'LAST_ADMIN'
  | 'USER_NOT_FOUND'
  | 'INVALID_ORDER'
  | 'INVALID_AVATAR'
  | 'QUESTION_HAS_ANSWERS'
  | 'QUESTION_NOT_FOUND'
  | 'LESSON_NOT_FOUND'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'NETWORK'
  | 'RATE_LIMITED'
  | 'WEAK_PASSWORD'
  | 'SAME_PASSWORD'
  | 'UNKNOWN';

const MESSAGES: Record<ErrorCode, string> = {
  NOT_AUTHENTICATED: 'กรุณาเข้าสู่ระบบก่อน',
  LESSON_LOCKED: 'บทเรียนนี้ยังล็อกอยู่',
  INVALID_ANSWERS: 'กรุณาตอบให้ครบทุกข้อ',
  LESSON_INCOMPLETE: 'บทเรียนนี้ยังไม่พร้อมให้ทำแบบทดสอบ',
  LESSON_HAS_LEARNERS: 'ลบบทนี้ไม่ได้เพราะมีผู้เรียนแล้ว',
  FUTURE_DATE: 'วันที่ต้องไม่เป็นวันในอนาคต',
  NOT_ADMIN: 'เฉพาะผู้ดูแลระบบเท่านั้น',
  LESSON_PUBLISHED_INCOMPLETE: 'บทนี้เผยแพร่อยู่ การแก้ไขนี้จะทำให้บทไม่สมบูรณ์ — เปลี่ยนเป็นฉบับร่างก่อนแก้',
  LAST_ADMIN: 'ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน',
  USER_NOT_FOUND: 'ไม่พบผู้ใช้นี้',
  INVALID_ORDER: 'ลำดับบทไม่ถูกต้อง กรุณาโหลดหน้าใหม่',
  INVALID_AVATAR: 'รูปโปรไฟล์ไม่ถูกต้อง',
  QUESTION_HAS_ANSWERS: 'มีผู้เรียนตอบข้อนี้แล้ว ลบไม่ได้ — แก้ข้อความแทน หรือเปลี่ยนบทเป็นฉบับร่างแล้วเพิ่มคำถามใหม่',
  QUESTION_NOT_FOUND: 'ไม่พบคำถามนี้ กรุณาโหลดหน้าใหม่',
  LESSON_NOT_FOUND: 'ไม่พบบทเรียนนี้ กรุณาโหลดหน้าใหม่',
  INVALID_CREDENTIALS: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  EMAIL_NOT_CONFIRMED: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
  NETWORK: 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่',
  RATE_LIMITED: 'มีการลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่',
  WEAK_PASSWORD: 'รหัสผ่านนี้ไม่ปลอดภัยพอ กรุณาตั้งรหัสใหม่',
  SAME_PASSWORD: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม',
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
  user_not_found: 'INVALID_CREDENTIALS',
  email_not_confirmed: 'EMAIL_NOT_CONFIRMED',
  over_request_rate_limit: 'RATE_LIMITED',
  over_email_send_rate_limit: 'RATE_LIMITED',
  weak_password: 'WEAK_PASSWORD',
  same_password: 'SAME_PASSWORD',
};

type ErrorLike = { message?: string; code?: string; status?: number; name?: string };

export function errorCodeFrom(e: ErrorLike | null): ErrorCode {
  if (!e) return 'UNKNOWN';
  if (e.code && Object.hasOwn(AUTH_CODES, e.code)) return AUTH_CODES[e.code];
  if (e.status === 429) return 'RATE_LIMITED';
  if (e.status === 0 || (e.status !== undefined && e.status >= 500) || e.name === 'AuthRetryableFetchError') {
    return 'NETWORK';
  }
  if (e.message && isErrorCode(e.message)) return e.message;
  return 'UNKNOWN';
}
