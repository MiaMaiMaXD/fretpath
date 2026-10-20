import { createClient } from '@/lib/supabase/server';
import { getPath } from '@/lib/data/path';
import type { PathLesson } from '@/lib/path-state';

export type LessonForLearner =
  | { status: 'ok'; lesson: PathLesson; contentMd: string; videoUrl: string | null }
  | { status: 'locked' }
  | { status: 'not_found' };

export async function getLessonForLearner(slug: string): Promise<LessonForLearner> {
  const path = await getPath();
  const lesson = path?.lessons.find((l) => l.slug === slug);
  if (!lesson) return { status: 'not_found' };
  if (lesson.state === 'locked') return { status: 'locked' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lesson_contents')
    .select('content_md, video_url')
    .eq('lesson_id', lesson.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { status: 'locked' };
  return { status: 'ok', lesson, contentMd: data.content_md, videoUrl: data.video_url };
}
