'use client';

import { useEffect, useRef } from 'react';

export type ScoreColumn = {
  /** Lesson number shown as "บทที่ N" (1-based: its fret on the path + 1). */
  n: number;
  title: string;
  /** null: not attempted, locked, or a lesson that is not published yet. */
  score: number | null;
  state: 'scored' | 'open' | 'locked' | 'soon';
};

export type ScoreUnit = { name: string; from: number; to: number };

const TICKS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];

/**
 * Column chart of the best quiz score per lesson on a fixed 0–100 scale. Every lesson of the path
 * gets a column; the plot scrolls sideways (about six columns at a time) with the y-axis pinned,
 * and a band under the labels marks each part of the course.
 */
export function ScoresChart({
  columns,
  units,
  pass,
  current,
  summary,
}: {
  columns: ScoreColumn[];
  units: ScoreUnit[];
  pass: number;
  /** Column to bring into view on first paint (the lesson to study next). */
  current: number | null;
  summary: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el || current === null) return;
    const col = el.querySelector<HTMLElement>(`[data-col="${current}"]`);
    if (!col) return;
    const right = col.offsetLeft + col.offsetWidth;
    if (right > el.clientWidth) el.scrollLeft = right - el.clientWidth;
  }, [current]);

  return (
    <div className="scores" style={{ '--cols': columns.length } as React.CSSProperties}>
      <div className="y-axis" aria-hidden="true">
        {TICKS.map((t) => (
          <span key={t} style={{ bottom: `${t}%` }}>
            {t}
          </span>
        ))}
      </div>
      <div className="scroller" ref={scroller} tabIndex={0} role="group" aria-label="คะแนนรายบท เลื่อนซ้ายขวาเพื่อดูบทอื่น">
        <div className="plot" role="img" aria-label={summary}>
          <div className="grid">
            <i className="pass-line" style={{ bottom: `${pass}%` }} />
            {columns.map((c) => (
              <div key={c.n} className={`col ${c.state}`} data-col={c.n} title={c.score === null ? undefined : `บทที่ ${c.n} ${c.title}: ${c.score}%`}>
                {c.score !== null ? (
                  <div className={`bar${c.score >= pass ? '' : ' low'}`} style={{ height: `${Math.max(c.score, 1)}%` }}>
                    <span className="val">{c.score}%</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="x-labels">
            {columns.map((c) => (
              <span key={c.n} className={c.state}>
                บทที่ {c.n}
              </span>
            ))}
          </div>
          <div className="units">
            {units.map((u, i) => (
              <div key={u.from} className={`unit u${i % 2}`} style={{ gridColumn: `${u.from + 1} / ${u.to + 2}` }}>
                <span>{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
