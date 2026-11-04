import { describe, expect, it } from 'vitest';
import { unitsFor } from '@/lib/path-frets';

describe('unitsFor', () => {
  it('keeps only units that hold a lesson and trims the last one', () => {
    expect(unitsFor(5).map((u) => [u.from, u.to])).toEqual([[0, 4]]);
    expect(unitsFor(7).map((u) => [u.from, u.to])).toEqual([
      [0, 4],
      [5, 6],
    ]);
  });

  it('covers the whole neck at 22 lessons and adds an extra unit beyond it', () => {
    expect(unitsFor(22)).toHaveLength(4);
    expect(unitsFor(24).at(-1)).toEqual({ name: 'บทเพิ่มเติม', from: 22, to: 23 });
  });

  it('returns nothing for an empty course', () => {
    expect(unitsFor(0)).toEqual([]);
  });
});
