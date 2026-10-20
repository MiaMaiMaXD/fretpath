import { describe, expect, it } from 'vitest';
import { minutesFromElapsed } from '@/lib/timer';

describe('minutesFromElapsed', () => {
  it('rounds and clamps to 1..600', () => {
    expect(minutesFromElapsed(0)).toBe(1);
    expect(minutesFromElapsed(89_000)).toBe(1);
    expect(minutesFromElapsed(91_000)).toBe(2);
    expect(minutesFromElapsed(11 * 60 * 60 * 1000)).toBe(600);
    expect(minutesFromElapsed(-5)).toBe(1);
  });
});
