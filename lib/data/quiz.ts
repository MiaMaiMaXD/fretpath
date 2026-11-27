import { createClient } from '@/lib/supabase/server';
import { getPath } from '@/lib/data/path';
import type { QuizQuestion } from '@/lib/quiz';

export type QuizData =
  | {
      status: 'ok';
      lessonId: string;
      title: string;
      passScore: number;
      questions: QuizQuestion[];
      /** quota (null = unlimited, e.g. already passed), attempts left, and when a used-up quota reopens */
      maxAttempts: number | null;
      attemptsLeft: number | null;
      retryAt: string | null;
    }
  | { status: 'locked' }
  | { status: 'not_found' };

export async function getQuiz(slug: string): Promise<QuizData> {
  const path = await getPath();
  const lesson = path?.lessons.find((l) => l.slug === slug);
  if (!lesson) return { status: 'not_found' };
  if (lesson.state === 'locked') return { status: 'locked' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('id, prompt, image_url, sort_order, quiz_choices(id, text, sort_order)')
    .eq('lesson_id', lesson.id)
    .eq('kind', 'choice') // practical (chord) questions are not graded yet
    .order('sort_order');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return { status: 'locked' };

  const questions: QuizQuestion[] = data.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    imageUrl: q.image_url,
    choices: [...q.quiz_choices]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({ id: c.id, text: c.text })),
  }));
  const quota = await supabase.rpc('quiz_quota', { p_lesson: lesson.id });
  if (quota.error) throw new Error(quota.error.message);
  const q = quota.data?.[0];
  const max = q?.max_attempts ?? null;
  return {
    status: 'ok',
    lessonId: lesson.id,
    title: lesson.title,
    passScore: lesson.passScore,
    questions,
    maxAttempts: max,
    attemptsLeft: max === null ? null : Math.max(0, max - (q?.used ?? 0)),
    retryAt: q?.retry_at ?? null,
  };
}
