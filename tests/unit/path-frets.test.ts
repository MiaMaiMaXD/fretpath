import { describe, expect, it } from 'vitest';
import { CURRICULUM, layoutPath, sectionName, sectionUnits, unitsFor } from '@/lib/path-frets';
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
  it('places lessons on frets 0, 1, 2, ... in order and fills the rest of the plan as coming soon', () => {
    const slots = layoutPath('guitar-basics', BASICS);
    expect(slots).toHaveLength(22);
    expect(slots.filter((s) => s.lesson).map((s) => [s.fret, s.lesson!.slug])).toEqual([
      [0, 'guitar-anatomy-tuning'],
      [1, 'first-chords'],
      [2, 'open-chords-changes'],
      [3, 'strumming-4-4'],
      [4, 'f-chord-first-song'],
    ]);
    expect(slots[5].plan?.slug).toBe(CURRICULUM['guitar-basics'][5].slug);
    expect(slots.map((s) => s.fret)).toEqual([...Array(22).keys()]);
  });

  it('leaves no gap when lessons are reordered against the plan', () => {
    const slots = layoutPath('guitar-basics', [lesson('f-chord-first-song', 1), lesson('first-chords', 2)]);
    expect(slots[0].lesson?.slug).toBe('f-chord-first-song');
    expect(slots[1].lesson?.slug).toBe('first-chords');
    expect(slots[2].plan).toBeDefined();
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

describe('sectionUnits', () => {
  const inSection = (slug: string, sortOrder: number, sectionId: string): PathLesson => ({ ...lesson(slug, sortOrder), sectionId });
  const sections = [
    { id: 's1', title: 'จับกีตาร์ครั้งแรก' },
    { id: 's2', title: '' },
    { id: 's3', title: 'ว่าง' },
  ];

  it('groups consecutive lessons by section and numbers only sections that have lessons', () => {
    const slots = layoutPath('other', [inSection('a', 1, 's1'), inSection('b', 2, 's1'), inSection('c', 3, 's2')]);
    expect(sectionUnits(slots, sections)).toEqual([
      { name: 'ช่วงที่ 1 · จับกีตาร์ครั้งแรก', from: 0, to: 1 },
      { name: 'ช่วงที่ 2', from: 2, to: 2 },
    ]);
  });

  it('puts trailing coming-soon slots in their own unit', () => {
    const slots = layoutPath('guitar-basics', [inSection('a', 1, 's1')]);
    expect(sectionUnits(slots, sections).map((u) => [u.name, u.from, u.to])).toEqual([
      ['ช่วงที่ 1 · จับกีตาร์ครั้งแรก', 0, 0],
      ['เร็ว ๆ นี้', 1, 21],
    ]);
  });

  it('falls back to the fixed ranges without section data', () => {
    const slots = layoutPath('other', [lesson('a', 1), lesson('b', 2)]);
    expect(sectionUnits(slots, [])).toEqual(unitsFor(2));
  });

  it('names a section without a title by its number only', () => {
    expect(sectionName(3, '  ')).toBe('ช่วงที่ 3');
  });
});
