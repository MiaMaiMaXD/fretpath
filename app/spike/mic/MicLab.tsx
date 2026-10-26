'use client';

// SPIKE (throwaway): live mic test for note/chord detection. Not for merge.
import { useEffect, useRef, useState } from 'react';
import { CHORDS, chordFrequencies, type ChordName } from '@/lib/audio/chords';
import { getAudioContext, pluck } from '@/lib/audio/strings';
import { NOTE_NAMES, centsOff, chroma, detectPitch, pitchClass, rankChords, rms } from './detect';

const CHORD_NAMES = Object.keys(CHORDS) as ChordName[];
const FFT_SIZE = 16384;
const PITCH_WINDOW = 2048;
const TICK_MS = 50;
// A match must hold for this many consecutive ticks (6 x 50 ms = 0.3 s).
const PASS_TICKS = 6;
const CHORD_MIN_SCORE = 0.8;
const CHORD_MIN_MARGIN = 0.05;
const NOTE_MIN_CLARITY = 0.8;
// Ignore the mic while the prompt plays through the speaker, or the synth would pass itself.
const PROMPT_MUTE_MS = 2500;

type Target = { kind: 'chord'; name: ChordName } | { kind: 'note'; pc: number };
type View = {
  level: number;
  chroma: number[];
  ranking: { name: ChordName; score: number }[];
  pitch: { hz: number; clarity: number } | null;
  muted: boolean;
};
type HistoryRow = { target: string; strums: number; seconds: number };

function targetLabel(t: Target): string {
  return t.kind === 'chord' ? `คอร์ด ${t.name}` : `โน้ต ${NOTE_NAMES[t.pc]}`;
}

function randomTarget(kind: Target['kind'], prev: Target | null): Target {
  for (;;) {
    const t: Target =
      kind === 'chord'
        ? { kind, name: CHORD_NAMES[Math.floor(Math.random() * CHORD_NAMES.length)] }
        : { kind, pc: Math.floor(Math.random() * 12) };
    if (!prev || targetLabel(t) !== targetLabel(prev)) return t;
  }
}

function playTarget(t: Target): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (t.kind === 'chord') {
    const freqs = chordFrequencies(t.name);
    freqs.forEach((hz, i) => window.setTimeout(() => pluck(ctx, hz, 2, 1 / freqs.length), i * 60));
  } else {
    // Octave 3 (C3..B3) sits in the middle of the guitar's range.
    pluck(ctx, 440 * 2 ** ((48 + t.pc - 69) / 12), 2);
  }
}

function db(x: number): number {
  return x > 0 ? 20 * Math.log10(x) : -100;
}

export function MicLab() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateDb, setGateDb] = useState(-40);
  const [view, setView] = useState<View | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [passed, setPassed] = useState(false);
  const [strums, setStrums] = useState(0);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const mutedUntil = useRef(0);
  const gateRef = useRef(10 ** (-40 / 20));
  const quiz = useRef({ target: null as Target | null, passed: false, ticks: 0, strums: 0, startedAt: 0 });

  useEffect(() => {
    gateRef.current = 10 ** (gateDb / 20);
  }, [gateDb]);

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
          ? 'ไม่ได้รับอนุญาตให้ใช้ไมค์ — เปิดสิทธิ์ไมค์ของเว็บนี้ในการตั้งค่าเบราว์เซอร์แล้วลองใหม่'
          : name === 'NotFoundError'
            ? 'ไม่พบไมค์ในเครื่องนี้'
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

    const time = new Float32Array(FFT_SIZE);
    const freq = new Float32Array(FFT_SIZE / 2);
    let prevLevel = 0;
    timerRef.current = window.setInterval(() => {
      analyser.getFloatTimeDomainData(time);
      analyser.getFloatFrequencyData(freq);
      const recent = time.subarray(FFT_SIZE - PITCH_WINDOW);
      const level = rms(recent);
      const muted = performance.now() < mutedUntil.current;
      const active = level > gateRef.current && !muted;
      const ch = chroma(freq, ctx.sampleRate, FFT_SIZE);
      const ranking = rankChords(ch);
      const pitch = active ? detectPitch(recent, ctx.sampleRate) : null;

      const q = quiz.current;
      if (q.target && !q.passed) {
        if (active && level > prevLevel * 1.8) {
          q.strums += 1;
          setStrums(q.strums);
        }
        let match = false;
        if (active && q.target.kind === 'chord') {
          const [best, second] = ranking;
          match =
            best.name === q.target.name &&
            best.score >= CHORD_MIN_SCORE &&
            best.score - second.score >= CHORD_MIN_MARGIN;
        } else if (active && pitch && q.target.kind === 'note') {
          match = pitch.clarity >= NOTE_MIN_CLARITY && pitchClass(pitch.hz) === q.target.pc;
        }
        q.ticks = match ? q.ticks + 1 : 0;
        if (q.ticks >= PASS_TICKS) {
          q.passed = true;
          setPassed(true);
          const row = {
            target: targetLabel(q.target),
            strums: Math.max(1, q.strums),
            seconds: Math.round((performance.now() - q.startedAt) / 100) / 10,
          };
          setHistory((h) => [row, ...h].slice(0, 20));
        }
      }
      prevLevel = level;
      setView({ level, chroma: ch, ranking, pitch, muted });
    }, TICK_MS);
    setRunning(true);
  }

  function newTarget(kind: Target['kind']) {
    const t = randomTarget(kind, target);
    quiz.current = { target: t, passed: false, ticks: 0, strums: 0, startedAt: performance.now() };
    setTarget(t);
    setPassed(false);
    setStrums(0);
    setRevealed(false);
    mutedUntil.current = performance.now() + PROMPT_MUTE_MS;
    playTarget(t);
  }

  function replay() {
    if (!target) return;
    mutedUntil.current = performance.now() + PROMPT_MUTE_MS;
    playTarget(target);
  }

  const active = view ? view.level > 10 ** (gateDb / 20) && !view.muted : false;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">หน้าทดลอง (spike) — ใช้แล้วทิ้ง ไม่บันทึกข้อมูล</p>
        <h1 className="text-2xl font-bold">ทดสอบฟังโน้ตและคอร์ดจากไมค์</h1>
        <p>ทำในที่เงียบ ถือกีตาร์ห่างไมค์ประมาณ 30–50 ซม. ปิดหูฟัง Bluetooth ก่อน</p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {running ? (
            <button type="button" onClick={stop} className="rounded border px-4 py-2">
              ปิดไมค์
            </button>
          ) : (
            <button type="button" onClick={() => void start()} className="rounded border px-4 py-2 font-semibold">
              เปิดไมค์
            </button>
          )}
          <label className="flex items-center gap-2 text-sm">
            ความไวไมค์ (เกณฑ์เสียง {gateDb} dB)
            <input
              id="gate"
              type="range"
              min={-60}
              max={-20}
              step={1}
              value={gateDb}
              onChange={(e) => setGateDb(Number(e.target.value))}
            />
          </label>
        </div>
        {error ? (
          <p role="alert" className="text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
        {view ? (
          <div className="flex flex-col gap-1 text-sm">
            <div className="h-3 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
              <div
                className={`h-full ${active ? 'bg-green-600' : 'bg-neutral-500'}`}
                style={{ width: `${Math.min(100, Math.max(0, (db(view.level) + 70) * (100 / 60)))}%` }}
              />
            </div>
            <p>
              ระดับเสียง {Math.round(db(view.level))} dB —{' '}
              {view.muted ? 'กำลังเล่นโจทย์ (ไม่ฟังไมค์)' : active ? 'ได้ยินเสียง' : 'เงียบ / เบาเกินไป'}
            </p>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded border p-4">
        <h2 className="text-xl font-semibold">ลองทำข้อสอบดีดตาม</h2>
        <p className="text-sm">กดสุ่มโจทย์ ฟังเสียง แล้วดีดกีตาร์ตาม ระบบจะบอกเมื่อดีดถูก ดีดใหม่ได้ไม่จำกัด</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!running} onClick={() => newTarget('chord')} className="rounded border px-3 py-2 disabled:opacity-50">
            สุ่มโจทย์คอร์ด
          </button>
          <button type="button" disabled={!running} onClick={() => newTarget('note')} className="rounded border px-3 py-2 disabled:opacity-50">
            สุ่มโจทย์โน้ต
          </button>
          <button type="button" disabled={!target} onClick={replay} className="rounded border px-3 py-2 disabled:opacity-50">
            ฟังโจทย์อีกครั้ง
          </button>
          <button type="button" disabled={!target} onClick={() => setRevealed(true)} className="rounded border px-3 py-2 disabled:opacity-50">
            ดูเฉลย
          </button>
        </div>
        {!running ? <p className="text-sm">เปิดไมค์ก่อนจึงจะสุ่มโจทย์ได้</p> : null}
        {target ? (
          <div role="status" className="flex flex-col gap-1">
            <p>
              โจทย์: <strong>{revealed || passed ? targetLabel(target) : 'ฟังแล้วดีดตาม'}</strong> · ดีดไปแล้ว {strums} ครั้ง
            </p>
            {passed ? (
              <p className="text-lg font-bold text-green-700 dark:text-green-400">ถูกต้อง! ผ่านข้อนี้</p>
            ) : (
              <p>กำลังฟัง… (ต้องตรงต่อเนื่อง {(PASS_TICKS * TICK_MS) / 1000} วินาที)</p>
            )}
          </div>
        ) : null}
        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="pr-3">โจทย์</th>
                  <th className="pr-3">ดีดกี่ครั้งจนผ่าน</th>
                  <th>เวลา (วินาที)</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td className="pr-3">{h.target}</td>
                    <td className="pr-3 tabular-nums">{h.strums}</td>
                    <td className="tabular-nums">{h.seconds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {view ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">ระบบได้ยินอะไร (สด)</h2>
          <div>
            <h3 className="font-semibold">โน้ตเดี่ยว</h3>
            <p className="text-2xl tabular-nums">
              {view.pitch && view.pitch.clarity >= NOTE_MIN_CLARITY
                ? `${NOTE_NAMES[pitchClass(view.pitch.hz)]} · ${view.pitch.hz.toFixed(1)} Hz · ${centsOff(view.pitch.hz) > 0 ? '+' : ''}${centsOff(view.pitch.hz)} cent`
                : '—'}
            </p>
          </div>
          <div>
            <h3 className="font-semibold">คอร์ดที่ใกล้ที่สุด</h3>
            <ul className="flex flex-col gap-1">
              {view.ranking.map((r, i) => (
                <li key={r.name} className="flex items-center gap-2 text-sm">
                  <span className={`w-8 ${i === 0 && active ? 'font-bold' : ''}`}>{r.name}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                    <span
                      className={`block h-full ${r.score >= CHORD_MIN_SCORE ? 'bg-green-600' : 'bg-neutral-500'}`}
                      style={{ width: `${Math.round(r.score * 100)}%` }}
                    />
                  </span>
                  <span className="w-10 text-right tabular-nums">{Math.round(r.score * 100)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">น้ำหนักของแต่ละโน้ต (chroma)</h3>
            <div className="flex h-24 items-end gap-1">
              {view.chroma.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-sky-600" style={{ height: `${Math.round(v * 80)}px` }} />
                  <span className="text-xs">{NOTE_NAMES[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
