'use client';

import { useEffect, useRef, useState } from 'react';

/** Tracks an element's width so charts draw at real size and their text never shrinks on phones. */
function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

type Tip = { x: number; y: number; value: string; label: string } | null;

function Tooltip({ tip }: { tip: Tip }) {
  return (
    <div className={`tooltip${tip ? ' show' : ''}`} aria-hidden="true" style={tip ? { left: tip.x, top: tip.y } : undefined}>
      {tip ? (
        <>
          <strong>{tip.value}</strong>
          <span>{tip.label}</span>
        </>
      ) : null}
    </div>
  );
}

function TableView({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <details className="table-toggle">
      <summary>ดูเป็นตาราง</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">{head[0]}</th>
            <th scope="col">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a}>
              <td>{a}</td>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export type PracticeDay = { day: string; date: string; minutes: number; today: boolean };

/** Vertical bars: minutes practised on each of the last 7 days, today highlighted. */
export function PracticeChart({ days, summary }: { days: PracticeDay[]; summary: string }) {
  const [ref, W] = useWidth(460);
  const [tip, setTip] = useState<Tip>(null);
  const H = 210, L = 34, B = 30, T = 14, R = 6;
  const values = days.map((d) => d.minutes);
  // A multiple of 30 keeps the mid gridline a whole number (15, 30, 45 …).
  const max = Math.max(30, Math.ceil(Math.max(...values) / 30) * 30);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const slot = (W - L - R) / days.length;
  const bw = Math.min(30, slot - 14);
  const peak = values.indexOf(Math.max(...values));

  return (
    <div className="chart" ref={ref}>
      <div className="chart-canvas">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} onPointerLeave={() => setTip(null)}>
          {[0, max / 2, max].map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#cbd5e1' : '#eef2f6'} />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#8a97aa">
                {v}
              </text>
            </g>
          ))}
          {days.map((d, i) => {
            const cx = L + slot * i + slot / 2;
            const top = y(d.minutes);
            const h = Math.max(0, y(0) - top);
            const r = Math.min(4, h);
            return (
              <g key={d.date}>
                <rect
                  x={cx - slot / 2}
                  y={T}
                  width={slot}
                  height={H - T - B}
                  className="hit"
                  onPointerEnter={() => setTip({ x: (cx / W) * 100, y: top, value: `${d.minutes} นาที`, label: `${d.day} ${d.date}` })}
                />
                {h > 0 ? (
                  <path
                    className={`bar${d.today ? ' today' : ''}`}
                    d={`M${cx - bw / 2},${y(0)} V${top + r} q0,-${r} ${r},-${r} H${cx + bw / 2 - r} q${r},0 ${r},${r} V${y(0)} Z`}
                  />
                ) : null}
                <text
                  x={cx}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize={12}
                  fill={d.today ? '#1e293b' : '#55657d'}
                  fontWeight={d.today ? 700 : 400}
                >
                  {d.today ? 'วันนี้' : d.day}
                </text>
              </g>
            );
          })}
          {values[peak] > 0 ? (
            <text x={L + slot * peak + slot / 2} y={y(values[peak]) - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill="#1e293b">
              {values[peak]}
            </text>
          ) : null}
        </svg>
        <Tooltip tip={tip} />
      </div>
      <TableView head={['วัน', 'นาที']} rows={days.map((d) => [`${d.day} ${d.date}`, String(d.minutes)])} />
    </div>
  );
}

export type ScoreRow = { n: number; title: string; score: number | null; locked: boolean };

/** Horizontal bars: best quiz score per lesson, with a dashed pass-mark line. */
export function ScoresChart({ rows, pass, summary }: { rows: ScoreRow[]; pass: number; summary: string }) {
  const [ref, W] = useWidth(460);
  const [tip, setTip] = useState<Tip>(null);
  const rowH = 34, T = 6, L = 54, R = 46;
  const H = T + rowH * rows.length + 22;
  const x = (v: number) => L + ((W - L - R) * v) / 100;
  const px = x(pass);

  return (
    <div className="chart" ref={ref}>
      <div className="chart-canvas">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} onPointerLeave={() => setTip(null)}>
          {rows.map((r, i) => {
            const cy = T + rowH * i + rowH / 2;
            return (
              <g key={r.n}>
                <text x={0} y={cy + 4} fontSize={12.5} fill="#55657d">
                  บทที่ {r.n}
                </text>
                <rect x={L} y={cy - 6} width={W - L - R} height={12} rx={4} fill="#f1f4f8" />
                {r.score === null ? (
                  <text x={L + 10} y={cy + 4} fontSize={12} fill="#8a97aa">
                    {r.locked ? 'ยังล็อก' : 'ยังไม่ได้สอบ'}
                  </text>
                ) : (
                  <>
                    <rect
                      x={L}
                      y={cy - rowH / 2}
                      width={W - L - R}
                      height={rowH}
                      className="hit"
                      onPointerEnter={() =>
                        setTip({
                          x: (x(r.score!) / W) * 100,
                          y: cy - 6,
                          value: `${r.score}%`,
                          label: `บทที่ ${r.n} ${r.title} · ${r.score! >= pass ? 'ผ่าน' : 'ยังไม่ผ่าน'}`,
                        })
                      }
                    />
                    <rect className="bar" x={L} y={cy - 6} width={Math.max(4, x(r.score) - L)} height={12} rx={4} />
                    <text x={x(r.score) + 8} y={cy + 4.5} fontSize={13} fontWeight={600} fill="#1e293b">
                      {r.score}%
                    </text>
                  </>
                )}
              </g>
            );
          })}
          <line x1={px} x2={px} y1={T - 2} y2={T + rowH * rows.length} stroke="#1e293b" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.55} />
          <text x={px} y={H - 4} textAnchor="middle" fontSize={11.5} fill="#55657d">
            ผ่าน {pass}%
          </text>
        </svg>
        <Tooltip tip={tip} />
      </div>
      <TableView
        head={['บท', 'คะแนนสูงสุด']}
        rows={rows.map((r) => [`บทที่ ${r.n} ${r.title}`, r.score === null ? '—' : `${r.score}%`])}
      />
    </div>
  );
}
