import { describe, expect, it } from 'vitest';
import { chartScale, chartSummary } from '@/lib/chart';

describe('chartSummary', () => {
  it('lists every bar with its value and unit', () => {
    expect(chartSummary('นาทีฝึก', [{ label: '1 ต.ค.', value: 45 }, { label: '2 ต.ค.', value: 0 }], 'นาที')).toBe(
      'นาทีฝึก: 1 ต.ค. 45 นาที, 2 ต.ค. 0 นาที',
    );
  });

  it('reads a missing value with the empty label, not as zero (TC-DSH-06)', () => {
    const bars = [
      { label: 'บท 1', value: 100 },
      { label: 'บท 2', value: 0 },
      { label: 'บท 3', value: null },
    ];
    expect(chartSummary('คะแนนสูงสุดรายบท', bars, '%', 'ยังไม่สอบ')).toBe(
      'คะแนนสูงสุดรายบท: บท 1 100 %, บท 2 0 %, บท 3 ยังไม่สอบ',
    );
  });

  it('falls back to a generic empty label', () => {
    expect(chartSummary('t', [{ label: 'a', value: null }], '%')).toBe('t: a ไม่มีข้อมูล');
  });
});

describe('chartScale', () => {
  it('uses the fixed max when given', () => {
    expect(chartScale([{ label: 'a', value: 30 }], 100)).toBe(100);
  });

  it('scales to the largest value and ignores missing values', () => {
    expect(chartScale([{ label: 'a', value: 30 }, { label: 'b', value: null }, { label: 'c', value: 45 }])).toBe(45);
  });

  it('is 0 when there is no value at all', () => {
    expect(chartScale([{ label: 'a', value: null }])).toBe(0);
    expect(chartScale([])).toBe(0);
  });
});
