'use client';

import { useSyncExternalStore } from 'react';
import { OPEN_STRINGS, audioSupported, getAudioContext, pluck } from '@/lib/audio/strings';

const subscribe = () => () => {};

export function useAudioSupported(): boolean {
  // Server snapshot is true so SSR markup is stable; the client corrects it after hydration.
  return useSyncExternalStore(subscribe, audioSupported, () => true);
}

export function StringPlayer() {
  const supported = useAudioSupported();
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">ฟังเสียงสายเปล่า</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {OPEN_STRINGS.map((s) => (
          <button
            key={s.string}
            type="button"
            disabled={!supported}
            onClick={() => {
              const ctx = getAudioContext();
              if (ctx) pluck(ctx, s.hz);
            }}
            className="rounded border px-3 py-2 disabled:opacity-50"
          >
            {`สาย ${s.string} (${s.note[0]})`}
          </button>
        ))}
      </div>
      {!supported ? <p role="status">เบราว์เซอร์นี้ไม่รองรับเสียง</p> : null}
    </section>
  );
}
