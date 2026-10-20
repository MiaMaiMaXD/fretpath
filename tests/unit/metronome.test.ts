import { describe, expect, it } from 'vitest';
import { beatIntervalMs, clampBpm, scheduleClicks } from '@/lib/audio/metronome';

function fakeCtx() {
  const node = () => ({ connect: () => {}, disconnect: () => {}, start: () => {}, stop: () => {}, onended: null });
  const ctx = {
    currentTime: 0,
    destination: {},
    createGain: () => ({ ...node(), gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }),
    createOscillator: () => ({ ...node(), type: 'sine', frequency: { value: 0 } }),
  };
  return ctx as unknown as AudioContext;
}

describe('clampBpm', () => {
  it('clamps to 40..208 and rounds', () => {
    expect(clampBpm(10)).toBe(40);
    expect(clampBpm(300)).toBe(208);
    expect(clampBpm(120.4)).toBe(120);
    expect(clampBpm(Number.NaN)).toBe(40);
  });
});

describe('beatIntervalMs', () => {
  it('is 60000 / bpm', () => {
    expect(beatIntervalMs(120)).toBe(500);
    expect(beatIntervalMs(60)).toBe(1000);
  });
});

describe('scheduleClicks', () => {
  it('returns AudioContext-clock times spaced by the beat interval', () => {
    expect(scheduleClicks(fakeCtx(), 120, 1.0, 4)).toEqual([1, 1.5, 2, 2.5]);
  });
  it('returns nothing for count 0', () => {
    expect(scheduleClicks(fakeCtx(), 120, 1.0, 0)).toEqual([]);
  });
});
