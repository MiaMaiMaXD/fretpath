'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChordName } from '@/lib/audio/chords';
import { chordStringNotes, chroma, midiName, rankChords } from '@/lib/audio/detect';
import { getAudioContext } from '@/lib/audio/strings';
import { ChordVerifier, DEFAULT_PARAMS, FFT_SIZE, LEVEL_WINDOW, TICK_MS, playedStrings } from '@/lib/audio/verifier';

type Check = { step: number; wrong: { string: number; heard: number; expected: number } | null };
const FRESH: Check = { step: 0, wrong: null };
const ROWS = 5;
/** pause on a passed chord before moving to the next one (the microphone keeps listening) */
const NEXT_CHORD_MS = 1500;

/**
 * The practical question (design: แบบทดสอบ 1 / 1.1, 2026-11-28): hold each chord and pluck its strings one at
 * a time, thick to thin. The instructor's string-by-string verifier (lib/audio/verifier.ts) judges every 50 ms
 * tick in the browser; no audio leaves the device. The "closest chords" panel is the chroma hint from the same
 * chord-meter and does not affect the verdict. `onPassed` fires once every chord has passed.
 */
export function PracticalCheck({
  prompt,
  chords,
  passed,
  onPassed,
}: {
  prompt: string;
  chords: ChordName[];
  /** already passed (e.g. before going back to the intro) */
  passed: boolean;
  onPassed: () => void;
}) {
  const last = chords.length - 1;
  const [index, setIndex] = useState(passed ? last : 0);
  const [check, setCheck] = useState<Check>(() => (passed ? { step: playedStrings(chords[last]).length, wrong: null } : FRESH));
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateDb, setGateDb] = useState(DEFAULT_PARAMS.gateDb);
  const [levelDb, setLevelDb] = useState<number | null>(null);
  const [ranking, setRanking] = useState<{ name: ChordName; score: number }[] | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const verifierRef = useRef(new ChordVerifier(chords[index]));
  const gateRef = useRef(gateDb);
  const onPassedRef = useRef(onPassed);

  useEffect(() => {
    gateRef.current = gateDb;
  }, [gateDb]);
  useEffect(() => {
    onPassedRef.current = onPassed;
  }, [onPassed]);

  const target = chords[index];
  const strings = chordStringNotes(target);
  const played = playedStrings(target);
  const chordDone = check.step >= played.length;
  const allDone = chordDone && index === last;
  const passedCount = index + (chordDone ? 1 : 0);
  const current = played[check.step];

  function stop() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRunning(false);
    setLevelDb(null);
  }

  useEffect(() => () => stop(), []);

  function goTo(i: number) {
    setIndex(i);
    verifierRef.current = new ChordVerifier(chords[i]);
    setCheck(FRESH);
  }

  // a passed chord: the last one finishes the question, otherwise move on to the next chord
  useEffect(() => {
    if (!chordDone) return;
    if (index === last) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- releasing the microphone
      stop();
      if (!passed) onPassedRef.current();
      return;
    }
    const t = window.setTimeout(() => goTo(index + 1), NEXT_CHORD_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goTo only touches refs and setters
  }, [chordDone, index, last, passed]);

  async function start() {
    setError(null);
    if (allDone) goTo(0); // ลองอีกครั้ง
    const ctx = getAudioContext();
    if (!ctx || !navigator.mediaDevices?.getUserMedia) {
      setError('เบราว์เซอร์นี้ใช้ไมโครโฟนไม่ได้ (ต้องเปิดเว็บผ่าน https)');
      return;
    }
    let stream: MediaStream;
    try {
      // the browser's voice processing would change the guitar's harmonics: switch it off
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน — อนุญาตไมโครโฟนให้เว็บนี้ในการตั้งค่าเบราว์เซอร์ แล้วกดเริ่มใหม่'
          : name === 'NotFoundError'
            ? 'ไม่พบไมโครโฟนในเครื่องนี้'
            : `เปิดไมโครโฟนไม่สำเร็จ (${name || String(e)})`,
      );
      return;
    }
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0;
    source.connect(analyser);
    streamRef.current = stream;
    sourceRef.current = source;
    setRanking(null);

    const time = new Float32Array(FFT_SIZE);
    const freq = new Float32Array(FFT_SIZE / 2);
    timerRef.current = window.setInterval(() => {
      analyser.getFloatTimeDomainData(time);
      const v = verifierRef.current;
      v.params = { ...DEFAULT_PARAMS, gateDb: gateRef.current };
      const r = v.tick(time.subarray(FFT_SIZE - LEVEL_WINDOW), ctx.sampleRate);
      setLevelDb(r.level > 0 ? 20 * Math.log10(r.level) : -100);
      if (r.gated) return;
      analyser.getFloatFrequencyData(freq);
      setRanking(rankChords(chroma(freq, ctx.sampleRate, FFT_SIZE)));
      if (!r.verdict) return;
      const d = r.verdict;
      setCheck({ step: v.step, wrong: d.kind === 'wrong' ? { string: d.string, heard: d.heard, expected: d.expected } : null });
    }, TICK_MS);
    setRunning(true);
  }

  // the marker in the middle of the bar is the pass point
  const fillPct = (Math.min(check.step, played.length) / played.length) * 50;
  const meterPct = (db: number) => Math.min(100, Math.max(0, ((db + 70) / 60) * 100));
  const gatePct = ((gateDb + 60) / 40) * 100;

  return (
    <div className="pc" data-testid="practical">
      <div className="pc-head">
        <p className="pc-prompt">{prompt}</p>
        <span className={`pc-count ${allDone ? 'ok' : ''}`} data-testid="pc-count" aria-label={`ผ่าน ${passedCount} จาก ${chords.length} คอร์ด`}>
          {passedCount} / {chords.length}
        </span>
      </div>

      <section className="pc-box pc-check" aria-label="ตรวจทีละสาย">
        <p className={`pc-chord ${chordDone ? 'ok' : ''}`}>{target}</p>
        <ol className="pc-strings" aria-label={`สายของคอร์ด ${target}`}>
          {strings.map((s) => {
            const order = played.findIndex((p) => p.string === s.string);
            const done = order >= 0 && order < check.step;
            const isCurrent = order === check.step && running;
            const isWrong = !done && check.wrong?.string === s.string;
            const state = s.midi === null ? 'muted' : done ? 'ok' : isWrong ? 'bad' : isCurrent ? 'now' : '';
            return (
              <li key={s.string} className={`pc-tile ${state}`} data-testid={`pc-string-${s.string}`} data-state={state || 'wait'}>
                <span className="pc-tile-n">
                  สาย <b>{s.string}</b>
                </span>
                <span className="pc-tile-note">{s.midi === null ? '-' : midiName(s.midi)}</span>
                {s.midi === null ? <span className="pc-tile-s">ไม่ดีด</span> : isWrong ? <span className="pc-tile-s">ผิด</span> : null}
              </li>
            );
          })}
        </ol>

        <div
          className="pc-bar"
          role="progressbar"
          aria-label={chordDone ? `ผ่าน: ${target}` : `${target}: ผ่าน ${check.step} จาก ${played.length} สาย`}
          aria-valuemin={0}
          aria-valuemax={played.length}
          aria-valuenow={Math.min(check.step, played.length)}
        >
          <div className="pc-bar-fill" style={{ width: `${fillPct}%` }} />
          <span className="pc-bar-mark" />
        </div>

        <p role="status" aria-live="polite" className={`pc-msg ${chordDone ? 'ok' : check.wrong ? 'bad' : ''}`} data-testid="pc-msg">
          {chordDone
            ? allDone
              ? `ถูกต้อง! ผ่านครบทุกคอร์ดแล้ว`
              : `ถูกต้อง! คอร์ด ${target} ผ่านครบทุกสาย ต่อไปคอร์ด ${chords[index + 1]}`
            : check.wrong
              ? `สาย ${check.wrong.string}: ได้ยินเสียง ${midiName(check.wrong.heard)} แต่ควรเป็น ${midiName(check.wrong.expected)} — ตรวจตำแหน่งนิ้ว แล้วดีดสายนี้ใหม่`
              : running && current
                ? `จับคอร์ด ${target} ค้างไว้ แล้วดีดสาย ${current.string} (${midiName(current.midi)})`
                : `กด "เริ่ม" แล้วดีดทีละสาย จากสายหนา (สาย 6) ไปสายบาง (สาย 1)`}
        </p>

        {allDone ? (
          <p className="pc-btn ok" data-testid="practical-passed">
            ผ่าน
          </p>
        ) : running ? (
          <button type="button" className="pc-btn stop" onClick={stop} data-testid="pc-stop">
            หยุด
          </button>
        ) : (
          <button type="button" className="pc-btn" onClick={() => void start()} data-testid="pc-start">
            เริ่ม
          </button>
        )}
        {allDone ? (
          <button type="button" className="pc-again" onClick={() => void start()}>
            ลองดีดอีกครั้ง
          </button>
        ) : null}
        {error ? (
          <p role="alert" className="pc-error">
            {error}
          </p>
        ) : null}
      </section>

      <section className="pc-box pc-gate" aria-label="ความไวไมค์">
        <label htmlFor="pc-gate" className="pc-box-title">
          ความไวไมค์ (เกณฑ์เสียง {gateDb} dB)
        </label>
        <input
          id="pc-gate"
          type="range"
          min={-60}
          max={-20}
          step={1}
          value={gateDb}
          onChange={(e) => setGateDb(Number(e.target.value))}
          style={{ ['--pc-fill' as string]: `${gatePct}%` }}
        />
        <div className="pc-gate-scale">
          <span>ไวมาก (-60)</span>
          <span>ไวน้อย (-20)</span>
        </div>
        <div className="pc-meter" aria-hidden="true">
          <div className={levelDb !== null && levelDb >= gateDb ? 'on' : ''} style={{ width: `${levelDb === null ? 0 : meterPct(levelDb)}%` }} />
          <span style={{ left: `${meterPct(gateDb)}%` }} />
        </div>
        <p className="pc-gate-now">
          {levelDb === null
            ? 'กด “เริ่ม” เพื่อดูระดับเสียง'
            : `ระดับเสียงตอนนี้ ${Math.round(levelDb)} dB: ${levelDb >= gateDb ? 'ดังพอ กำลังฟัง' : 'เบากว่าเกณฑ์ ยังไม่ฟัง'}`}
        </p>
        <p className="pc-gate-hint">ถ้าห้องมีเสียงรบกวนจนระบบฟังตลอด ให้เลื่อนไปทางขวา ถ้าดีดแล้วระบบไม่ฟัง ให้เลื่อนไปทางซ้าย</p>
      </section>

      <section className="pc-box pc-rank" aria-labelledby="pc-rank-h">
        <h3 id="pc-rank-h" className="pc-box-title">
          คอร์ดที่ใกล้ที่สุด
        </h3>
        <ul>
          {Array.from({ length: ROWS }, (_, i) => {
            const r = ranking?.[i];
            const pct = r ? Math.round(r.score * 100) : 0;
            return (
              <li key={i}>
                <span className="pc-rank-name">{r ? r.name : '#'}</span>
                <span className="pc-rank-bar">
                  <span style={{ width: `${pct}%` }} />
                </span>
                <span className="pc-rank-n">{pct}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
