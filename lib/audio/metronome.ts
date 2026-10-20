export const MIN_BPM = 40;
export const MAX_BPM = 208;
export const BEATS_PER_BAR = 4;

export function clampBpm(n: number): number {
  if (!Number.isFinite(n)) return MIN_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));
}

export function beatIntervalMs(bpm: number): number {
  return 60000 / bpm;
}

/** Short click; the first beat of a 4/4 bar is higher pitched and louder. */
function click(ctx: AudioContext, time: number, accent: boolean): void {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(accent ? 0.35 : 0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(time);
    osc.stop(time + 0.06);
  } catch {
    // Audio failures must never break the page.
  }
}

/**
 * Schedules `count` clicks on the AudioContext clock starting at `startTime` (seconds) and returns their times.
 * `firstBeat` is the beat index (0-based, counted from the start of a bar) of the first click.
 */
export function scheduleClicks(ctx: AudioContext, bpm: number, startTime: number, count: number, firstBeat = 0): number[] {
  const step = beatIntervalMs(bpm) / 1000;
  const times: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = startTime + i * step;
    times.push(t);
    click(ctx, t, (firstBeat + i) % BEATS_PER_BAR === 0);
  }
  return times;
}
