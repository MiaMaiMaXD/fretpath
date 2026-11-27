import { describe, expect, it } from 'vitest';
import { bangkokLastDays, bangkokToday, bangkokWeekRange, timeUntil } from '@/lib/bangkok';

describe('bangkok', () => {
  it('bangkokToday uses Thai time', () => {
    expect(bangkokToday(new Date('2026-10-19T17:30:00Z'))).toBe('2026-10-20');
    expect(bangkokToday(new Date('2026-10-19T16:59:00Z'))).toBe('2026-10-19');
  });
  it('bangkokWeekRange is Monday..Sunday', () => {
    expect(bangkokWeekRange(new Date('2026-10-18T17:05:00Z'))).toEqual({ start: '2026-10-19', end: '2026-10-25' });
    expect(bangkokWeekRange(new Date('2026-10-18T16:55:00Z'))).toEqual({ start: '2026-10-12', end: '2026-10-18' });
  });
  it('bangkokLastDays is oldest to newest ending today', () => {
    expect(bangkokLastDays(7, new Date('2026-11-02T05:00:00Z'))).toEqual(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });
  it('timeUntil counts hours and minutes', () => {
    const now = new Date('2026-11-27T05:00:00Z');
    expect(timeUntil(new Date('2026-11-28T04:59:00Z'), now)).toBe('23 ชั่วโมง 59 นาที');
    expect(timeUntil(new Date('2026-11-27T05:00:20Z'), now)).toBe('1 นาที');
  });
});
