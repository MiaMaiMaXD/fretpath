'use client';

import { useEffect, useState } from 'react';
import { minutesFromElapsed } from '@/lib/timer';

function format(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Elapsed time comes from timestamps (startedAt + accumulatedMs), never from counting ticks. */
export function PracticeTimer({ onUse }: { onUse: (minutes: number) => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [, setTick] = useState(0);
  const [used, setUsed] = useState<string | null>(null);

  // The interval only triggers a re-render; the displayed time is derived from Date.now().
  useEffect(() => {
    if (startedAt === null) return;
    const t = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [startedAt]);

  // eslint-disable-next-line react-hooks/purity
  const elapsed = accumulatedMs + (startedAt === null ? 0 : Date.now() - startedAt);
  const running = startedAt !== null;
  const state = running ? 'กำลังจับเวลา' : elapsed > 0 ? 'พักไว้' : 'ตัวจับเวลา';

  return (
    <section aria-label="ตัวจับเวลา" className={`timer${running ? ' is-running' : ''}`}>
      <p className="zone-label">
        <span className="rec" aria-hidden="true" />
        {state}
      </p>
      <p className="clock" data-testid="timer-display">
        {format(elapsed)}
      </p>
      <div className="timer-actions">
        {running ? (
          <button
            type="button"
            className="btn btn-dark"
            onClick={() => {
              setAccumulatedMs(accumulatedMs + Date.now() - startedAt);
              setStartedAt(null);
            }}
          >
            พักเวลา
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-dark"
            onClick={() => {
              setUsed(null);
              setStartedAt(Date.now());
            }}
          >
            {elapsed > 0 ? 'จับเวลาต่อ' : 'เริ่มจับเวลา'}
          </button>
        )}
        <button
          type="button"
          className="btn btn-line"
          disabled={elapsed < 1000}
          onClick={() => {
            const m = minutesFromElapsed(elapsed);
            onUse(m);
            setUsed(`ใส่ ${m} นาทีในบันทึกแล้ว`);
          }}
        >
          ใช้เวลานี้บันทึก
        </button>
        {elapsed > 0 ? (
          <button
            type="button"
            className="btn btn-text"
            onClick={() => {
              setStartedAt(null);
              setAccumulatedMs(0);
              setUsed(null);
            }}
          >
            รีเซ็ต
          </button>
        ) : null}
      </div>
      <p className="timer-status" role="status">
        {used}
      </p>
    </section>
  );
}
