/* The learning path drawn as a guitar neck: lesson N (0-based) sits on fret N.
   The course concept runs fret 0 (open strings) to fret 21; frets without a lesson yet are drawn empty. */

export const FRET_COUNT = 22;

/** Inlay positions on a real fretboard; 12 is the double dot. */
export const INLAYS: ReadonlySet<number> = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21]);

export type PathUnit = { name: string; from: number; to: number };

export const UNITS: readonly PathUnit[] = [
  { name: 'ช่วงที่ 1 · จับกีตาร์ครั้งแรก', from: 0, to: 4 },
  { name: 'ช่วงที่ 2 · เล่นเพลงแรก', from: 5, to: 9 },
  { name: 'ช่วงที่ 3 · เข้าใจคอร์ด', from: 10, to: 14 },
  { name: 'ช่วงที่ 4 · ทั่วคอกีตาร์', from: 15, to: 21 },
];

/** Units that hold at least one of `count` lessons; a course longer than 22 lessons gets one more unit for the rest. */
export function unitsFor(count: number): PathUnit[] {
  const units = UNITS.filter((u) => u.from < count).map((u) => ({ ...u, to: Math.min(u.to, count - 1) }));
  if (count > FRET_COUNT) units.push({ name: 'บทเพิ่มเติม', from: FRET_COUNT, to: count - 1 });
  return units;
}
