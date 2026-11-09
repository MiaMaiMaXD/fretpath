'use client';

import { useEffect, useRef, useState } from 'react';
import { OPEN_STRINGS, getAudioContext } from '@/lib/audio/strings';

// Strings are indexed 0 (string 6, low E) … 5 (string 1, high E).
// frets: -1 = muted, 0 = open, n = fret number. fingers: 1–4, 0 = none.
type ChordKey = 'G' | 'D' | 'Em' | 'C' | 'open';
const CHORDS: Record<ChordKey, { frets: number[]; fingers: number[]; note: string }> = {
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], note: 'G — ดีดได้ทั้ง 6 สาย เป็นหนึ่งในคอร์ดที่ใช้บ่อยที่สุด' },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], note: 'D — ดีดแค่ 4 สายล่าง เสียงสว่าง ใช้คู่กับ G บ่อยมาก' },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], note: 'Em — คอร์ดที่ง่ายที่สุด ใช้แค่ 2 นิ้ว เป็นคอร์ดแรกในบทที่ 3' },
  C: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], note: 'C — ไม่ดีดสาย 6 ระวังนิ้ว 3 แตะสาย 4 จนเสียงบอด' },
  open: { frets: [0, 0, 0, 0, 0, 0], fingers: [0, 0, 0, 0, 0, 0], note: 'สายเปล่า E A D G B E — ใช้ฟังตอนตั้งสายในบทที่ 1' },
};
const BUTTONS: { key: ChordKey; label: string }[] = [
  { key: 'G', label: 'G' },
  { key: 'D', label: 'D' },
  { key: 'Em', label: 'Em' },
  { key: 'C', label: 'C' },
  { key: 'open', label: 'สายเปล่า' },
];

// Fretboard geometry (SVG viewBox 1000 × 250).
const NUT = 92;
const END = 975;
const TOP = 40;
const BOTTOM = 210;
const FRETS = 5;
const fretPos = (n: number) => 1 - Math.pow(2, -n / 12);
// Rounded so the server and the browser render identical SVG coordinates: Math.pow can differ in the
// last bits between Node and the browser, which breaks hydration.
const round2 = (v: number) => Math.round(v * 100) / 100;
const fretX = (n: number) => round2(NUT + ((END - NUT) * fretPos(n)) / fretPos(FRETS));
const stringY = (i: number) => TOP + ((BOTTOM - TOP) * i) / 5;
const NAMES = OPEN_STRINGS.map((s) => s.note[0]);
const noteFreq = (i: number, fret: number) => OPEN_STRINGS[i].hz * Math.pow(2, fret / 12);

// Karplus–Strong plucked string, synthesised once per pitch and cached.
const buffers = new Map<string, AudioBuffer>();
function pluckBuffer(ctx: AudioContext, freq: number): AudioBuffer {
  const key = `${ctx.sampleRate}:${freq.toFixed(2)}`;
  const cached = buffers.get(key);
  if (cached) return cached;
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 2.6);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const n = Math.max(2, Math.round(sr / freq));
  let prev = 0;
  for (let i = 0; i < n; i++) {
    prev = 0.6 * (Math.random() * 2 - 1) + 0.4 * prev;
    d[i] = prev;
  }
  for (let i = n; i < len; i++) d[i] = 0.4985 * (d[i - n] + d[i - n + 1]);
  buffers.set(key, buf);
  return buf;
}
function play(freq: number, when = 0, gain = 0.32) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = pluckBuffer(ctx, freq);
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
    src.connect(g).connect(ctx.destination);
    src.start(t);
  } catch {
    // Audio failures must never break the page.
  }
}

export function TryFretboard({ labelledBy }: { labelledBy: string }) {
  const [current, setCurrent] = useState<ChordKey>('G');
  const lines = useRef<(SVGLineElement | null)[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const chord = CHORDS[current];

  function shake(i: number, delayMs = 0) {
    window.setTimeout(() => {
      const line = lines.current[i];
      if (!line) return;
      line.classList.remove('vibrate');
      void line.getBBox(); // restart the CSS animation
      line.classList.add('vibrate');
    }, delayMs);
  }

  function pluckString(i: number) {
    play(noteFreq(i, Math.max(chord.frets[i], 0)));
    shake(i);
  }

  function strum(key: ChordKey) {
    const gap = key === 'open' ? 0.32 : 0.035;
    let k = 0;
    CHORDS[key].frets.forEach((fr, i) => {
      if (fr === -1) return;
      play(noteFreq(i, fr), k * gap, 0.24);
      shake(i, k * gap * 1000);
      k++;
    });
  }

  // On narrow screens the board scrolls sideways: bring the furthest fretted finger into view.
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const maxFret = Math.max(...CHORDS[current].frets);
    const ratio = maxFret >= 3 ? fretX(maxFret) / 1000 : 0;
    const left = Math.max(0, ratio * el.scrollWidth - el.clientWidth + 40);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
  }, [current]);

  return (
    <>
      <div className="board-scroll" ref={scroller}>
        <div className="board">
          <svg viewBox="0 0 1000 250" role="group" aria-labelledby={labelledBy}>
            {[3, 5].map((n) => (
              <circle key={n} cx={(fretX(n - 1) + fretX(n)) / 2} cy={(TOP + BOTTOM) / 2} r={9} fill="#e9dcc6" opacity={0.5} />
            ))}
            <rect x={NUT - 9} y={TOP - 16} width={10} height={BOTTOM - TOP + 32} rx={2} fill="#efe6d4" />
            {Array.from({ length: FRETS }, (_, k) => k + 1).map((n) => (
              <g key={n}>
                <rect x={fretX(n) - 2.5} y={TOP - 16} width={5} height={BOTTOM - TOP + 32} rx={2} fill="#b9bfc6" />
                <text x={(fretX(n - 1) + fretX(n)) / 2} y={242} textAnchor="middle" fill="#a8907a" fontSize={13}>
                  {n}
                </text>
              </g>
            ))}
            {NAMES.map((name, i) => {
              const y = stringY(i);
              const fr = chord.frets[i];
              return (
                <g key={i}>
                  <g
                    className="string-hit"
                    tabIndex={0}
                    role="button"
                    aria-label={`ดีดสาย ${6 - i} (${name})`}
                    data-testid={`string-${6 - i}`}
                    onClick={() => pluckString(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        pluckString(i);
                      }
                    }}
                  >
                    <rect x={NUT - 10} y={y - 14} width={END - NUT + 25} height={28} fill="transparent" />
                    <line
                      ref={(el) => {
                        lines.current[i] = el;
                      }}
                      x1={NUT}
                      y1={y}
                      x2={1000}
                      y2={y}
                      stroke="var(--bronze)"
                      strokeWidth={3.4 - i * 0.42}
                      strokeLinecap="round"
                      opacity={fr === -1 ? 0.35 : 1}
                      className="string-line"
                    />
                  </g>
                  <text x={22} y={y + 5} fill="#e9dcc6" fontSize={15} fontWeight={600} aria-hidden="true">
                    {name}
                  </text>
                  <text
                    x={58}
                    y={y + 5}
                    textAnchor="middle"
                    fontSize={16}
                    fontWeight={700}
                    fill={fr === -1 ? '#f87171' : '#e9dcc6'}
                    aria-hidden="true"
                  >
                    {fr === -1 ? '×' : fr === 0 ? '○' : ''}
                  </text>
                </g>
              );
            })}
            {chord.frets.map((fr, i) => {
              if (fr <= 0) return null;
              const cx = (fretX(fr - 1) + fretX(fr)) / 2 + 8;
              const cy = stringY(i);
              return (
                <g key={`f${i}`} aria-hidden="true" pointerEvents="none">
                  <circle cx={cx} cy={cy} r={15} className="finger" />
                  <text x={cx} y={cy + 5} textAnchor="middle" className="finger-label">
                    {chord.fingers[i]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <div className="controls" role="group" aria-label="เลือกคอร์ด">
        {BUTTONS.map((b) => (
          <button
            key={b.key}
            type="button"
            className="chord-btn"
            aria-pressed={current === b.key}
            data-testid={`chord-${b.key}`}
            onClick={() => {
              setCurrent(b.key);
              strum(b.key);
            }}
          >
            {b.label}
          </button>
        ))}
        <button type="button" className="btn btn-primary strum-btn" data-testid="strum" onClick={() => strum(current)}>
          {current === 'open' ? 'ดีดไล่ทั้ง 6 สาย' : `ดีดคอร์ด ${current}`}
        </button>
      </div>
      <p className="chord-note" aria-live="polite">
        {chord.note}
      </p>
    </>
  );
}
