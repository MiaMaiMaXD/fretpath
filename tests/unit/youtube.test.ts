import { describe, expect, it } from 'vitest';
import { youtubeEmbedUrl } from '@/lib/youtube';

const OUT = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

describe('youtubeEmbedUrl', () => {
  it('handles watch?v= and youtu.be', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(OUT);
    expect(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(OUT);
  });
  it('returns null for other hosts and null', () => {
    expect(youtubeEmbedUrl('https://vimeo.com/1')).toBeNull();
    expect(youtubeEmbedUrl(null)).toBeNull();
  });
});
