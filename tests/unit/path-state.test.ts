import { describe, expect, it } from 'vitest';
import { lockedNotice, toPathLessons } from '@/lib/path-state';

const l = (sort: number, id: string, title: string) => ({
  id,
  slug: id,
  title,
  summary: null,
  sort_order: sort,
  pass_score: 70,
});
const lessons = [l(1, 'a', 'บท A'), l(2, 'b', 'บท B'), l(3, 'c', 'บท C')];
const first = [{ lesson_id: 'a', status: 'unlocked', best_score: null }];

describe('path-state', () => {
  it('maps progress to states', () => {
    expect(
      toPathLessons(lessons, [
        { lesson_id: 'a', status: 'completed', best_score: 80 },
        { lesson_id: 'b', status: 'unlocked', best_score: 40 },
      ]).map((x) => x.state),
    ).toEqual(['completed', 'unlocked', 'locked']);
  });
  it('sorts by sortOrder and carries scores', () => {
    const r = toPathLessons([lessons[2], lessons[0]], [{ lesson_id: 'a', status: 'completed', best_score: 80 }]);
    expect(r.map((x) => x.slug)).toEqual(['a', 'c']);
    expect(r[0]).toMatchObject({ sortOrder: 1, passScore: 70, bestScore: 80 });
    expect(r[1].bestScore).toBeNull();
  });
  it('lockedNotice names nearest earlier incomplete lesson', () => {
    expect(lockedNotice(toPathLessons(lessons, first), 'c')).toBe('ต้องผ่านแบบทดสอบบท บท B ก่อน');
    expect(lockedNotice(toPathLessons(lessons, first), 'b')).toBe('ต้องผ่านแบบทดสอบบท บท A ก่อน');
  });
  it('lockedNotice is null when not locked or unknown', () => {
    expect(lockedNotice(toPathLessons(lessons, first), 'a')).toBeNull();
    expect(lockedNotice(toPathLessons(lessons, first), 'zzz')).toBeNull();
  });
});
