'use client';

// SPIKE (throwaway): standalone chord meter for the instructor demo. Not for merge.
import { useEffect, useRef, useState } from 'react';
import type { ChordName } from '@/lib/audio/chords';
import { getAudioContext } from '@/lib/audio/strings';
import { chroma, rankChords, rms } from '../mic/detect';

const FFT_SIZE = 16384;
const LEVEL_WINDOW = 2048;
const TICK_MS = 50;
const GATE = 10 ** (-45 / 20);
// A clear first hit passes at once; a weaker one must hold for about 1 s (20 ticks).
const STRONG_SCORE = 0.8;
const STRONG_MARGIN = 0.05;
const WEAK_SCORE = 0.6;
const FILL_STEP = 1 / 20;
const ROWS = 5;

type Ranking = { name: ChordName; score: number }[];
type Lock = { name: ChordName; progress: number; passed: boolean };

export function ChordMeter() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lock, setLock] = useState<Lock | null>(null);
  const [ranking, setRanking] = useState<Ranking | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => stop(), []);

  function stop() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRunning(false);
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
    setLock(null);
    setRanking(null);

    const time = new Float32Array(FFT_SIZE);
    const freq = new Float32Array(FFT_SIZE / 2);
    let current: Lock | null = null;
    timerRef.current = window.setInterval(() => {
      analyser.getFloatTimeDomainData(time);
      // Silence keeps the last result on screen.
      if (rms(time.subarray(FFT_SIZE - LEVEL_WINDOW)) < GATE) return;
      analyser.getFloatFrequencyData(freq);
      const ranked = rankChords(chroma(freq, ctx.sampleRate, FFT_SIZE));
      const [best, second] = ranked;
      const strong = best.score >= STRONG_SCORE && best.score - second.score >= STRONG_MARGIN;
      const heard = best.score >= WEAK_SCORE;

      if (heard && (!current || current.name !== best.name)) {
        current = { name: best.name, progress: strong ? 1 : FILL_STEP, passed: strong };
      } else if (current && !current.passed) {
        const progress = Math.min(1, Math.max(0, current.progress + (heard ? FILL_STEP : -FILL_STEP / 2)));
        current = { ...current, progress, passed: progress >= 1 };
      }
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
      <section
        aria-label="คอร์ดที่ได้ยิน"
        className="flex flex-col items-center gap-6 rounded-xl bg-[#2a3a5c] px-6 py-8"
      >
        <p
          role="status"
          aria-live="polite"
          className={`text-6xl leading-none font-bold ${lock?.passed ? 'text-emerald-400' : 'text-white'}`}
        >
          {lock ? lock.name : '–'}
        </p>
        <div
          role="progressbar"
          aria-label={lock?.passed ? `ผ่าน: คอร์ด ${lock.name}` : 'ความมั่นใจของคอร์ดที่ได้ยิน'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((lock?.progress ?? 0) * 100)}
          className="relative h-2.5 w-full max-w-md rounded-full bg-white"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-100 ${lock?.passed ? 'bg-emerald-500' : 'bg-amber-400'}`}
            style={{ width: `${fillPct}%` }}
          />
          <div className="absolute top-1/2 left-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded bg-[#d97706]" />
        </div>
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
