import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/safe-next';

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/path?x=1')).toBe('/path?x=1');
  });
  it('rejects unsafe values', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '', null, undefined])
      expect(safeNextPath(bad)).toBe('/dashboard');
  });
});
