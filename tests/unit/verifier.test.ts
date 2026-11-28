import { describe, expect, it } from 'vitest';
import { chordStringNotes, detectPitch, midiName } from '@/lib/audio/detect';
import { ChordVerifier, LEVEL_WINDOW, matches, playedStrings, type TickResult } from '@/lib/audio/verifier';

const SR = 48000;
const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** One tick's newest LEVEL_WINDOW samples of a decaying string-like tone (fundamental + 2 harmonics). */
function toneWindow(midi: number, tick: number, amp = 0.3): Float32Array {
  const hz = midiHz(midi);
  const out = new Float32Array(LEVEL_WINDOW);
  const start = tick * (SR / 20); // ticks are 50 ms apart
  for (let i = 0; i < LEVEL_WINDOW; i++) {
    const t = (start + i) / SR;
    out[i] = amp * (Math.sin(2 * Math.PI * hz * t) + 0.4 * Math.sin(4 * Math.PI * hz * t) + 0.15 * Math.sin(6 * Math.PI * hz * t)) / 1.55;
  }
  return out;
}

/** Pluck one note for `ticks` ticks; returns every tick result. */
function pluck(v: ChordVerifier, midi: number, ticks = 8): TickResult[] {
  return Array.from({ length: ticks }, (_, t) => v.tick(toneWindow(midi, t), SR));
}

const silence = () => new Float32Array(LEVEL_WINDOW);

describe('detect', () => {
  it('maps chord shapes to string notes (x = not played)', () => {
    expect(chordStringNotes('C').map((s) => (s.midi === null ? 'x' : midiName(s.midi)))).toEqual(['x', 'C3', 'E3', 'G3', 'C4', 'E4']);
    expect(playedStrings('D').map((s) => s.string)).toEqual([4, 3, 2, 1]);
  });

  it('YIN finds the pitch of every open string', () => {
    for (const m of [40, 45, 50, 55, 59, 64]) {
      const p = detectPitch(toneWindow(m, 3), SR);
      expect(p).not.toBeNull();
      expect(Math.round(69 + 12 * Math.log2(p!.hz / 440))).toBe(m);
    }
  });
});

describe('ChordVerifier', () => {
  it('passes a chord when every string is plucked correctly, thick to thin', () => {
    const v = new ChordVerifier('C');
    for (const s of v.want) {
      const verdicts = pluck(v, s.midi).flatMap((r) => (r.verdict ? [r.verdict] : []));
      expect(verdicts).toEqual([{ kind: 'pass', string: s.string, heard: s.midi, expected: s.midi }]);
      v.tick(silence(), SR);
    }
    expect(v.passed).toBe(true);
  });

  it('gives exactly one verdict per pluck, after 4 stable ticks', () => {
    const v = new ChordVerifier('Em');
    const results = pluck(v, 40, 12);
    expect(results.findIndex((r) => r.verdict)).toBe(3);
    expect(results.filter((r) => r.verdict)).toHaveLength(1);
  });

  it('marks a wrong note and stays on the same string', () => {
    const v = new ChordVerifier('C');
    const verdict = pluck(v, 49).find((r) => r.verdict)?.verdict; // C#3 instead of C3
    expect(verdict).toEqual({ kind: 'wrong', string: 5, heard: 49, expected: 48 });
    expect(v.step).toBe(0);
  });

  it('ignores silence below the gate', () => {
    const v = new ChordVerifier('C');
    const r = v.tick(silence(), SR);
    expect(r.gated).toBe(true);
    expect(r.verdict).toBeNull();
  });

  it('does not judge an earlier string that is still ringing', () => {
    const v = new ChordVerifier('C');
    pluck(v, 48); // string 5 passes
    v.tick(silence(), SR);
    expect(v.step).toBe(1);
    expect(pluck(v, 48).some((r) => r.verdict)).toBe(false);
    expect(v.step).toBe(1);
  });

  it('accepts an octave slip unless that octave is another note of the chord', () => {
    const cMidis = playedStrings('C').map((s) => s.midi);
    expect(matches(40, 52, cMidis)).toBe(true); // E2 for E3 is fine (E2 is not in C)
    expect(matches(60, 48, cMidis)).toBe(false); // C4 for C3: C4 is string 2
  });
});
