export function youtubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const m =
    /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{11})(?:[&#].*)?$/.exec(url.trim()) ??
    /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?&#].*)?$/.exec(url.trim());
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}
