import { describe, expect, it } from 'vitest';
import { isOwnAvatarUrl } from '@/lib/avatar';

const BASE = 'http://127.0.0.1:54321';
const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const url = (id: string, file: string) => `${BASE}/storage/v1/object/public/avatars/${id}/${file}`;

describe('isOwnAvatarUrl', () => {
  it('accepts own avatar file, with optional cache-buster', () => {
    expect(isOwnAvatarUrl(url(ME, 'avatar.png'), ME, BASE)).toBe(true);
    expect(isOwnAvatarUrl(url(ME, 'avatar.jpg?v=123'), ME, `${BASE}/`)).toBe(true);
  });
  it('rejects other users, other hosts, traversal and junk', () => {
    expect(isOwnAvatarUrl(url(OTHER, 'avatar.png'), ME, BASE)).toBe(false);
    expect(isOwnAvatarUrl(`https://evil.example/storage/v1/object/public/avatars/${ME}/avatar.png`, ME, BASE)).toBe(false);
    expect(isOwnAvatarUrl(url(ME, '../x/avatar.png'), ME, BASE)).toBe(false);
    expect(isOwnAvatarUrl(url(ME, 'evil.html'), ME, BASE)).toBe(false);
    expect(isOwnAvatarUrl(url(ME, 'avatar.png'), ME, undefined)).toBe(false);
  });
});
