const MS_PER_MINUTE = 60_000;

/** Elapsed milliseconds to whole minutes, rounded to nearest, clamped to 1..600. */
export function minutesFromElapsed(ms: number): number {
  return Math.min(600, Math.max(1, Math.round(ms / MS_PER_MINUTE)));
}
