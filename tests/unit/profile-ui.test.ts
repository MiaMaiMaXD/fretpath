import { describe, expect, it } from 'vitest';
import { clampName, goalDigits, goalInputError, loginMethods, thaiJoinDate } from '@/lib/profile-ui';
import { nameLength, validateDisplayName, validateWeeklyGoal } from '@/lib/validation';

describe('profile ui helpers', () => {
  it('clampName cuts at 50 code points, counting Thai marks', () => {
    expect(clampName('ก'.repeat(60))).toBe('ก'.repeat(50));
    expect(clampName('มิว')).toBe('มิว');
    expect(nameLength('สมศักดิ์')).toBe(8);
    const long = 'สมศักดิ์'.repeat(7); // 56 code points
    expect(nameLength(clampName(long))).toBe(50);
  });

  it('goalDigits keeps digits only', () => {
    expect(goalDigits('2 ชม. 10')).toBe('210');
    expect(goalDigits('-1')).toBe('1');
    expect(goalDigits('1e2')).toBe('12');
    expect(goalDigits('1.5')).toBe('15');
    expect(goalDigits('0030')).toBe('30');
    expect(goalDigits('0')).toBe('0');
    expect(goalDigits('000')).toBe('0');
    expect(goalDigits('123456')).toBe('1234');
    expect(goalDigits('abc')).toBe('');
  });

  it('goalInputError', () => {
    expect(goalInputError('')).toMatch('กรุณาใส่จำนวนนาที');
    expect(goalInputError('5001')).toBe('ใส่ได้ไม่เกิน 5000 นาทีต่อสัปดาห์');
    expect(goalInputError('5000')).toBe('');
    expect(goalInputError('0')).toBe('');
  });

  it('server validators', () => {
    expect(validateDisplayName('')).toBe('ชื่อที่แสดงต้องยาว 1–50 ตัวอักษร');
    expect(validateDisplayName('ก'.repeat(51))).toBeDefined();
    expect(validateDisplayName('ก'.repeat(50))).toBeUndefined();
    expect(validateWeeklyGoal('5001')).toBe('เป้าหมายต้องเป็นจำนวนเต็ม 0–5000 นาที');
    expect(validateWeeklyGoal('0')).toBeUndefined();
  });

  it('loginMethods', () => {
    expect(loginMethods({ provider: 'email', providers: ['email'] })).toEqual({ password: true, google: false });
    expect(loginMethods({ provider: 'google', providers: ['google'] })).toEqual({ password: false, google: true });
    expect(loginMethods({ providers: ['email', 'google'] })).toEqual({ password: true, google: true });
    expect(loginMethods({ provider: 'google' })).toEqual({ password: false, google: true });
    expect(loginMethods(undefined)).toEqual({ password: false, google: false });
  });

  it('thaiJoinDate uses Bangkok time and the Buddhist year', () => {
    expect(thaiJoinDate('2026-10-19T18:00:00Z')).toBe('20 ต.ค. 2569');
  });
});
