'use client';

// SPIKE (throwaway): standalone chord meter for the instructor demo. Not for merge.
import { useEffect, useRef, useState } from 'react';
import type { ChordName } from '@/lib/audio/chords';
import { getAudioContext } from '@/lib/audio/strings';
import { chroma, rankChords, rms } from '../mic/detect';

const FFT_SIZE = 16384;
const LEVEL_WINDOW = 2048;
const TICK_MS = 50;
const DEFAULT_GATE_DB = -45;
// A clear first hit passes at once; a weaker one must hold for about 1 s (20 ticks).
const STRONG_SCORE = 0.8;
const STRONG_MARGIN = 0.05;
const WEAK_SCORE = 0.6;
const FILL_STEP = 1 / 20;
const ROWS = 5;
// Easiest first; F (partial barre) last.
const QUESTIONS: ChordName[] = ['C', 'G', 'D', 'Am', 'Em', 'F'];

type Ranking = { name: ChordName; score: number }[];
type Lock = { name: ChordName; progress: number; passed: boolean };

export function ChordMeter() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lock, setLock] = useState<Lock | null>(null);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [index, setIndex] = useState(0);
  const [gateDb, setGateDb] = useState(DEFAULT_GATE_DB);
  const [levelDb, setLevelDb] = useState<number | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const targetRef = useRef<ChordName>(QUESTIONS[0]);
  const currentRef = useRef<Lock | null>(null);
  const gateRef = useRef(10 ** (DEFAULT_GATE_DB / 20));

  useEffect(() => {
    gateRef.current = 10 ** (gateDb / 20);
  }, [gateDb]);

  const finished = index >= QUESTIONS.length;
  const target = QUESTIONS[Math.min(index, QUESTIONS.length - 1)];
  const passed = lock?.passed === true && lock.name === target;

  function goTo(i: number) {
    setIndex(i);
    targetRef.current = QUESTIONS[Math.min(i, QUESTIONS.length - 1)];
    currentRef.current = null;
    setLock(null);
  }

  useEffect(() => () => stop(), []);

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

  async function start() {
    setError(null);
    const ctx = getAudioContext();
    if (!ctx || !navigator.mediaDevices?.getUserMedia) {
      setError('เบราว์เซอร์นี้ใช้ไมค์ไม่ได้ (ต้องเปิดผ่าน https หรือ localhost)');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'ไม่ได้รับอนุญาตให้ใช้ไมค์ เปิดสิทธิ์ไมค์ของเว็บนี้ในการตั้งค่าเบราว์เซอร์แล้วลองใหม่'
          : `เปิดไมค์ไม่สำเร็จ (${name || String(e)})`,
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
      const level = rms(time.subarray(FFT_SIZE - LEVEL_WINDOW));
      setLevelDb(level > 0 ? 20 * Math.log10(level) : -100);
      let current = currentRef.current;
      // A passed question stays passed until the learner moves on.
      if (current?.passed) return;
      const target = targetRef.current;
      // Silence keeps the last result on screen.
      if (level < gateRef.current) return;
      analyser.getFloatFrequencyData(freq);
      const ranked = rankChords(chroma(freq, ctx.sampleRate, FFT_SIZE));
      const [best, second] = ranked;
      const strong = best.score >= STRONG_SCORE && best.score - second.score >= STRONG_MARGIN;
      const heard = best.score >= WEAK_SCORE;

      if (heard && (!current || current.name !== best.name)) {
        // Only the question's chord fills the bar; any other chord is shown but scores nothing.
        const isTarget = best.name === target;
        current = { name: best.name, progress: isTarget ? (strong ? 1 : FILL_STEP) : 0, passed: isTarget && strong };
      } else if (current && current.name === target) {
        const progress = Math.min(1, Math.max(0, current.progress + (heard ? FILL_STEP : -FILL_STEP / 2)));
        current = { ...current, progress, passed: progress >= 1 };
      }
      currentRef.current = current;
      setLock(current);
      setRanking(ranked);
    }, TICK_MS);
    setRunning(true);
  }

  // The marker in the middle of the bar is the pass point.
  const fillPct = lock ? lock.progress * 50 : 0;
  const rows = ranking ? ranking.slice(0, ROWS) : null;

  return (
    <div className="rounded-2xl bg-[#0f172a] p-3 text-white shadow-xl">
      <section aria-label="โจทย์" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#2a3a5c] px-5 py-4">
        {finished ? (
          <>
            <p className="text-lg font-semibold text-emerald-400">ผ่านครบทั้ง {QUESTIONS.length} ข้อ เก่งมาก!</p>
            <button type="button" onClick={() => goTo(0)} className="rounded-full border border-white/60 px-5 py-1.5 font-semibold hover:bg-white/10">
              เริ่มใหม่
            </button>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold">
              ข้อที่ {index + 1}: ดีดคอร์ด <span className="text-amber-300">{target}</span> ให้ผ่าน
            </p>
            <p className="text-sm text-neutral-300 tabular-nums">
              {index + 1} / {QUESTIONS.length}
            </p>
          </>
        )}
      </section>

      <section
        aria-label="คอร์ดที่ได้ยิน"
        className="flex flex-col items-center gap-6 rounded-xl bg-[#2a3a5c] px-6 py-8"
      >
        <p
          role="status"
          aria-live="polite"
          className={`text-6xl leading-none font-bold ${passed ? 'text-emerald-400' : 'text-white'}`}
        >
          {lock && !finished ? lock.name : '–'}
        </p>
        <div
          role="progressbar"
          aria-label={passed ? `ผ่าน: คอร์ด ${target}` : `ความคืบหน้าของคอร์ด ${target}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((lock?.progress ?? 0) * 100)}
          className="relative h-2.5 w-full max-w-md rounded-full bg-white"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-100 ${passed ? 'bg-emerald-500' : 'bg-amber-400'}`}
            style={{ width: `${finished ? 0 : fillPct}%` }}
          />
          <div className="absolute top-1/2 left-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded bg-[#d97706]" />
        </div>
        {passed && !finished ? (
          <div className="flex flex-wrap items-center justify-center gap-4">
            <p className="font-semibold text-emerald-400">ถูกต้อง! ผ่านข้อนี้</p>
            <button type="button" onClick={() => goTo(index + 1)} className="rounded-full border border-white/60 px-5 py-1.5 font-semibold hover:bg-white/10">
              {index + 1 < QUESTIONS.length ? 'ข้อต่อไป' : 'ดูผล'}
            </button>
          </div>
        ) : lock && !finished && lock.name !== target ? (
          <p className="text-sm text-amber-200">ได้ยินคอร์ด {lock.name} ยังไม่ใช่ ลองดีดคอร์ด {target}</p>
        ) : null}
        {running ? (
          <button type="button" onClick={stop} className="rounded-full bg-[#b95500] px-8 py-2.5 text-lg font-semibold hover:bg-[#9a4700]">
            หยุด
          </button>
        ) : (
          <button type="button" onClick={() => void start()} className="rounded-full bg-[#b95500] px-8 py-2.5 text-lg font-semibold hover:bg-[#9a4700]">
            เริ่ม
          </button>
        )}
        {error ? (
          <p role="alert" className="text-center text-sm text-red-300">
            {error}
          </p>
        ) : null}
      </section>

      <section aria-label="ความไวไมค์" className="mt-3 flex flex-col gap-2 rounded-xl bg-[#2a3a5c] px-5 py-4">
        <label htmlFor="gate" className="font-semibold">
          ความไวไมค์ (เกณฑ์เสียง {gateDb} dB)
        </label>
        <input
          id="gate"
          type="range"
          min={-60}
          max={-20}
          step={1}
          value={gateDb}
          onChange={(e) => setGateDb(Number(e.target.value))}
          className="w-full accent-[#d97706]"
        />
        <div className="flex justify-between text-xs text-neutral-300">
          <span>ไวมาก (-60)</span>
          <span>ไวน้อย (-20)</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/20" aria-hidden="true">
          <div
            className={`h-full ${levelDb !== null && levelDb >= gateDb ? 'bg-emerald-500' : 'bg-neutral-400'}`}
            style={{ width: `${levelDb === null ? 0 : Math.min(100, Math.max(0, ((levelDb + 70) / 60) * 100))}%` }}
          />
          <div className="absolute top-0 h-full w-0.5 bg-[#d97706]" style={{ left: `${((gateDb + 70) / 60) * 100}%` }} />
        </div>
        <p className="text-sm text-neutral-300">
          {levelDb === null
            ? 'กด "เริ่ม" เพื่อดูระดับเสียง'
            : `ระดับเสียงตอนนี้ ${Math.round(levelDb)} dB — ${levelDb >= gateDb ? 'ดังพอ ระบบกำลังฟัง' : 'เบากว่าเกณฑ์ ระบบไม่ฟัง'}`}
        </p>
        <p className="text-xs text-neutral-400">ถ้าห้องมีเสียงรบกวนจนระบบฟังตลอด ให้เลื่อนไปทางขวา ถ้าดีดแล้วระบบไม่ฟัง ให้เลื่อนไปทางซ้าย</p>
      </section>

      <section aria-label="คอร์ดที่ใกล้ที่สุด" className="mt-3 rounded-xl bg-[#2a3a5c] px-5 py-4">
        <h2 className="mb-2 text-lg font-semibold">คอร์ดที่ใกล้ที่สุด</h2>
        <ul className="flex flex-col gap-1.5">
          {Array.from({ length: ROWS }, (_, i) => {
            const r = rows?.[i];
            const pct = r ? Math.round(r.score * 100) : 0;
            return (
              <li key={i} className="flex items-center gap-4 font-semibold">
                <span className="w-9">{r ? r.name : '#'}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                  <span className="block h-full rounded-full bg-[#d6c7b5]" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-9 text-right tabular-nums">{pct}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
