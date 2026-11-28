// String-by-string chord verifier. Shared by the Chord Meter page, the research
// (pilot data-collection) page and the offline evaluation harness, so that all
// three run exactly the same decision logic.
import { chordStringNotes, detectPitch, hzToMidi, rms } from './detect';
import type { ChordName } from './chords';

export const FFT_SIZE = 16384;
export const LEVEL_WINDOW = 2048;
export const TICK_MS = 50;

export type VerifierParams = {
  /** Level gate in dBFS; below it nothing is processed. */
  gateDb: number;
  /** A note must hold for exactly this many consecutive ticks before it counts. */
  stableTicks: number;
  /** YIN estimates with clarity below this are discarded. */
  minClarity: number;
  /** Accept an octave slip unless that octave is another note of the chord. */
  octaveTolerance: boolean;
  /** Ignore a stable note that matches an already-passed string (still ringing). */
  ignoreEarlierStrings: boolean;
};

export const DEFAULT_PARAMS: VerifierParams = {
  gateDb: -45,
  stableTicks: 4,
  minClarity: 0.85,
  octaveTolerance: true,
  ignoreEarlierStrings: true,
};

export type PlayedString = { string: number; midi: number };
export type Verdict = { kind: 'pass' | 'wrong'; string: number; heard: number; expected: number };
export type TickResult = {
  /** RMS of the newest LEVEL_WINDOW samples. */
  level: number;
  gated: boolean;
  hz: number | null;
  clarity: number | null;
  /** Rounded MIDI note that survived the clarity threshold, or null. */
  midi: number | null;
  stable: number;
  verdict: Verdict | null;
};

/** Strings the learner must pluck for this chord, thick to thin. */
export function playedStrings(name: ChordName): PlayedString[] {
  return chordStringNotes(name).filter((s): s is PlayedString => s.midi !== null);
}

/** Whether a stable pitch counts as the expected string. */
export function matches(heard: number, expected: number, chordMidis: number[], octaveTolerance = true): boolean {
  if (heard === expected) return true;
  return octaveTolerance && Math.abs(heard - expected) === 12 && !chordMidis.includes(heard);
}

export class ChordVerifier {
  readonly want: PlayedString[];
  step = 0;
  private lastMidi: number | null = null;
  private stable = 0;
  private readonly chordMidis: number[];

  constructor(
    readonly chord: ChordName,
    public params: VerifierParams = DEFAULT_PARAMS,
    /** Optional explicit note list (used by the offline evaluation); defaults to the chord shape. */
    notes?: PlayedString[],
  ) {
    this.want = notes ?? playedStrings(chord);
    this.chordMidis = this.want.map((s) => s.midi);
  }

  get passed() {
    return this.step >= this.want.length;
  }

  /**
   * Move on to the next string without passing the current one. Used only by the data-collection
   * page after a deliberately wrong string has been judged, so that the remaining strings are still
   * checked; the learner-facing page always waits for the string to be corrected.
   */
  skip() {
    if (!this.passed) this.step++;
  }

  /** Process one 50 ms tick. `recent` is the newest LEVEL_WINDOW samples. */
  tick(recent: Float32Array, sampleRate: number): TickResult {
    const p = this.params;
    const level = rms(recent);
    const base = { level, hz: null, clarity: null, midi: null, verdict: null };
    if (level < 10 ** (p.gateDb / 20)) {
      this.lastMidi = null;
      this.stable = 0;
      return { ...base, gated: true, stable: 0 };
    }
    // A finished chord stays passed until the learner moves on.
    if (this.passed) return { ...base, gated: false, stable: this.stable };

    const pitch = detectPitch(recent, sampleRate);
    const midi = pitch && pitch.clarity >= p.minClarity ? Math.round(hzToMidi(pitch.hz)) : null;
    this.stable = midi !== null && midi === this.lastMidi ? this.stable + 1 : midi !== null ? 1 : 0;
    this.lastMidi = midi;
    const out: TickResult = { level, gated: false, hz: pitch?.hz ?? null, clarity: pitch?.clarity ?? null, midi, stable: this.stable, verdict: null };
    if (midi === null || this.stable !== p.stableTicks) return out;

    const exp = this.want[this.step];
    if (matches(midi, exp.midi, this.chordMidis, p.octaveTolerance)) {
      out.verdict = { kind: 'pass', string: exp.string, heard: midi, expected: exp.midi };
      this.step++;
    } else if (p.ignoreEarlierStrings && this.want.slice(0, this.step).some((s) => matches(midi, s.midi, this.chordMidis, p.octaveTolerance))) {
      // An earlier string still ringing is not a mistake.
    } else {
      out.verdict = { kind: 'wrong', string: exp.string, heard: midi, expected: exp.midi };
    }
    return out;
  }
}
