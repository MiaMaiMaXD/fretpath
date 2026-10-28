// SPIKE (throwaway): note and chord detection from microphone audio.
import { CHORDS, type ChordName } from '@/lib/audio/chords';

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

/** Pitch classes (C = 0) of each chord's triad. */
export const CHORD_TONES: Record<ChordName, number[]> = {
  Em: [4, 7, 11],
  Am: [9, 0, 4],
  C: [0, 4, 7],
  D: [2, 6, 9],
  G: [7, 11, 2],
  F: [5, 9, 0],
};

export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

export function pitchClass(hz: number): number {
  return ((Math.round(hzToMidi(hz)) % 12) + 12) % 12;
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

/**
 * 12-bin chroma from an analyser's dB spectrum. Only spectral peaks within 45 dB of
 * the loudest one count, so the noise floor does not smear across every pitch class.
 */
export function chroma(db: Float32Array, sampleRate: number, fftSize: number): number[] {
  const out = new Array<number>(12).fill(0);
  const binHz = sampleRate / fftSize;
  const lo = Math.max(1, Math.floor(70 / binHz));
  const hi = Math.min(db.length - 2, Math.ceil(1400 / binHz));
  let max = -Infinity;
  for (let i = lo; i <= hi; i++) if (db[i] > max) max = db[i];
  if (!Number.isFinite(max)) return out;
  const floor = max - 45;
  for (let i = lo; i <= hi; i++) {
    const v = db[i];
    if (v < floor || v < db[i - 1] || v < db[i + 1]) continue;
    const a = db[i - 1];
    const c = db[i + 1];
    const denom = a - 2 * v + c;
    const p = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
    const hz = (i + p) * binHz;
    const weight = 10 ** ((v - max) / 20) * (hz > 1000 ? 0.5 : 1);
    out[pitchClass(hz)] += weight;
  }
  const top = Math.max(...out);
  return top > 0 ? out.map((x) => x / top) : out;
}

/** Cosine similarity of the chroma against each chord's triad template, best first. */
export function rankChords(c: number[]): { name: ChordName; score: number }[] {
  const norm = Math.sqrt(c.reduce((s, x) => s + x * x, 0));
  return (Object.keys(CHORD_TONES) as ChordName[])
    .map((name) => {
      const tones = CHORD_TONES[name];
      const dot = tones.reduce((s, pc) => s + c[pc], 0);
      return { name, score: norm > 0 ? dot / (norm * Math.sqrt(tones.length)) : 0 };
    })
    .sort((x, y) => y.score - x.score);
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
