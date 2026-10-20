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
    expect(errorCodeFrom({ code: 'user_not_found' })).toBe('INVALID_CREDENTIALS');
    expect(errorCodeFrom({ code: 'over_request_rate_limit' })).toBe('RATE_LIMITED');
    expect(errorCodeFrom({ code: 'over_email_send_rate_limit' })).toBe('RATE_LIMITED');
    expect(errorCodeFrom({ status: 429 })).toBe('RATE_LIMITED');
    expect(errorCodeFrom({ code: 'weak_password' })).toBe('WEAK_PASSWORD');
    expect(errorCodeFrom({ code: 'same_password' })).toBe('SAME_PASSWORD');
    expect(errorCodeFrom({ status: 0 })).toBe('NETWORK');
    expect(errorCodeFrom({ status: 500 })).toBe('NETWORK');
    expect(errorCodeFrom({ status: 503 })).toBe('NETWORK');
    expect(errorCodeFrom({ name: 'AuthRetryableFetchError', message: 'fetch failed' })).toBe('NETWORK');
    expect(errorCodeFrom({ status: 400, message: 'x' })).toBe('UNKNOWN');
    expect(thaiError('RATE_LIMITED')).toBe('มีการลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่');
    expect(thaiError('WEAK_PASSWORD')).toBe('รหัสผ่านนี้ไม่ปลอดภัยพอ กรุณาตั้งรหัสใหม่');
    expect(thaiError('SAME_PASSWORD')).toBe('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม');
    expect(errorCodeFrom({ message: 'boom' })).toBe('UNKNOWN');
    expect(errorCodeFrom(null)).toBe('UNKNOWN');
  });
  it('maps admin error codes', () => {
    expect(thaiError('LESSON_PUBLISHED_INCOMPLETE')).toBe('บทนี้เผยแพร่อยู่ การแก้ไขนี้จะทำให้บทไม่สมบูรณ์ — เปลี่ยนเป็นฉบับร่างก่อนแก้');
    expect(thaiError('LAST_ADMIN')).toBe('ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน');
    expect(thaiError('USER_NOT_FOUND')).toBe('ไม่พบผู้ใช้นี้');
    expect(thaiError('INVALID_ORDER')).toBe('ลำดับบทไม่ถูกต้อง กรุณาโหลดหน้าใหม่');
    expect(errorCodeFrom({ message: 'LAST_ADMIN', code: 'P0001' })).toBe('LAST_ADMIN');
    expect(errorCodeFrom({ message: 'INVALID_ORDER', code: 'P0001' })).toBe('INVALID_ORDER');
  });
});
