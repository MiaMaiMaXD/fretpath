'use client';

import { useEffect, useRef, useState } from 'react';
import { ChordDiagram } from '@/components/ChordDiagram';
import type { ChordName } from '@/lib/audio/chords';
import { chordStringNotes, midiName } from '@/lib/audio/detect';
import { getAudioContext } from '@/lib/audio/strings';
import { ChordVerifier, DEFAULT_PARAMS, FFT_SIZE, LEVEL_WINDOW, TICK_MS, playedStrings } from '@/lib/audio/verifier';

type Check = { step: number; heard: number | null; wrong: { string: number; heard: number; expected: number } | null };
const FRESH: Check = { step: 0, heard: null, wrong: null };

/**
 * The practical question: hold each chord and pluck its strings one at a time, thick to thin. The instructor's
 * string-by-string verifier (lib/audio/verifier.ts) judges every 50 ms tick in the browser; no audio leaves
 * the device. `onPassed` fires once every chord has passed. Retries are unlimited.
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
  const [index, setIndex] = useState(passed ? chords.length : 0);
  const [check, setCheck] = useState<Check>(FRESH);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateDb, setGateDb] = useState(DEFAULT_PARAMS.gateDb);
  const [levelDb, setLevelDb] = useState<number | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const verifierRef = useRef(new ChordVerifier(chords[0]));
  const gateRef = useRef(gateDb);
  const onPassedRef = useRef(onPassed);

  useEffect(() => {
    gateRef.current = gateDb;
  }, [gateDb]);
  useEffect(() => {
    onPassedRef.current = onPassed;
  }, [onPassed]);

  const finished = index >= chords.length;
  const target = chords[Math.min(index, chords.length - 1)];
  const strings = chordStringNotes(target);
  const played = playedStrings(target);
  const chordDone = !finished && check.step >= played.length;
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
    verifierRef.current = new ChordVerifier(chords[Math.min(i, chords.length - 1)]);
    setCheck(FRESH);
    if (i >= chords.length) {
      stop();
      onPassedRef.current();
    }
  }

  async function start() {
    setError(null);
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

    const time = new Float32Array(FFT_SIZE);
    timerRef.current = window.setInterval(() => {
      analyser.getFloatTimeDomainData(time);
      const v = verifierRef.current;
      v.params = { ...DEFAULT_PARAMS, gateDb: gateRef.current };
      const r = v.tick(time.subarray(FFT_SIZE - LEVEL_WINDOW), ctx.sampleRate);
      setLevelDb(r.level > 0 ? 20 * Math.log10(r.level) : -100);
      if (!r.verdict) return;
      const d = r.verdict;
      setCheck({
        step: v.step,
        heard: d.heard,
        wrong: d.kind === 'wrong' ? { string: d.string, heard: d.heard, expected: d.expected } : null,
      });
    }, TICK_MS);
    setRunning(true);
  }

  // stop listening as soon as a chord is complete; the learner moves on with the button
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- releasing the microphone
    if (chordDone && running) stop();
  }, [chordDone, running]);

  if (finished) {
    return (
      <div className="pc pc-done" data-testid="practical">
        <p className="lv-q-prompt">ข้อปฏิบัติ: {prompt}</p>
        <p className="pc-pass" role="status" data-testid="practical-passed">
          ✓ ผ่านข้อปฏิบัติแล้ว ({chords.join(' → ')})
        </p>
        <button type="button" className="pc-link" onClick={() => goTo(0)}>
          ลองดีดอีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="pc" data-testid="practical">
      <p className="lv-q-prompt">ข้อปฏิบัติ: {prompt}</p>
      <p className="pc-help">
        จับคอร์ดค้างไว้ แล้วดีด<b>ทีละสาย</b> จากสายหนา (สาย 6) ไปสายบาง (สาย 1) วางกีตาร์ห่างจากเครื่องประมาณ 30–50 ซม.
        ต้องดีดผ่านทุกคอร์ดก่อนจึงจะส่งคำตอบได้
      </p>

      <div className="pc-body">
        <div className="pc-diagram">
          <p className="pc-chord">
            {chords.length > 1 ? (
              <span className="pc-count">
                คอร์ดที่ {index + 1}/{chords.length}
              </span>
            ) : null}
            คอร์ด <b>{target}</b>
          </p>
          <ChordDiagram name={target} />
        </div>

        <div className="pc-main">
          <ol className="pc-strings" aria-label={`สายของคอร์ด ${target}`}>
            {strings.map((s) => {
              const order = played.findIndex((p) => p.string === s.string);
              const done = order >= 0 && order < check.step;
              const isCurrent = order === check.step && running;
              const isWrong = check.wrong?.string === s.string;
              const state = s.midi === null ? 'muted' : done ? 'ok' : isWrong ? 'bad' : isCurrent ? 'now' : '';
              return (
                <li key={s.string} className={`pc-tile ${state}`} data-testid={`pc-string-${s.string}`} data-state={state || 'wait'}>
                  <span className="pc-tile-n">สาย {s.string}</span>
                  <span className="pc-tile-note">{s.midi === null ? '×' : midiName(s.midi)}</span>
                  <span className="pc-tile-s">{s.midi === null ? 'ไม่ดีด' : done ? 'ผ่าน' : isWrong ? 'ผิด' : ''}</span>
                </li>
              );
            })}
          </ol>

          <p role="status" aria-live="polite" className={`pc-msg ${chordDone ? 'ok' : check.wrong ? 'bad' : ''}`} data-testid="pc-msg">
            {chordDone
              ? `ถูกต้อง! คอร์ด ${target} ผ่านครบทุกสาย`
              : check.wrong
                ? `สาย ${check.wrong.string}: ได้ยินเสียง ${midiName(check.wrong.heard)} แต่ควรเป็น ${midiName(check.wrong.expected)} — ตรวจตำแหน่งนิ้ว แล้วดีดสายนี้ใหม่`
                : running && current
                  ? `ดีดสาย ${current.string} (${midiName(current.midi)})`
                  : 'กดปุ่มด้านล่างเพื่อเปิดไมโครโฟน'}
          </p>

          <div className="pc-actions">
            {chordDone ? (
              <button type="button" className="lv-pill amber" onClick={() => goTo(index + 1)} data-testid="pc-next">
                {index + 1 < chords.length ? 'คอร์ดถัดไป' : 'เสร็จสิ้นข้อปฏิบัติ'}
              </button>
            ) : running ? (
              <button type="button" className="lv-pill slate" onClick={stop} data-testid="pc-stop">
                หยุดฟัง
              </button>
            ) : (
              <button type="button" className="lv-pill amber" onClick={() => void start()} data-testid="pc-start">
                {check.step > 0 || check.wrong ? 'ฟังต่อ' : 'เปิดไมโครโฟนและเริ่มดีด'}
              </button>
            )}
            {!chordDone && check.step > 0 ? (
              <button type="button" className="pc-link" onClick={() => goTo(index)}>
                เริ่มคอร์ดนี้ใหม่
              </button>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="lv-alert">
              {error}
            </p>
          ) : null}

          <details className="pc-gate">
            <summary>ปรับความไวไมโครโฟน (เกณฑ์ {gateDb} dB)</summary>
            <input
              type="range"
              min={-60}
              max={-20}
              step={1}
              value={gateDb}
              onChange={(e) => setGateDb(Number(e.target.value))}
              aria-label="เกณฑ์ความดังของไมโครโฟน (dB)"
            />
            <div className="pc-gate-scale">
              <span>ไวขึ้น (-60)</span>
              <span>ไวน้อยลง (-20)</span>
            </div>
            <div className="pc-meter" aria-hidden="true">
              <div
                className={levelDb !== null && levelDb >= gateDb ? 'on' : ''}
                style={{ width: `${levelDb === null ? 0 : Math.min(100, Math.max(0, ((levelDb + 70) / 60) * 100))}%` }}
              />
              <span style={{ left: `${((gateDb + 70) / 60) * 100}%` }} />
            </div>
            <p className="pc-gate-note">
              {levelDb === null
                ? 'กดเริ่มเพื่อดูระดับเสียง'
                : `ระดับเสียงตอนนี้ ${Math.round(levelDb)} dB: ${levelDb >= gateDb ? 'ดังพอ กำลังฟัง' : 'เบากว่าเกณฑ์ ยังไม่ฟัง'}`}
              <br />
              ถ้าเสียงรอบข้างทำให้ระบบฟังตลอดเวลา ให้เลื่อนไปทางขวา ถ้าดีดแล้วระบบไม่ได้ยิน ให้เลื่อนไปทางซ้าย
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
