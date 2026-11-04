'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatClock, useMetronome, usePracticeTimer } from '@/components/practice/PracticeSession';

/**
 * Floating bar (bottom right) that keeps the practice timer and metronome reachable on every learner page.
 * Hidden on /practice itself, where the full stage is on screen, and when nothing is going on.
 */
export function MiniPlayer() {
  const pathname = usePathname();
  const { running, elapsed, start, pause } = usePracticeTimer();
  const metro = useMetronome();
  if (pathname === '/practice' || (elapsed === 0 && !metro.running)) return null;

  const [mm, ss] = formatClock(elapsed);
  return (
    <div className={`mini-player${running ? ' is-running' : ''}`} role="region" aria-label="ตัวจับเวลาระหว่างซ้อม" data-testid="mini-player">
      <Link href="/practice" className="mini-time" aria-label={`${running ? 'กำลังจับเวลา' : 'พักเวลาไว้'} ${mm} นาที ${ss} วินาที กลับไปหน้าซ้อม`}>
        <span className="mini-rec" aria-hidden="true" />
        <span aria-hidden="true">
          {mm}:{ss}
        </span>
      </Link>
      <span className="mini-sep" aria-hidden="true" />
      <button
        type="button"
        className={`mini-metro${metro.running ? ' on' : ''}`}
        aria-pressed={metro.running}
        aria-label={metro.running ? `หยุดเสียงเคาะ (${metro.bpm} BPM)` : `เปิดเสียงเคาะ ${metro.bpm} BPM`}
        disabled={!metro.supported}
        onClick={metro.running ? metro.stop : metro.start}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M7 17h6l-2-13H9z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M10 13l4-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <b>{metro.bpm}</b>
      </button>
      <button
        type="button"
        className="mini-play"
        aria-label={running ? 'พักเวลา' : 'จับเวลาต่อ'}
        onClick={running ? pause : start}
      >
        {running ? (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <rect x="5" y="4" width="3.5" height="12" rx="1" fill="currentColor" />
            <rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M6 4l10 6-10 6z" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  );
}
