import { describe, expect, it } from 'vitest';
import { validateCredentials, validatePractice, validateProfile } from '@/lib/validation';

const prac = (o: Partial<Parameters<typeof validatePractice>[0]> = {}) =>
  validatePractice({ practicedOn: '2026-10-19', minutes: '10', activity: 'chords', note: '', ...o }, '2026-10-19');

describe('validation', () => {
  it('credentials', () => {
    expect(validateCredentials({ email: 'a@b.co', password: '1234567' }).password).toBe('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
    expect(validateCredentials({ email: 'a@b.co', password: '12345678' })).toEqual({});
    expect(validateCredentials({ email: 'not-an-email', password: '12345678' }).email).toBe('รูปแบบอีเมลไม่ถูกต้อง');
    expect(validateCredentials({ email: 'a b@c.co', password: '12345678' }).email).toBeDefined();
    expect(validateCredentials({ email: '', password: '12345678' }).email).toBeDefined();
  });
  it('minutes boundaries', () => {
    for (const [m, ok] of [['0', false], ['1', true], ['600', true], ['601', false], ['1.5', false], ['', false], [' 5', false], ['1e2', false], ['-1', false]] as const)
      expect(prac({ minutes: m }).minutes === undefined, m).toBe(ok);
    expect(prac({ minutes: '0' }).minutes).toBe('จำนวนนาทีต้องเป็นจำนวนเต็ม 1–600');
  });
  it('practicedOn', () => {
    expect(prac({ practicedOn: '2026-10-20' }).practicedOn).toBe('วันที่ต้องไม่เป็นวันในอนาคต');
    expect(prac({ practicedOn: '' }).practicedOn).toBe('กรุณาเลือกวันที่');
    expect(prac({ practicedOn: '19/10/2026' }).practicedOn).toBe('กรุณาเลือกวันที่');
    expect(prac({ practicedOn: '2026-02-30' }).practicedOn).toBe('กรุณาเลือกวันที่');
    expect(prac({ practicedOn: '2026-10-18' }).practicedOn).toBeUndefined();
  });
  it('activity and note', () => {
    expect(prac({ activity: '' }).activity).toBe('กรุณาเลือกหัวข้อที่ฝึก');
    expect(prac({ note: 'ก'.repeat(500) }).note).toBeUndefined();
    expect(prac({ note: 'ก'.repeat(501) }).note).toBe('บันทึกสั้นต้องไม่เกิน 500 ตัวอักษร');
    expect(prac({ note: '😀'.repeat(500) }).note).toBeUndefined();
    expect(prac()).toEqual({});
  });
  it('profile', () => {
    expect(validateProfile({ displayName: 'มิว', weeklyGoalMinutes: '5001' }).weeklyGoalMinutes).toBe('เป้าหมายต้องเป็นจำนวนเต็ม 0–5000 นาที');
    for (const g of ['5000', '0']) expect(validateProfile({ displayName: 'มิว', weeklyGoalMinutes: g })).toEqual({});
    for (const g of ['-1', '1.5', '', '1e2', ' 5']) expect(validateProfile({ displayName: 'มิว', weeklyGoalMinutes: g }).weeklyGoalMinutes, g).toBeDefined();
    expect(validateProfile({ displayName: '', weeklyGoalMinutes: '0' }).displayName).toBe('ชื่อที่แสดงต้องยาว 1–50 ตัวอักษร');
    expect(validateProfile({ displayName: 'ก'.repeat(51), weeklyGoalMinutes: '0' }).displayName).toBeDefined();
    expect(validateProfile({ displayName: 'ก'.repeat(50), weeklyGoalMinutes: '0' })).toEqual({});
  });
});
