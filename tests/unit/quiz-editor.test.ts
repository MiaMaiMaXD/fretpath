import { describe, expect, it } from 'vitest';
import { emptyQuestion, quizProblems, type QuizQuestionDraft } from '@/lib/admin/quiz-editor';

const ok = { passScore: '60', maxAttempts: '3' };
const choice = (p: Partial<QuizQuestionDraft> = {}): QuizQuestionDraft => ({
  ...emptyQuestion('choice', 'k'),
  prompt: 'คำถาม',
  choices: ['a', 'b', 'c', 'd'],
  choiceIds: [null, null, null, null],
  correct: 0,
  ...p,
});

describe('quizProblems', () => {
  it('accepts a complete quiz', () => {
    expect(quizProblems(ok, [choice(), { ...emptyQuestion('practical', 'p'), prompt: 'ดีด', chords: ['C'] }])).toEqual([]);
  });
  it('checks the settings', () => {
    expect(quizProblems({ passScore: '0', maxAttempts: 'x' }, [])).toHaveLength(2);
    expect(quizProblems({ passScore: '100', maxAttempts: '' }, [])).toEqual([]);
  });
  it('needs a prompt, filled choices and a correct answer', () => {
    expect(quizProblems(ok, [choice({ prompt: '', choices: ['a', ''], correct: null })])).toEqual([
      'ข้อที่ 1: กรุณากรอกคำถาม',
      'ข้อที่ 1: กรอกตัวเลือกให้ครบทุกช่อง',
      'ข้อที่ 1: เลือกข้อที่ถูก (กดวงกลมหน้าตัวเลือก)',
    ]);
  });
  it('allows one practical question that has chords', () => {
    const pr = { ...emptyQuestion('practical', 'p'), prompt: 'ดีด' };
    const out = quizProblems(ok, [pr, { ...pr, chords: ['C'] }]);
    expect(out).toContain('ข้อปฏิบัติมีได้ 1 ข้อ');
    expect(out).toContain('ข้อที่ 1: เลือกคอร์ดในข้อปฏิบัติอย่างน้อย 1 คอร์ด');
  });
});
