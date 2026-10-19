import type { PathLesson } from '@/lib/path-state';

type Log = { practicedOn: string; minutes: number };

export function lessonsProgress(lessons: PathLesson[]): { completed: number; total: number } {
  return { completed: lessons.filter((x) => x.state === 'completed').length, total: lessons.length };
}

export function averageBestScore(lessons: PathLesson[]): number | null {
  const scores = lessons.map((x) => x.bestScore).filter((s): s is number => s !== null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** Sum minutes whose date is within [start, end] inclusive (YYYY-MM-DD compares lexically). */
export function weeklyMinutes(logs: Log[], range: { start: string; end: string }): number {
  return logs
    .filter((l) => l.practicedOn >= range.start && l.practicedOn <= range.end)
    .reduce((sum, l) => sum + l.minutes, 0);
}

export function dailyMinutes(logs: Log[], days: string[]): { date: string; minutes: number }[] {
  return days.map((date) => ({
    date,
    minutes: logs.filter((l) => l.practicedOn === date).reduce((sum, l) => sum + l.minutes, 0),
  }));
}

export function nextLesson(lessons: PathLesson[]): PathLesson | null {
  return [...lessons].sort((a, b) => a.sortOrder - b.sortOrder).find((x) => x.state === 'unlocked') ?? null;
}
