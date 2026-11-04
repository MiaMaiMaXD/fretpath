'use client';

import { useState } from 'react';
import { formatClock, usePracticeTimer } from '@/components/practice/PracticeSession';
import { minutesFromElapsed } from '@/lib/timer';

const LONG_MS = 3 * 60 * 60 * 1000;

/** Stage timer on /practice. State lives in the session store, so it keeps running on other pages. */
export function PracticeTimer({ onFinish, week }: { onFinish: (minutes: number) => void; week: React.ReactNode }) {
  const { running, elapsed, start, pause, reset } = usePracticeTimer();
  const [used, setUsed] = useState<string | null>(null);
  const [mm, ss] = formatClock(elapsed);
  const kicker = running ? 'กำลังจับเวลา' : elapsed > 0 ? 'พักเวลาไว้' : 'พร้อมซ้อมแล้วกดเริ่มได้เลย';

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
              start();
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
            setUsed(
              elapsed > LONG_MS
                ? `จับเวลาไว้นานกว่า 3 ชั่วโมง ลืมหยุดหรือเปล่า? ใส่ ${m} นาทีไว้ให้ ตรวจตัวเลขก่อนบันทึก`
                : `ใส่ ${m} นาทีในใบบันทึกแล้ว`,
            );
          }}
        >
          จบรอบ แล้วจดบันทึก
        </button>
        {elapsed > 0 && !running ? (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              reset();
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
