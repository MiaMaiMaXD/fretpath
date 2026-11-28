// Note detection from microphone audio (YIN). From the instructor's chord-meter (2026-11); the detection
// code is unchanged so the app matches the published evaluation. Chroma ranking is not used here.
import { CHORDS, type ChordName } from './chords';

// MIDI numbers of the open strings, string 6 -> 1 (E2 A2 D3 G3 B3 E4).
const OPEN_MIDI = [40, 45, 50, 55, 59, 64];

/** The note each string should sound for a chord shape, string 6 -> 1; null = not played. */
export function chordStringNotes(name: ChordName): { string: number; midi: number | null }[] {
  return CHORDS[name].frets.map((fret, i) => ({ string: 6 - i, midi: fret === 'x' ? null : OPEN_MIDI[i] + fret }));
}

/** e.g. 48 -> "C3". */
export function midiName(midi: number): string {
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

/** Cents off the nearest equal-tempered note. */
export function centsOff(hz: number): number {
  const m = hzToMidi(hz);
  return Math.round((m - Math.round(m)) * 100);
}

export function rms(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

/** YIN pitch estimate for a single note; null when no clear period is found. */
export function detectPitch(buf: Float32Array, sampleRate: number): { hz: number; clarity: number } | null {
  const minTau = Math.floor(sampleRate / 1000);
  const maxTau = Math.floor(sampleRate / 75);
  const w = buf.length - maxTau;
  if (w <= 0) return null;
  const d = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let s = 0;
    for (let j = 0; j < w; j++) {
      const diff = buf[j] - buf[j + tau];
      s += diff * diff;
    }
    d[tau] = s;
  }
  // Cumulative mean normalized difference.
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    d[tau] = running === 0 ? 1 : (d[tau] * tau) / running;
  }
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (d[t] < 0.15) {
      while (t + 1 <= maxTau && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  let better = tau;
  if (tau > 1 && tau < maxTau) {
    const a = d[tau - 1];
    const b = d[tau];
    const c = d[tau + 1];
    const denom = a - 2 * b + c;
    if (denom !== 0) better = tau + (0.5 * (a - c)) / denom;
  }
  return { hz: sampleRate / better, clarity: 1 - d[tau] };
}
