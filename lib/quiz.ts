import type { ChordName } from '@/lib/audio/chords';

/** A practical question: play these chords string by string into the microphone. */
export type PracticalQuestion = { id: string; prompt: string; chords: ChordName[] };

export type QuizQuestion = {
  id: string;
  prompt: string;
  imageUrl: string | null;
  choices: { id: string; text: string }[];
};

/** Per-question result as learners see it: their own choice and whether it was right. The answer key and
    explanation are not sent to the browser (the quiz is not revealed). */
export type QuizQuestionResult = {
  question_id: string;
  choice_id: string;
  is_correct: boolean;
};

export type QuizResult = {
  attempt_id: string;
  score_pct: number;
  passed: boolean;
  pass_score: number;
  next_lesson_slug: string | null;
  /** attempts left today after this one; null = unlimited */
  attempts_left?: number | null;
  results: QuizQuestionResult[];
};

/** Ids of questions without a chosen answer, in question order. */
export function unansweredIds(questions: QuizQuestion[], answers: Record<string, string>): string[] {
  return questions.filter((q) => !answers[q.id]).map((q) => q.id);
}
