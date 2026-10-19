import { describe, expect, it } from 'vitest';
import { errorCodeFrom, thaiError } from '@/lib/errors';

describe('errors', () => {
  it('thaiError maps codes', () => {
    expect(thaiError('LESSON_LOCKED')).toBe('บทเรียนนี้ยังล็อกอยู่');
    expect(thaiError('NETWORK')).toBe('เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่');
    expect(thaiError('SOMETHING_ELSE')).toBe('เกิดข้อผิดพลาด กรุณาลองใหม่');
  });
  it('errorCodeFrom', () => {
    expect(errorCodeFrom({ message: 'FUTURE_DATE', code: 'P0001' })).toBe('FUTURE_DATE');
    expect(errorCodeFrom({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('INVALID_CREDENTIALS');
    expect(errorCodeFrom({ code: 'email_not_confirmed' })).toBe('EMAIL_NOT_CONFIRMED');
    expect(errorCodeFrom({ message: 'boom' })).toBe('UNKNOWN');
    expect(errorCodeFrom(null)).toBe('UNKNOWN');
  });
});
