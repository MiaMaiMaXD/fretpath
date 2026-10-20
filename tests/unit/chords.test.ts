import { describe, expect, it } from 'vitest';
import { chordFrequencies, CHORDS } from '@/lib/audio/chords';
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
  it('has six open strings and six chords', () => {
    expect(OPEN_STRINGS).toHaveLength(6);
    expect(Object.keys(CHORDS)).toHaveLength(6);
  });
});
