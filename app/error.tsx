'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">เกิดข้อผิดพลาด</h1>
      <button type="button" onClick={() => reset()} className="rounded border border-neutral-400 px-4 py-2">
        ลองใหม่
      </button>
    </main>
  );
}
