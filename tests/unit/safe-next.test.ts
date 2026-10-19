import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/safe-next';

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/path?x=1')).toBe('/path?x=1');
    expect(safeNextPath('/lessons/first-chords/quiz')).toBe('/lessons/first-chords/quiz');
  });
  it('rejects unsafe values', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', '/\t/evil.example', '/\n/evil.example', '/\r/evil.example', '/ /evil.example', '/path\\x', 'javascript:alert(1)', '', null, undefined])
      expect(safeNextPath(bad)).toBe('/dashboard');
  });
});
