'use client';

import { useState } from 'react';
import type { LessonOption } from '@/components/PracticeFields';
import { PracticeTable } from '@/components/practice/PracticeTable';
import type { PracticeLog } from '@/lib/data/practice';
import { practiceTitle } from '@/lib/practice-activities';

/** The card on /practice/history: lifetime total, search, and every session as an editable table. */
export function PracticeList({
  logs,
  today,
  lessons,
  lessonNo,
  totals,
}: {
  logs: PracticeLog[];
  today: string;
  lessons: LessonOption[];
  lessonNo: Record<string, number>;
  totals: { sessions: number; minutes: number };
}) {
  // What is typed vs. what was searched: the list only filters when the learner presses Enter
  // (or the keyboard's search key on a phone). Emptying the box shows everything again right away.
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const q = term.toLowerCase();
  // Search matches the session name only ("วันนี้ฝึกอะไร", or "ฝึก<หมวด>" when it was left empty) — what the row shows as its title.
  const shown = q ? logs.filter((l) => practiceTitle(l).toLowerCase().includes(q)) : logs;

  return (
    <section className="hist-card" aria-labelledby="history">
      <div className="hist-head">
        <div>
          <h2 id="history">รายการบันทึกการซ้อมของคุณ</h2>
          <p className="totals" data-testid="practice-totals">
            เวลาฝึกซ้อมทั้งหมด {totals.minutes} นาที · {totals.sessions} ครั้ง
          </p>
        </div>
        {logs.length > 0 ? (
          <form
            role="search"
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              setTerm(query.trim());
              // phones: close the keyboard so the results are visible
              if (window.matchMedia('(pointer: coarse)').matches) (document.activeElement as HTMLElement | null)?.blur();
            }}
          >
            <label htmlFor="history-search" className="sr-only">
              ค้นหาบันทึกการซ้อม
            </label>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              id="history-search"
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim() === '') setTerm('');
              }}
              placeholder="ค้นหาชื่อ"
            />
          </form>
        ) : null}
      </div>

      {logs.length === 0 ? (
        <div className="hist-empty" data-testid="practice-empty">
          <p className="empty-title">ยังไม่มีบันทึก</p>
          <p>ไปที่หน้าบันทึกการฝึก จับเวลาซ้อมสัก 10 นาที แล้วจดไว้ ครั้งแรกจะขึ้นที่นี่</p>
        </div>
      ) : (
        <>
          {/* Always mounted so screen readers announce the change when the result count updates. */}
          <p className={`search-status${q ? '' : ' sr-only'}`} role="status">
            {q ? (shown.length > 0 ? `พบ ${shown.length} รายการ` : `ไม่พบบันทึกที่มีคำว่า “${term}”`) : ''}
          </p>
          {shown.length > 0 ? (
            <PracticeTable logs={shown} labelledBy="history" today={today} lessons={lessons} lessonNo={lessonNo} />
          ) : null}
          {totals.sessions > logs.length ? (
            <p className="more">แสดง {logs.length} ครั้งล่าสุดจาก {totals.sessions} ครั้ง</p>
          ) : null}
        </>
      )}
    </section>
  );
}
