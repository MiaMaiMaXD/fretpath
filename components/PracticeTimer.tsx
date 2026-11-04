'use client';

import { useEffect, useState } from 'react';
import { minutesFromElapsed } from '@/lib/timer';

function parts(ms: number): [string, string] {
  const total = Math.floor(ms / 1000);
  return [String(Math.floor(total / 60)).padStart(2, '0'), String(total % 60).padStart(2, '0')];
}

/** Elapsed time comes from timestamps (startedAt + accumulatedMs), never from counting ticks. */
export function PracticeTimer({ onFinish, week }: { onFinish: (minutes: number) => void; week: React.ReactNode }) {
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
  const [mm, ss] = parts(elapsed);
  const kicker = running ? 'กำลังจับเวลา' : elapsed > 0 ? 'พักเวลาไว้' : 'พร้อมซ้อมแล้วกดเริ่มได้เลย';

  function pause() {
    if (startedAt !== null) setAccumulatedMs(accumulatedMs + Date.now() - startedAt);
    setStartedAt(null);
  }

  return (
    <section aria-label="ตัวจับเวลา" className={`stage-timer${running ? ' is-running' : ''}`}>
      <p className="kicker">
        <span className="rec" aria-hidden="true" />
        {kicker}
      </p>
      <p className="clock" data-testid="timer-display">
        {mm}
        <span className="colon">:</span>
        {ss}
      </p>
      <div className="stage-actions">
        {running ? (
          <button type="button" className="btn btn-amber btn-big" onClick={pause}>
            พักเวลา
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-amber btn-big"
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
          className="btn btn-ghost btn-big"
          disabled={elapsed < 1000}
          onClick={() => {
            pause();
            const m = minutesFromElapsed(elapsed);
            onFinish(m);
            setUsed(`ใส่ ${m} นาทีในใบบันทึกแล้ว`);
          }}
        >
          จบรอบ แล้วจดบันทึก
        </button>
        {elapsed > 0 && !running ? (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
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
      <div className="stage-week">{week}</div>
    </section>
  );
}
