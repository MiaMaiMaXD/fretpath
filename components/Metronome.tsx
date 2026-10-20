'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioSupported } from '@/components/StringPlayer';
import { BEATS_PER_BAR, MAX_BPM, MIN_BPM, beatIntervalMs, clampBpm, scheduleClicks } from '@/lib/audio/metronome';
import { getAudioContext } from '@/lib/audio/strings';

const LOOKAHEAD_MS = 100;
const TICK_MS = 25;
const BTN = 'rounded border border-neutral-400 px-3 py-1 disabled:opacity-50';

/** Click timing comes from the AudioContext clock; the 25 ms interval only schedules the next 100 ms of clicks. */
export function Metronome() {
  const supported = useAudioSupported();
  const [bpm, setBpm] = useState(100);
  const [draft, setDraft] = useState('100');
  const [running, setRunning] = useState(false);
  const bpmRef = useRef(bpm);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
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
    let beat = 0;
    const pump = () => {
      const horizon = ctx.currentTime + LOOKAHEAD_MS / 1000;
      while (nextTime < horizon) {
        scheduleClicks(ctx, bpmRef.current, nextTime, 1, beat);
        nextTime += beatIntervalMs(bpmRef.current) / 1000;
        beat = (beat + 1) % BEATS_PER_BAR;
      }
    };
    pump();
    timer.current = setInterval(pump, TICK_MS);
    setRunning(true);
  }

  return (
    <section aria-label="เมโทรนอม" className="flex flex-col gap-2 rounded border border-neutral-300 p-3 dark:border-neutral-700">
      <h2 className="text-xl font-semibold">เมโทรนอม</h2>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span>จังหวะ (BPM)</span>
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
            className="w-24 rounded border border-neutral-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-1 items-center gap-2">
          <span className="sr-only">จังหวะ (BPM)</span>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => commit(Number(e.target.value))}
            className="min-w-40 flex-1"
          />
        </label>
      </div>
      {running ? (
        <button type="button" className={`${BTN} w-fit`} onClick={stop}>
          หยุดเมโทรนอม
        </button>
      ) : (
        <button type="button" className={`${BTN} w-fit`} disabled={!supported} onClick={start}>
          เริ่มเมโทรนอม
        </button>
      )}
      {!supported ? <p role="status">เบราว์เซอร์นี้ไม่รองรับเสียง</p> : null}
    </section>
  );
}
