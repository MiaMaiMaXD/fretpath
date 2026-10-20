import { describe, expect, it } from 'vitest';
import { fetchAll } from '@/lib/data/paging';

describe('fetchAll', () => {
  it('concatenates pages of 1000, 1000, 3', async () => {
    const total = 2003;
    const calls: [number, number][] = [];
    const rows = await fetchAll<number>(async (from, to) => {
      calls.push([from, to]);
      const data = Array.from({ length: Math.max(0, Math.min(to + 1, total) - from) }, (_, i) => from + i);
      return { data, error: null };
    });
    expect(rows).toHaveLength(2003);
    expect(new Set(rows).size).toBe(2003);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('stops after an exact-size page followed by an empty one', async () => {
    const rows = await fetchAll<number>(async (from) => ({ data: from === 0 ? [1, 2] : [], error: null }), 2);
    expect(rows).toEqual([1, 2]);
  });

  it('throws on error', async () => {
    await expect(fetchAll<number>(async () => ({ data: null, error: { message: 'boom' } }))).rejects.toThrow('boom');
  });
});
