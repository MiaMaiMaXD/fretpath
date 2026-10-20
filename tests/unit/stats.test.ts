import { describe, expect, it } from 'vitest';
import { averageBestScore, dailyMinutes, lessonsProgress, nextLesson, weeklyMinutes } from '@/lib/stats';
import type { PathLesson } from '@/lib/path-state';

let n = 0;
function pl(over: Partial<PathLesson> = {}): PathLesson {
  n += 1;
  return {
    id: `id-${n}`,
    slug: `slug-${n}`,
    title: `บท ${n}`,
    summary: null,
    sortOrder: n,
    passScore: 70,
    state: 'locked',
    bestScore: null,
    ...over,
  };
}

describe('stats', () => {
  const range = { start: '2026-10-19', end: '2026-10-25' };
  it('weeklyMinutes excludes previous Sunday and includes Monday and Sunday', () => {
    expect(
      weeklyMinutes(
        [
          { practicedOn: '2026-10-18', minutes: 30 },
          { practicedOn: '2026-10-19', minutes: 20 },
          { practicedOn: '2026-10-25', minutes: 5 },
          { practicedOn: '2026-10-26', minutes: 99 },
        ],
        range,
      ),
    ).toBe(25);
  });
  it('dailyMinutes sums per day and fills zeros', () => {
    expect(
      dailyMinutes(
        [
          { practicedOn: '2026-10-19', minutes: 10 },
          { practicedOn: '2026-10-19', minutes: 5 },
        ],
        ['2026-10-18', '2026-10-19'],
      ),
    ).toEqual([
      { date: '2026-10-18', minutes: 0 },
      { date: '2026-10-19', minutes: 15 },
    ]);
  });
  it('averageBestScore rounds and ignores unscored', () => {
    expect(averageBestScore([pl({ bestScore: 80 }), pl({ bestScore: 67 }), pl({ bestScore: null })])).toBe(74);
    expect(averageBestScore([pl({ bestScore: null })])).toBeNull();
    expect(averageBestScore([])).toBeNull();
  });
  it('nextLesson is first unlocked', () => {
    expect(nextLesson([pl({ state: 'completed' }), pl({ slug: 'b', state: 'unlocked' }), pl({ state: 'locked' })])?.slug).toBe('b');
    expect(nextLesson([pl({ state: 'completed' })])).toBeNull();
  });
  it('lessonsProgress counts completed', () => {
    expect(lessonsProgress([pl({ state: 'completed' }), pl({ state: 'unlocked' }), pl()])).toEqual({ completed: 1, total: 3 });
  });
});
