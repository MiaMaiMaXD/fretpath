import { describe, expect, it } from 'vitest';
import { isValidEmail, newPasswordError, validateCredentials, validateNewPassword, validatePractice, validateProfile, validateSignup } from '@/lib/validation';

const prac = (o: Partial<Parameters<typeof validatePractice>[0]> = {}) =>
  validatePractice({ practicedOn: '2026-10-19', minutes: '10', activity: 'chords', note: '', ...o }, '2026-10-19');

describe('validation', () => {
  it('newPasswordError (reset page), first problem wins', () => {
    expect(newPasswordError('')).toBe('กรุณากรอกรหัสผ่าน');
    expect(newPasswordError('f1p 9')).toBe('รหัสผ่านห้ามมีช่องว่าง');
    expect(newPasswordError('f1p9r2A 64')).toBe('รหัสผ่านห้ามมีช่องว่าง');
    expect(newPasswordError('f1p9r2')).toBe('รหัสผ่านควรมีอย่างน้อย 8 ตัว');
    expect(newPasswordError('f1p9r2A')).toBe('รหัสผ่านควรมีอย่างน้อย 8 ตัว');
    expect(newPasswordError('f1p9r2a64')).toBe('รหัสผ่านควรมีตัวอักษรพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลข');
    expect(newPasswordError('F1P9R2A64')).toBe('รหัสผ่านควรมีตัวอักษรพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลข');
    expect(newPasswordError('fpRabcdef')).toBe('รหัสผ่านควรมีตัวอักษรพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลข');
    expect(newPasswordError('f1p9r2A6')).toBeUndefined();
    expect(newPasswordError('NewPassw0rd!')).toBeUndefined();
  });

  it('validateNewPassword checks the confirmation', () => {
    expect(validateNewPassword({ password: 'f1p9r2A64', confirm: 'f1p9r2A64' })).toEqual({});
    expect(validateNewPassword({ password: 'f1p9r2A64', confirm: 'f2' }).confirm).toBe('รหัสผ่านไม่ตรงกัน');
    expect(validateNewPassword({ password: '', confirm: 'f7' })).toEqual({ password: 'กรุณากรอกรหัสผ่าน', confirm: 'รหัสผ่านไม่ตรงกัน' });
  });

  it('validateSignup: email required and well-formed, plus the new-password rules', () => {
    const ok = { email: 'fretpath67@gmail.com', password: 'f1p9r2A64', confirm: 'f1p9r2A64' };
    expect(validateSignup(ok)).toEqual({});
    expect(validateSignup({ ...ok, email: '' }).email).toBe('กรุณากรอกอีเมล');
    expect(validateSignup({ ...ok, email: 'FretPath67gmail.com' }).email).toBe('อีเมลไม่ถูกต้อง');
    expect(validateSignup({ ...ok, password: 'f1p9r2a64', confirm: 'f1p9r2a64' }).password).toBe(
      'รหัสผ่านควรมีตัวอักษรพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลข',
    );
    expect(validateSignup({ ...ok, confirm: 'f2' }).confirm).toBe('รหัสผ่านไม่ตรงกัน');
  });

  it('isValidEmail (live check on the login page)', () => {
    expect(isValidEmail('fretpath67@gmail.com')).toBe(true);
    expect(isValidEmail('  fretpath67@gmail.com ')).toBe(true);
    expect(isValidEmail('FretPath67gmail.com')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.co')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

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
    expect(prac({ activity: '' }).activity).toBe('กรุณาเลือกหมวดที่ฝึก');
    expect(prac({ note: 'ก'.repeat(500) }).note).toBeUndefined();
    expect(prac({ note: 'ก'.repeat(501) }).note).toBe('บันทึกช่วยจำต้องไม่เกิน 500 ตัวอักษร');
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
