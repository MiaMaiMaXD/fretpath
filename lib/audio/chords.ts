import { OPEN_STRINGS } from './strings';

export type ChordName = 'Em' | 'Am' | 'C' | 'D' | 'G' | 'F';

/** Frets ordered string 6 -> 1; 'x' = muted, 0 = open. */
export const CHORDS: Record<ChordName, { frets: (number | 'x')[]; fingers: (number | null)[] }> = {
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [null, 2, 3, null, null, null] },
  Am: { frets: ['x', 0, 2, 2, 1, 0], fingers: [null, null, 2, 3, 1, null] },
  C: { frets: ['x', 3, 2, 0, 1, 0], fingers: [null, 3, 2, null, 1, null] },
  D: { frets: ['x', 'x', 0, 2, 3, 2], fingers: [null, null, null, 1, 3, 2] },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, null, null, null, 3] },
  F: { frets: ['x', 'x', 3, 2, 1, 1], fingers: [null, null, 3, 2, 1, 1] },
};

export function chordFrequencies(name: keyof typeof CHORDS): number[] {
  const out: number[] = [];
  CHORDS[name].frets.forEach((fret, i) => {
    if (fret === 'x') return;
    out.push(OPEN_STRINGS[i].hz * 2 ** (fret / 12));
  });
  return out;
}
