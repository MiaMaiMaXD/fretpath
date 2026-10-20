export function youtubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const m =
    /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{11})(?:[&#].*)?$/.exec(url.trim()) ??
    /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?&#].*)?$/.exec(url.trim());
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

/** Same pattern as the lesson_contents.video_url CHECK constraint: what the database will actually accept. */
export function isStoredYouTubeUrl(url: string): boolean {
  return /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[A-Za-z0-9_-]{11}/.test(url);
}
