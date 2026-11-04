'use client';

import { useState } from 'react';
import { useMetronome } from '@/components/practice/PracticeSession';
import { BEATS_PER_BAR, MAX_BPM, MIN_BPM } from '@/lib/audio/metronome';

const STEP = 5;

const TEMPOS = [
  { bpm: 60, label: 'ช้า' },
  { bpm: 80, label: 'ฝึกเปลี่ยนคอร์ด' },
  { bpm: 100, label: 'ปานกลาง' },
  { bpm: 120, label: 'เพลงเร็ว' },
];

/** Stage metronome on /practice; the engine lives in PracticeSessionProvider so it keeps clicking across pages. */
export function Metronome() {
  const { supported, bpm, setBpm, running, beat, start, stop } = useMetronome();
  const [draft, setDraft] = useState(String(bpm));
  // keep the text box in step when the tempo changes elsewhere (buttons, slider, mini player)
  const [shown, setShown] = useState(bpm);
  if (shown !== bpm) {
    setShown(bpm);
    setDraft(String(bpm));
  }

  function commit(n: number) {
    setDraft(String(setBpm(n)));
  }

  return (
    <section aria-label="เมโทรนอม" className={`stage-metro${running ? ' is-running' : ''}`}>
      <div className="metro-top">
        <p className="kicker">เมโทรนอม</p>
        {running ? (
          <button type="button" className="metro-toggle on" onClick={stop}>
            หยุดเสียงเคาะ
          </button>
        ) : (
          <button type="button" className="metro-toggle" disabled={!supported} onClick={start}>
            เปิดเสียงเคาะ
          </button>
        )}
      </div>

      <div className="pulse">
        <label className={`ring${beat === 0 ? ' hit' : ''}`}>
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
                const v = setBpm(n);
                setShown(v);
              }
            }}
            onBlur={() => commit(Number(draft))}
          />
          <small aria-hidden="true">BPM</small>
        </label>
        <div className="beat-bars" aria-hidden="true">
          {Array.from({ length: BEATS_PER_BAR }, (_, i) => (
            <span key={i} className={`${i === 0 ? 'accent' : ''}${beat === i ? ' lit' : ''}`} />
          ))}
        </div>
      </div>

      <div className="metro-slider">
        <button type="button" className="step" aria-label={`ลดจังหวะ ${STEP} BPM`} onClick={() => commit(bpm - STEP)} disabled={bpm <= MIN_BPM}>
          −
        </button>
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
        <button type="button" className="step" aria-label={`เพิ่มจังหวะ ${STEP} BPM`} onClick={() => commit(bpm + STEP)} disabled={bpm >= MAX_BPM}>
          +
        </button>
      </div>

      <div className="tempos" role="group" aria-label="ความเร็วสำเร็จรูป">
        {TEMPOS.map((t) => (
          <button key={t.bpm} type="button" aria-pressed={bpm === t.bpm} onClick={() => commit(t.bpm)}>
            <b>{t.bpm}</b> {t.label}
          </button>
        ))}
      </div>
      {!supported ? <p role="status" className="no-audio">เบราว์เซอร์นี้เล่นเสียงไม่ได้</p> : null}
    </section>
  );
}
