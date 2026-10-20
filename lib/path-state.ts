export type LessonState = 'locked' | 'unlocked' | 'completed';

export type PathLesson = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  sortOrder: number;
  passScore: number;
  state: LessonState;
  bestScore: number | null;
};

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  sort_order: number;
  pass_score: number;
};

type ProgressRow = { lesson_id: string; status: string; best_score: number | null };

export function toPathLessons(lessons: LessonRow[], progress: ProgressRow[]): PathLesson[] {
  const byLesson = new Map(progress.map((p) => [p.lesson_id, p]));
  return [...lessons]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((x) => {
      const p = byLesson.get(x.id);
      const state: LessonState = p?.status === 'completed' ? 'completed' : p?.status === 'unlocked' ? 'unlocked' : 'locked';
      return {
        id: x.id,
        slug: x.slug,
        title: x.title,
        summary: x.summary,
        sortOrder: x.sort_order,
        passScore: x.pass_score,
        state,
        bestScore: p?.best_score ?? null,
      };
    });
}

export function lockedNotice(lessons: PathLesson[], slug: string): string | null {
  const sorted = [...lessons].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = sorted.findIndex((x) => x.slug === slug);
  if (idx < 0 || sorted[idx].state !== 'locked') return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (sorted[i].state !== 'completed') return `ต้องผ่านแบบทดสอบบท ${sorted[i].title} ก่อน`;
  }
  return null;
}
