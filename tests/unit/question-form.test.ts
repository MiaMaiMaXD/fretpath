import { describe, expect, it } from 'vitest';
import { compactChoices, validateQuestionInput } from '@/lib/admin/question-form';

const ok = { prompt: 'คำถาม?', choices: ['ก', 'ข', 'ค'], correctIndex: '0', explanation: '' };
const n = (k: number) => Array.from({ length: k }, (_, i) => `ตัวเลือก ${i + 1}`);

describe('validateQuestionInput', () => {
  it('accepts a valid input', () => {
    expect(validateQuestionInput(ok)).toEqual({});
  });
  it('prompt 1-500', () => {
    expect(validateQuestionInput({ ...ok, prompt: '' }).prompt).toBe('กรุณาใส่คำถาม');
    expect(validateQuestionInput({ ...ok, prompt: 'ก'.repeat(500) }).prompt).toBeUndefined();
    expect(validateQuestionInput({ ...ok, prompt: 'ก'.repeat(501) }).prompt).toBe('คำถามต้องไม่เกิน 500 ตัวอักษร');
  });
  it('choice count boundaries 1/2/6/7', () => {
    expect(validateQuestionInput({ ...ok, choices: n(1) }).choices).toBe('ต้องมีตัวเลือก 2–6 ข้อ');
    expect(validateQuestionInput({ ...ok, choices: n(2) }).choices).toBeUndefined();
    expect(validateQuestionInput({ ...ok, choices: n(6) }).choices).toBeUndefined();
    expect(validateQuestionInput({ ...ok, choices: n(7) }).choices).toBe('ต้องมีตัวเลือก 2–6 ข้อ');
  });
  it('blank choices do not count', () => {
    expect(validateQuestionInput({ ...ok, choices: ['ก', '  ', ''] }).choices).toBe('ต้องมีตัวเลือก 2–6 ข้อ');
  });
  it('choice length 200', () => {
    expect(validateQuestionInput({ ...ok, choices: ['ก'.repeat(200), 'ข'] }).choices).toBeUndefined();
    expect(validateQuestionInput({ ...ok, choices: ['ก'.repeat(201), 'ข'] }).choices).toBe('ตัวเลือกต้องไม่เกิน 200 ตัวอักษร');
  });
  it('correctIndex must point to an existing choice', () => {
    for (const v of ['', '3', '-1', 'x', '1.5']) {
      expect(validateQuestionInput({ ...ok, correctIndex: v }).correctIndex).toBe('กรุณาเลือกข้อที่ถูก');
    }
    expect(validateQuestionInput({ ...ok, correctIndex: '2' }).correctIndex).toBeUndefined();
  });
  it('explanation 1000/1001', () => {
    expect(validateQuestionInput({ ...ok, explanation: 'ก'.repeat(1000) }).explanation).toBeUndefined();
    expect(validateQuestionInput({ ...ok, explanation: 'ก'.repeat(1001) }).explanation).toBe('คำอธิบายต้องไม่เกิน 1000 ตัวอักษร');
  });
});

describe('compactChoices', () => {
  it('drops blanks, keeps ids aligned and re-maps the correct index', () => {
    expect(compactChoices(['a', ' ', 'c'], ['i1', 'i2', ''], 2)).toEqual({
      choices: ['a', 'c'],
      ids: ['i1', null],
      correct: 1,
    });
  });
});
