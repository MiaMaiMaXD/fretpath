export type QuizQuestion = {
  id: string;
  prompt: string;
  imageUrl: string | null;
  choices: { id: string; text: string }[];
};

export type QuizQuestionResult = {
  question_id: string;
  choice_id: string;
  correct_choice_id: string;
  is_correct: boolean;
  explanation: string | null;
};

export type QuizResult = {
  attempt_id: string;
  score_pct: number;
  passed: boolean;
  pass_score: number;
  next_lesson_slug: string | null;
  results: QuizQuestionResult[];
};

/** Ids of questions without a chosen answer, in question order. */
export function unansweredIds(questions: QuizQuestion[], answers: Record<string, string>): string[] {
  return questions.filter((q) => !answers[q.id]).map((q) => q.id);
}
