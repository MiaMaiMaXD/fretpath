'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioSupported } from '@/components/StringPlayer';
import { BEATS_PER_BAR, MAX_BPM, MIN_BPM, beatIntervalMs, clampBpm, scheduleClicks } from '@/lib/audio/metronome';
import { getAudioContext } from '@/lib/audio/strings';

const LOOKAHEAD_MS = 100;
const TICK_MS = 25;
const STEP = 5;

function tempoName(bpm: number): string {
  if (bpm < 66) return 'ช้า เหมาะกับฝึกเปลี่ยนคอร์ด';
  if (bpm < 100) return 'ปานกลาง';
  if (bpm < 140) return 'ค่อนข้างเร็ว';
  return 'เร็ว';
}

/** Click timing comes from the AudioContext clock; the 25 ms interval only schedules the next 100 ms of clicks. */
export function Metronome() {
  const supported = useAudioSupported();
  const [bpm, setBpm] = useState(80);
  const [draft, setDraft] = useState('80');
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const bpmRef = useRef(bpm);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lights = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = useCallback(() => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    lights.current.forEach(clearTimeout);
    lights.current = [];
    setRunning(false);
    setBeat(-1);
  }, []);

  useEffect(() => stop, [stop]);

  function commit(n: number) {
    const v = clampBpm(n);
    bpmRef.current = v;
    setBpm(v);
    setDraft(String(v));
  }

  function start() {
    const ctx = getAudioContext();
    if (!ctx || timer.current !== null) return;
    let nextTime = ctx.currentTime + 0.05;
    let next = 0;
    const pump = () => {
      // after a throttled/backgrounded tab, skip missed beats instead of firing them all at once
      if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
      const horizon = ctx.currentTime + LOOKAHEAD_MS / 1000;
      while (nextTime < horizon) {
        scheduleClicks(ctx, bpmRef.current, nextTime, 1, next);
        // Light the beat indicator when the click actually sounds (visual only, so setTimeout precision is fine).
        const b = next;
        const t = setTimeout(() => setBeat(b), Math.max(0, (nextTime - ctx.currentTime) * 1000));
        lights.current = [...lights.current.slice(-8), t];
        nextTime += beatIntervalMs(bpmRef.current) / 1000;
        next = (next + 1) % BEATS_PER_BAR;
      }
    };
    pump();
    timer.current = setInterval(pump, TICK_MS);
    setRunning(true);
  }

  return (
    <section aria-label="เมโทรนอม" className={`metro${running ? ' is-running' : ''}`}>
      <p className="zone-label">เมโทรนอม</p>
      <div className="metro-main">
        <button type="button" className="step" aria-label={`ลดจังหวะ ${STEP} BPM`} onClick={() => commit(bpm - STEP)} disabled={bpm <= MIN_BPM}>
          −
        </button>
        <label className="bpm">
          <span className="sr-only">จังหวะ (BPM)</span>
          <input
            type="number"
            min={MIN_BPM}
            max={MAX_BPM}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              const n = e.target.valueAsNumber;
              if (Number.isFinite(n)) {
                const v = clampBpm(n);
                bpmRef.current = v;
                setBpm(v);
              }
            }}
            onBlur={() => commit(Number(draft))}
          />
          <span aria-hidden="true">BPM</span>
        </label>
        <button type="button" className="step" aria-label={`เพิ่มจังหวะ ${STEP} BPM`} onClick={() => commit(bpm + STEP)} disabled={bpm >= MAX_BPM}>
          +
        </button>
        <div className="beats" aria-hidden="true">
          {Array.from({ length: BEATS_PER_BAR }, (_, i) => (
            <span key={i} className={`${i === 0 ? 'accent' : ''}${beat === i ? ' lit' : ''}`} />
          ))}
        </div>
      </div>
      <input
        type="range"
        className="metro-range"
        aria-label="จังหวะ (BPM)"
        min={MIN_BPM}
        max={MAX_BPM}
        value={bpm}
        style={{ '--fill': `${((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}%` } as React.CSSProperties}
        onChange={(e) => commit(Number(e.target.value))}
      />
      <p className="tempo-name">{tempoName(bpm)}</p>
      <div className="metro-actions">
        {running ? (
          <button type="button" className="btn btn-dark" onClick={stop}>
            หยุดเสียงเคาะ
          </button>
        ) : (
          <button type="button" className="btn btn-line" disabled={!supported} onClick={start}>
            เปิดเสียงเคาะ
          </button>
        )}
        {!supported ? <p role="status">เบราว์เซอร์นี้เล่นเสียงไม่ได้</p> : null}
      </div>
    </section>
  );
}
