import { describe, expect, it } from 'vitest';
import { publishProblemsThai } from '@/lib/admin/lesson-form';

describe('publishProblemsThai', () => {
  it('translates all codes', () => {
    const label = (id: string) => (id === 'q1' ? 'ข้อ 1' : 'ข้อ 2');
    expect(
      publishProblemsThai(['NO_QUESTIONS', 'QUESTION_NO_KEY:q1', 'QUESTION_CHOICE_COUNT:q2', 'PRACTICAL_NO_CHORDS:q2'], label),
    ).toEqual([
      'ยังไม่มีคำถามปรนัย (ต้องมีอย่างน้อย 1 ข้อ)',
      'ข้อ 1 ยังไม่กำหนดข้อที่ถูก',
      'ข้อ 2 ต้องมีตัวเลือก 2–6 ข้อ',
      'ข้อ 2 ยังไม่ได้เลือกคอร์ด',
    ]);
  });
});
