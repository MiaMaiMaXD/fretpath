/** Publish-problem codes from lesson_publish_problems() in Thai; `questionLabel` names a question by id. */
export function publishProblemsThai(codes: string[], questionLabel: (id: string) => string): string[] {
  return codes.map((c) => {
    if (c === 'NO_QUESTIONS') return 'ยังไม่มีคำถามปรนัย (ต้องมีอย่างน้อย 1 ข้อ)';
    if (c.startsWith('QUESTION_NO_KEY:')) return `${questionLabel(c.slice('QUESTION_NO_KEY:'.length))} ยังไม่กำหนดข้อที่ถูก`;
    if (c.startsWith('QUESTION_CHOICE_COUNT:')) {
      return `${questionLabel(c.slice('QUESTION_CHOICE_COUNT:'.length))} ต้องมีตัวเลือก 2–6 ข้อ`;
    }
    if (c.startsWith('PRACTICAL_NO_CHORDS:')) {
      return `${questionLabel(c.slice('PRACTICAL_NO_CHORDS:'.length))} ยังไม่ได้เลือกคอร์ด`;
    }
    return c;
  });
}
