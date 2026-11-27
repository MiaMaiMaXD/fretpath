import { describe, expect, it } from 'vitest';
import { CHORD_NAMES, chordFrequencies, CHORDS, fingerGuide } from '@/lib/audio/chords';
import { OPEN_STRINGS } from '@/lib/audio/strings';

describe('chordFrequencies', () => {
  it('Em plays six strings starting at E2', () => {
    const f = chordFrequencies('Em');
    expect(f).toHaveLength(6);
    expect(f[0]).toBeCloseTo(82.41, 2);
  });
  it('D plays four strings starting at D3', () => {
    const f = chordFrequencies('D');
    expect(f).toHaveLength(4);
    expect(f[0]).toBeCloseTo(146.83, 2);
  });
  it('C skips the low string and starts at C3', () => {
    expect(chordFrequencies('C')[0]).toBeCloseTo(130.81, 2);
  });
  it('has six open strings and ten chords, all listed for the editor', () => {
    expect(OPEN_STRINGS).toHaveLength(6);
    expect(Object.keys(CHORDS)).toHaveLength(10);
    expect([...CHORD_NAMES].sort()).toEqual(Object.keys(CHORDS).sort());
  });
  it('every chord has six strings of frets and fingers', () => {
    for (const c of Object.values(CHORDS)) {
      expect(c.frets).toHaveLength(6);
      expect(c.fingers).toHaveLength(6);
    }
  });
  it('fingerGuide says where each finger goes', () => {
    expect(fingerGuide('C')).toBe('นิ้วชี้: ช่อง 1 สาย 2 | นิ้วกลาง: ช่อง 2 สาย 4 | นิ้วนาง: ช่อง 3 สาย 5');
    expect(fingerGuide('F')).toBe('นิ้วชี้: ช่อง 1 สาย 2 และ 1 (ทาบ) | นิ้วกลาง: ช่อง 2 สาย 3 | นิ้วนาง: ช่อง 3 สาย 4');
  });
});
