import { isChordName, type ChordName } from '@/lib/audio/chords';

/** One question in the quiz page editor. `id` is null until saved. */
export type QuizQuestionDraft = {
  key: string;
  id: string | null;
  kind: 'choice' | 'practical';
  prompt: string;
  /** multiple choice */
  choices: string[];
  /** ids of saved choices aligned with `choices` (null = new), so learners' past answers stay attached */
  choiceIds: (string | null)[];
  correct: number | null;
  /** kept as is (not edited on this page) so saving does not wipe existing explanations */
  explanation: string;
  /** practical */
  chords: ChordName[];
};

/** passScore %, maxAttempts = quiz submissions allowed per 24 hours ('' = unlimited) */
export type QuizSettings = { passScore: string; maxAttempts: string };

export const PRACTICAL_CHORDS: readonly ChordName[] = ['C', 'G', 'Am', 'F', 'Em', 'D', 'Dm', 'A', 'E', 'Bm'];
export const MAX_PRACTICAL = 1;
export const DEFAULT_CHOICES = 4;

export function emptyQuestion(kind: QuizQuestionDraft['kind'], key: string): QuizQuestionDraft {
  return {
    key,
    id: null,
    kind,
    prompt: '',
    choices: kind === 'choice' ? Array.from({ length: DEFAULT_CHOICES }, () => '') : [],
    choiceIds: kind === 'choice' ? Array.from({ length: DEFAULT_CHOICES }, () => null) : [],
    correct: null,
    explanation: '',
    chords: [],
  };
}

/** Problems that block saving the quiz, in Thai. Question numbers are 1-based ("ข้อที่ N"). */
export function quizProblems(settings: QuizSettings, questions: QuizQuestionDraft[]): string[] {
  const out: string[] = [];
  const pass = settings.passScore.trim();
  if (!/^\d{1,3}$/.test(pass) || Number(pass) < 1 || Number(pass) > 100) out.push('เกณฑ์คะแนนที่ให้ผ่านต้องเป็นตัวเลข 1–100');
  const tries = settings.maxAttempts.trim();
  if (tries && (!/^\d{1,2}$/.test(tries) || Number(tries) < 1)) out.push('จำนวนครั้งที่ทำได้ต่อวันต้องเป็นตัวเลข 1–99 (เว้นว่าง = ไม่จำกัด)');
  if (questions.filter((q) => q.kind === 'practical').length > MAX_PRACTICAL) out.push(`ข้อปฏิบัติมีได้ ${MAX_PRACTICAL} ข้อ`);
  questions.forEach((q, i) => {
    const n = `ข้อที่ ${i + 1}`;
    if (!q.prompt.trim()) out.push(`${n}: กรุณากรอกคำถาม`);
    if (q.kind === 'choice') {
      if (q.choices.length < 2 || q.choices.length > 6) out.push(`${n}: ต้องมีตัวเลือก 2–6 ข้อ`);
      if (q.choices.some((c) => !c.trim())) out.push(`${n}: กรอกตัวเลือกให้ครบทุกช่อง`);
      if (q.correct === null || q.correct < 0 || q.correct >= q.choices.length) out.push(`${n}: เลือกข้อที่ถูก (กดวงกลมหน้าตัวเลือก)`);
    } else if (q.chords.length === 0 || q.chords.some((c) => !isChordName(c))) {
      out.push(`${n}: เลือกคอร์ดในข้อปฏิบัติอย่างน้อย 1 คอร์ด`);
    }
  });
  return out;
}

/** Short label for a collapsed question row. */
export function questionLabel(q: QuizQuestionDraft, i: number): string {
  return q.prompt.trim() ? `ข้อที่ ${i + 1} ${q.prompt.trim()}` : `ข้อที่ ${i + 1}`;
}
