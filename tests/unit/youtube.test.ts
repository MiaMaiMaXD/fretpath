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

describe('isStoredYouTubeUrl', () => {
  it('accepts only what the DB check accepts', async () => {
    const { isStoredYouTubeUrl } = await import('@/lib/youtube');
    expect(isStoredYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isStoredYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isStoredYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isStoredYouTubeUrl('http://youtu.be/dQw4w9WgXcQ')).toBe(false);
    expect(isStoredYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    expect(isStoredYouTubeUrl('https://www.youtube.com/watch?x=1&v=dQw4w9WgXcQ')).toBe(false);
    expect(isStoredYouTubeUrl('https://vimeo.com/1')).toBe(false);
  });
});
