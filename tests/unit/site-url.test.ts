import { afterEach, describe, expect, it } from 'vitest';
import { siteUrl } from '@/lib/site-url';

const orig = process.env.NEXT_PUBLIC_SITE_URL;
afterEach(() => {
  if (orig === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = orig;
});

describe('siteUrl', () => {
  it('defaults and trims trailing slash', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteUrl()).toBe('http://localhost:3000');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://x.example/';
    expect(siteUrl()).toBe('https://x.example');
  });
});
