import { isStoredYouTubeUrl } from '@/lib/youtube';
import type { FieldErrors } from '@/lib/validation';

const len = (s: string) => [...s].length;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type LessonInput = {
  title: string;
  slug: string;
  summary: string;
  contentMd: string;
  videoUrl: string;
  passScore: string;
};

export function validateLessonInput(input: LessonInput): FieldErrors {
  const errors: FieldErrors = {};
  const t = len(input.title);
  if (t < 1 || t > 120) errors.title = 'กรุณาใส่ชื่อบท 1–120 ตัวอักษร';
  if (!SLUG_RE.test(input.slug) || input.slug.length > 80) errors.slug = 'slug ใช้ได้เฉพาะ a-z 0-9 และขีดกลาง';
  if (len(input.summary) > 300) errors.summary = 'สรุปต้องไม่เกิน 300 ตัวอักษร';
  const n = Number(input.passScore);
  if (!/^\d+$/.test(input.passScore) || !Number.isSafeInteger(n) || n < 1 || n > 100) {
    errors.passScore = 'เกณฑ์ผ่านต้องเป็นจำนวนเต็ม 1–100';
  }
  if (input.videoUrl !== '' && !isStoredYouTubeUrl(input.videoUrl)) errors.videoUrl = 'ต้องเป็นลิงก์ YouTube';
  return errors;
}

export function publishProblemsThai(codes: string[], questionLabel: (id: string) => string): string[] {
  return codes.map((c) => {
    if (c === 'NO_QUESTIONS') return 'ยังไม่มีคำถาม';
    if (c.startsWith('QUESTION_NO_KEY:')) return `${questionLabel(c.slice('QUESTION_NO_KEY:'.length))} ยังไม่กำหนดข้อที่ถูก`;
    if (c.startsWith('QUESTION_CHOICE_COUNT:')) {
      return `${questionLabel(c.slice('QUESTION_CHOICE_COUNT:'.length))} ต้องมีตัวเลือก 2–6 ข้อ`;
    }
    return c;
  });
}

export const CONFLICT_MESSAGE = 'มีการแก้ไขพร้อมกัน กรุณาลองอีกครั้ง';

/** Which unique constraint a Postgres 23505 error is about (by constraint name in message/details). */
export function uniqueViolationKind(error: { code?: string; message?: string; details?: string }): 'slug' | 'sort_order' | null {
  if (error.code !== '23505') return null;
  const text = `${error.message ?? ''} ${error.details ?? ''}`;
  if (text.includes('lessons_course_id_sort_order_key') || text.includes('(course_id, sort_order)')) return 'sort_order';
  return 'slug';
}
