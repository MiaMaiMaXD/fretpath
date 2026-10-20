'use client';

import { useState } from 'react';
import { youtubeEmbedUrl } from '@/lib/youtube';

export function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const src = youtubeEmbedUrl(url);
  return (
    <div className="aspect-video w-full overflow-hidden rounded border">
      {src && !failed ? (
        <iframe
          src={src}
          title={`วิดีโอบทเรียน: ${title}`}
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={() => setFailed(true)}
        />
      ) : (
        <p className="flex h-full items-center justify-center p-4 text-center">โหลดวิดีโอไม่ได้</p>
      )}
    </div>
  );
}
