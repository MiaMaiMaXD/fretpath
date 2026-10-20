import { createClient } from '@/lib/supabase/server';
import { getPath } from '@/lib/data/path';
import type { QuizQuestion } from '@/lib/quiz';

export type QuizData =
  | { status: 'ok'; lessonId: string; title: string; passScore: number; questions: QuizQuestion[] }
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
  return { status: 'ok', lessonId: lesson.id, title: lesson.title, passScore: lesson.passScore, questions };
}
