import { describe, expect, it } from 'vitest';
import { publishProblemsThai, validateLessonInput } from '@/lib/admin/lesson-form';

const ok = { title: 'บทที่ 1', slug: 'ok-slug', summary: '', contentMd: '', videoUrl: '', passScore: '60' };

describe('validateLessonInput', () => {
  it('accepts a valid input', () => {
    expect(validateLessonInput(ok)).toEqual({});
  });
  it('passScore boundaries', () => {
    for (const v of ['0', '101', '', '60.5', 'abc']) {
      expect(validateLessonInput({ ...ok, passScore: v }).passScore).toBe('เกณฑ์ผ่านต้องเป็นจำนวนเต็ม 1–100');
    }
    for (const v of ['1', '100']) expect(validateLessonInput({ ...ok, passScore: v }).passScore).toBeUndefined();
  });
  it('slug format', () => {
    expect(validateLessonInput({ ...ok, slug: 'Bad Slug' }).slug).toBe('slug ใช้ได้เฉพาะ a-z 0-9 และขีดกลาง');
    expect(validateLessonInput({ ...ok, slug: 'ok-slug' }).slug).toBeUndefined();
    expect(validateLessonInput({ ...ok, slug: 'a'.repeat(81) }).slug).toBeDefined();
    expect(validateLessonInput({ ...ok, slug: 'a'.repeat(80) }).slug).toBeUndefined();
  });
  it('title length', () => {
    const msg = 'กรุณาใส่ชื่อบท 1–120 ตัวอักษร';
    expect(validateLessonInput({ ...ok, title: '' }).title).toBe(msg);
    expect(validateLessonInput({ ...ok, title: 'ก'.repeat(120) }).title).toBeUndefined();
    expect(validateLessonInput({ ...ok, title: 'ก'.repeat(121) }).title).toBe(msg);
  });
  it('summary max 300', () => {
    expect(validateLessonInput({ ...ok, summary: 'x'.repeat(301) }).summary).toBe('สรุปต้องไม่เกิน 300 ตัวอักษร');
    expect(validateLessonInput({ ...ok, summary: 'x'.repeat(300) }).summary).toBeUndefined();
  });
  it('videoUrl', () => {
    expect(validateLessonInput({ ...ok, videoUrl: '' }).videoUrl).toBeUndefined();
    expect(validateLessonInput({ ...ok, videoUrl: 'https://youtu.be/dQw4w9WgXcQ' }).videoUrl).toBeUndefined();
    expect(validateLessonInput({ ...ok, videoUrl: 'https://vimeo.com/1' }).videoUrl).toBe('ต้องเป็นลิงก์ YouTube');
  });
});

describe('publishProblemsThai', () => {
  it('translates all codes', () => {
    const label = (id: string) => (id === 'q1' ? 'ข้อ 1' : 'ข้อ 2');
    expect(
      publishProblemsThai(['NO_QUESTIONS', 'QUESTION_NO_KEY:q1', 'QUESTION_CHOICE_COUNT:q2'], label),
    ).toEqual(['ยังไม่มีคำถาม', 'ข้อ 1 ยังไม่กำหนดข้อที่ถูก', 'ข้อ 2 ต้องมีตัวเลือก 2–6 ข้อ']);
  });
});

describe('uniqueViolationKind', () => {
  it('tells slug and sort_order conflicts apart', async () => {
    const { uniqueViolationKind } = await import('@/lib/admin/lesson-form');
    expect(uniqueViolationKind({ code: '23505', message: 'duplicate key value violates unique constraint "lessons_course_id_slug_key"' })).toBe('slug');
    expect(uniqueViolationKind({ code: '23505', message: 'duplicate key value violates unique constraint "lessons_course_id_sort_order_key"' })).toBe('sort_order');
    expect(uniqueViolationKind({ code: '23505', details: 'Key (course_id, sort_order)=(a, 1) already exists.' })).toBe('sort_order');
    expect(uniqueViolationKind({ code: '23514' })).toBeNull();
  });
});
