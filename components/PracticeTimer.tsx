'use client';

import { useEffect, useState } from 'react';
import { minutesFromElapsed } from '@/lib/timer';

function format(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

const BTN = 'rounded border border-neutral-400 px-3 py-1 disabled:opacity-50';

/** Elapsed time comes from timestamps (startedAt + accumulatedMs), never from counting ticks. */
export function PracticeTimer({ onUse }: { onUse: (minutes: number) => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [, setTick] = useState(0);

  // The interval only triggers a re-render; the displayed time is derived from Date.now().
  useEffect(() => {
    if (startedAt === null) return;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [startedAt]);

  // eslint-disable-next-line react-hooks/purity
  const elapsed = accumulatedMs + (startedAt === null ? 0 : Date.now() - startedAt);
  const running = startedAt !== null;

  return (
    <section aria-label="ตัวจับเวลา" className="flex flex-col gap-2 rounded border border-neutral-300 p-3 dark:border-neutral-700">
      <p className="font-mono text-3xl">{format(elapsed)}</p>
      <div className="flex flex-wrap gap-2">
        {running ? (
          <button
            type="button"
            className={BTN}
            onClick={() => {
              setAccumulatedMs(accumulatedMs + Date.now() - startedAt);
              setStartedAt(null);
            }}
          >
            หยุด
          </button>
        ) : (
          <button type="button" className={BTN} onClick={() => setStartedAt(Date.now())}>
            เริ่ม
          </button>
        )}
        <button
          type="button"
          className={BTN}
          onClick={() => {
            setStartedAt(null);
            setAccumulatedMs(0);
          }}
        >
          รีเซ็ต
        </button>
        <button type="button" className={BTN} disabled={elapsed <= 0} onClick={() => onUse(minutesFromElapsed(elapsed))}>
          ใช้เวลานี้
        </button>
      </div>
    </section>
  );
}
