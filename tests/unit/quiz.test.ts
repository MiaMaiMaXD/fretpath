import { describe, expect, it } from 'vitest';
import { unansweredIds, type QuizQuestion } from '@/lib/quiz';

const q = (id: string): QuizQuestion => ({
  id,
  prompt: `prompt ${id}`,
  imageUrl: null,
  choices: [
    { id: `${id}-a`, text: 'A' },
    { id: `${id}-b`, text: 'B' },
  ],
});

describe('unansweredIds', () => {
  const questions = [q('q1'), q('q2'), q('q3')];

  it('returns unanswered ids in question order', () => {
    expect(unansweredIds(questions, { q2: 'q2-a' })).toEqual(['q1', 'q3']);
  });

  it('returns [] when every question is answered', () => {
    expect(unansweredIds(questions, { q1: 'q1-a', q2: 'q2-b', q3: 'q3-a' })).toEqual([]);
  });

  it('treats an empty choice id as unanswered', () => {
    expect(unansweredIds(questions, { q1: '', q2: 'q2-a', q3: 'q3-a' })).toEqual(['q1']);
  });
});
