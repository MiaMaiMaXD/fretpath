export const OPEN_STRINGS = [
  { string: 6, note: 'E2', hz: 82.41 },
  { string: 5, note: 'A2', hz: 110.0 },
  { string: 4, note: 'D3', hz: 146.83 },
  { string: 3, note: 'G3', hz: 196.0 },
  { string: 2, note: 'B3', hz: 246.94 },
  { string: 1, note: 'E4', hz: 329.63 },
] as const satisfies readonly { string: 1 | 2 | 3 | 4 | 5 | 6; note: string; hz: number }[];

type AudioWindow = { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };

function audioCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as AudioWindow;
  return w.AudioContext || w.webkitAudioContext;
}

export function audioSupported(): boolean {
  return audioCtor() !== undefined;
}

let shared: AudioContext | null = null;

/** Lazily creates the shared AudioContext; call only from a user gesture. */
export function getAudioContext(): AudioContext | null {
  const Ctor = audioCtor();
  if (!Ctor) return null;
  if (!shared) shared = new Ctor();
  if (shared.state === 'suspended') void shared.resume().catch(() => {});
  return shared;
}

/** Plucked-string sound: a few harmonics with a fast decay envelope. */
export function pluck(ctx: AudioContext, hz: number, durationSec = 1.5, volume = 1): void {
  try {
    const t0 = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.35 * volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);
    gain.connect(ctx.destination);
    const harmonics = [
      { mult: 1, level: 1 },
      { mult: 2, level: 0.4 },
      { mult: 3, level: 0.15 },
    ];
    let remaining = harmonics.length;
    for (const h of harmonics) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = h.level;
      osc.type = 'triangle';
      osc.frequency.value = hz * h.mult;
      osc.connect(g);
      g.connect(gain);
      osc.onended = () => {
        osc.disconnect();
        g.disconnect();
        remaining -= 1;
        if (remaining === 0) gain.disconnect();
      };
      osc.start(t0);
      osc.stop(t0 + durationSec + 0.05);
    }
  } catch {
    // Audio failures must never break the page.
  }
}
