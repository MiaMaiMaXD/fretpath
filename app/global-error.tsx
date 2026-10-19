'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="th">
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
        <h1>เกิดข้อผิดพลาด</h1>
        <button type="button" onClick={() => reset()}>
          ลองใหม่
        </button>
      </body>
    </html>
  );
}
