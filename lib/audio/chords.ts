import { OPEN_STRINGS } from './strings';

export type ChordName = 'C' | 'G' | 'Am' | 'F' | 'Em' | 'D' | 'Dm' | 'A' | 'E' | 'Bm';

/** Every chord admins can pick as a lesson example, in the order the editor shows them. */
export const CHORD_NAMES: readonly ChordName[] = ['C', 'G', 'Am', 'F', 'Em', 'D', 'Dm', 'A', 'E', 'Bm'];

export function isChordName(s: string): s is ChordName {
  return (CHORD_NAMES as readonly string[]).includes(s);
}

/** Frets ordered string 6 -> 1; 'x' = muted, 0 = open. */
export const CHORDS: Record<ChordName, { frets: (number | 'x')[]; fingers: (number | null)[] }> = {
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [null, 2, 3, null, null, null] },
  Am: { frets: ['x', 0, 2, 2, 1, 0], fingers: [null, null, 2, 3, 1, null] },
  C: { frets: ['x', 3, 2, 0, 1, 0], fingers: [null, 3, 2, null, 1, null] },
  D: { frets: ['x', 'x', 0, 2, 3, 2], fingers: [null, null, null, 1, 3, 2] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, null, null, null, 3] },
  F: { frets: ['x', 'x', 3, 2, 1, 1], fingers: [null, null, 3, 2, 1, 1] },
  Dm: { frets: ['x', 'x', 0, 2, 3, 1], fingers: [null, null, null, 2, 3, 1] },
  A: { frets: ['x', 0, 2, 2, 2, 0], fingers: [null, null, 1, 2, 3, null] },
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [null, 2, 3, 1, null, null] },
  // barre on fret 2 (index finger across strings 5-1)
  Bm: { frets: ['x', 2, 4, 4, 3, 2], fingers: [null, 1, 3, 4, 2, 1] },
};

export function chordFrequencies(name: keyof typeof CHORDS): number[] {
  const out: number[] = [];
  CHORDS[name].frets.forEach((fret, i) => {
    if (fret === 'x') return;
    out.push(OPEN_STRINGS[i].hz * 2 ** (fret / 12));
  });
  return out;
}

const FINGER_NAME: Record<number, string> = { 1: 'นิ้วชี้', 2: 'นิ้วกลาง', 3: 'นิ้วนาง', 4: 'นิ้วก้อย' };

/** "นิ้วชี้: ช่อง 1 สาย 2 | นิ้วกลาง: ช่อง 2 สาย 4 | …" — where each finger goes (strings numbered 6..1). */
export function fingerGuide(name: ChordName): string {
  const { frets, fingers } = CHORDS[name];
  const spots = new Map<number, { fret: number; strings: number[] }>();
  fingers.forEach((f, i) => {
    const fret = frets[i];
    if (!f || typeof fret !== 'number' || fret === 0) return;
    const s = spots.get(f) ?? { fret, strings: [] };
    s.strings.push(6 - i);
    spots.set(f, s);
  });
  return [...spots.entries()]
    .sort(([a], [b]) => a - b)
    .map(([f, s]) => `${FINGER_NAME[f]}: ช่อง ${s.fret} สาย ${s.strings.join(' และ ')}${s.strings.length > 1 ? ' (ทาบ)' : ''}`)
    .join(' | ');
}
