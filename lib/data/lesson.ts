import { isChordName, type ChordName } from '@/lib/audio/chords';
import { createClient } from '@/lib/supabase/server';
import { getPath } from '@/lib/data/path';
import type { PathLesson } from '@/lib/path-state';

export type LearnerPage =
  | { id: string; kind: 'text'; title: string; html: string | null; md: string | null }
  | { id: string; kind: 'video'; title: string; videoUrl: string | null }
  | { id: string; kind: 'quiz'; title: string };

export type LessonForLearner =
  | { status: 'ok'; lesson: PathLesson; pages: LearnerPage[]; chords: ChordName[] }
  | { status: 'locked' }
  | { status: 'not_found' };

export async function getLessonForLearner(slug: string): Promise<LessonForLearner> {
  const path = await getPath();
  const lesson = path?.lessons.find((l) => l.slug === slug);
  if (!lesson) return { status: 'not_found' };
  if (lesson.state === 'locked') return { status: 'locked' };

  const supabase = await createClient();
  const [pages, extra] = await Promise.all([
    supabase.from('lesson_pages').select('id, kind, title, body_html, body_md, video_url').eq('lesson_id', lesson.id).order('sort_order'),
    supabase.from('lessons').select('example_chords').eq('id', lesson.id).maybeSingle(),
  ]);
  if (pages.error) throw new Error(pages.error.message);
  if (extra.error) throw new Error(extra.error.message);
  return {
    status: 'ok',
    lesson,
    chords: (extra.data?.example_chords ?? []).filter(isChordName),
    pages: (pages.data ?? []).map((p): LearnerPage =>
      p.kind === 'video'
        ? { id: p.id, kind: 'video', title: p.title, videoUrl: p.video_url }
        : p.kind === 'quiz'
          ? { id: p.id, kind: 'quiz', title: p.title }
          : { id: p.id, kind: 'text', title: p.title, html: p.body_html, md: p.body_md },
    ),
  };
}
