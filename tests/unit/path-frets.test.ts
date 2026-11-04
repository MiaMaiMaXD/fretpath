import { describe, expect, it } from 'vitest';
import { CURRICULUM, layoutPath, unitsFor } from '@/lib/path-frets';
import type { PathLesson } from '@/lib/path-state';

const lesson = (slug: string, sortOrder: number): PathLesson => ({
  id: slug,
  slug,
  title: slug,
  summary: null,
  sortOrder,
  passScore: 60,
  state: 'locked',
  bestScore: null,
});

const BASICS = ['guitar-anatomy-tuning', 'first-chords', 'open-chords-changes', 'strumming-4-4', 'f-chord-first-song'].map(lesson);

describe('layoutPath', () => {
  it('puts the five guitar-basics lessons on their planned frets and fills the rest with the plan', () => {
    const slots = layoutPath('guitar-basics', BASICS);
    expect(slots).toHaveLength(22);
    expect(slots.filter((s) => s.lesson).map((s) => [s.fret, s.lesson!.slug])).toEqual([
      [0, 'guitar-anatomy-tuning'],
      [2, 'first-chords'],
      [3, 'open-chords-changes'],
      [4, 'strumming-4-4'],
      [7, 'f-chord-first-song'],
    ]);
    expect(slots[1].plan?.slug).toBe('read-tab-chord-charts');
    expect(slots.map((s) => s.fret)).toEqual([...Array(22).keys()]);
  });

  it('gives an unplanned lesson the next free fret', () => {
    const slots = layoutPath('guitar-basics', [...BASICS, lesson('qa-extra', 6)]);
    expect(slots[8].lesson?.slug).toBe('qa-extra');
    expect(slots).toHaveLength(22);
  });

  it('never moves a planned lesson backwards past the order', () => {
    const slots = layoutPath('guitar-basics', [lesson('f-chord-first-song', 1), lesson('first-chords', 2)]);
    expect(slots[7].lesson?.slug).toBe('f-chord-first-song');
    expect(slots[8].lesson?.slug).toBe('first-chords');
  });

  it('lays other courses out one lesson per fret with no planned slots', () => {
    const slots = layoutPath('other', [lesson('a', 1), lesson('b', 2)]);
    expect(slots.map((s) => [s.fret, s.lesson?.slug])).toEqual([
      [0, 'a'],
      [1, 'b'],
    ]);
  });

  it('has exactly 22 planned lessons with unique slugs', () => {
    const plan = CURRICULUM['guitar-basics'];
    expect(plan).toHaveLength(22);
    expect(new Set(plan.map((p) => p.slug)).size).toBe(22);
  });
});

describe('unitsFor', () => {
  it('keeps only units that hold a slot and trims the last one', () => {
    expect(unitsFor(5).map((u) => [u.from, u.to])).toEqual([[0, 4]]);
    expect(unitsFor(7).map((u) => [u.from, u.to])).toEqual([
      [0, 4],
      [5, 6],
    ]);
  });

  it('covers the whole neck at 22 and adds an extra unit beyond it', () => {
    expect(unitsFor(22)).toHaveLength(4);
    expect(unitsFor(24).at(-1)).toEqual({ name: 'บทเพิ่มเติม', from: 22, to: 23 });
  });
});
