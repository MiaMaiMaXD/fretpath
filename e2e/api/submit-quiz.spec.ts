import { test, expect } from '../fixtures';
import { adminClient } from '../utils/supabaseAdmin';
import { buildAnswers, lessonIdBySlug } from '../utils/quiz';

let l1: string;
let l2: string;

test.beforeAll(async () => {
  const db = adminClient();
  l1 = await lessonIdBySlug(db, 'guitar-anatomy-tuning');
  l2 = await lessonIdBySlug(db, 'first-chords');
});

type QuizResult = {
  attempt_id: string;
  score_pct: number;
  passed: boolean;
  pass_score: number;
  next_lesson_slug: string | null;
  results: {
    question_id: string;
    choice_id: string;
    correct_choice_id: string;
    is_correct: boolean;
    explanation: string | null;
  }[];
};

test('TC-SEC-07 submit_quiz on locked lesson returns LESSON_LOCKED @security', async ({
  memberDb,
  member,
}) => {
  const answers = await buildAnswers(adminClient(), l2, 5);
  const { data, error } = await memberDb.rpc('submit_quiz', { p_lesson_id: l2, p_answers: answers });
  expect(data).toBeNull();
  expect(error?.message).toContain('LESSON_LOCKED');
  const attempts = await adminClient().from('quiz_attempts').select('id').eq('user_id', member.id);
  expect(attempts.data).toEqual([]);
});

test('TC-QZ-01 score 40% does not unlock next lesson @security', async ({ memberDb, member }) => {
  const answers = await buildAnswers(adminClient(), l1, 2);
  const { data, error } = await memberDb.rpc('submit_quiz', { p_lesson_id: l1, p_answers: answers });
  expect(error).toBeNull();
  const res = data as unknown as QuizResult;
  expect(res.score_pct).toBe(40);
  expect(res.passed).toBe(false);
  const rows = await adminClient()
    .from('lesson_progress')
    .select('status')
    .eq('user_id', member.id)
    .eq('lesson_id', l2);
  expect(rows.data).toEqual([]);
});

test('TC-QZ-02 score 60% at pass_score 60 unlocks next lesson @security', async ({
  memberDb,
  member,
}) => {
  const answers = await buildAnswers(adminClient(), l1, 3);
  const { data, error } = await memberDb.rpc('submit_quiz', { p_lesson_id: l1, p_answers: answers });
  expect(error).toBeNull();
  const res = data as unknown as QuizResult;
  expect(res.score_pct).toBe(60);
  expect(res.pass_score).toBe(60);
  expect(res.passed).toBe(true);
  expect(res.next_lesson_slug).toBe('first-chords');
  const rows = await adminClient()
    .from('lesson_progress')
    .select('status')
    .eq('user_id', member.id)
    .eq('lesson_id', l2);
  expect(rows.data).toEqual([{ status: 'unlocked' }]);
});

test('TC-QZ-03 result contains key and explanation for every question @security', async ({
  memberDb,
}) => {
  const answers = await buildAnswers(adminClient(), l1, 3);
  const { data, error } = await memberDb.rpc('submit_quiz', { p_lesson_id: l1, p_answers: answers });
  expect(error).toBeNull();
  const res = data as unknown as QuizResult;
  expect(res.results).toHaveLength(5);
  for (const r of res.results) {
    expect(r.correct_choice_id).toBeTruthy();
    expect(r.explanation?.trim()).toBeTruthy();
  }
});

test('TC-QZ-04 tampered answers are rejected @security', async ({ memberDb, member }) => {
  const answers = await buildAnswers(adminClient(), l1, 5);

  const missing = await memberDb.rpc('submit_quiz', { p_lesson_id: l1, p_answers: answers.slice(1) });
  expect(missing.error?.message).toContain('INVALID_ANSWERS');

  const duplicate = await memberDb.rpc('submit_quiz', {
    p_lesson_id: l1,
    p_answers: [...answers.slice(0, 4), answers[0]],
  });
  expect(duplicate.error?.message).toContain('INVALID_ANSWERS');

  const attempts = await adminClient().from('quiz_attempts').select('id').eq('user_id', member.id);
  expect(attempts.data).toEqual([]);
});
