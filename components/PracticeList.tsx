'use client';

import { useActionState, useDeferredValue, useEffect, useRef, useState, useTransition } from 'react';
import { deletePracticeLog, updatePracticeLog } from '@/app/(learner)/practice/actions';
import { FormMessage } from '@/components/FormMessage';
import { PracticeFields, type LessonOption } from '@/components/PracticeFields';
import { keepValuesSubmit } from '@/components/useKeepValuesSubmit';
import type { ActionState } from '@/lib/action-state';
import type { PracticeLog } from '@/lib/data/practice';
import { activityLabel, feelingLabel, practiceTitle } from '@/lib/practice-activities';

type Shared = { today: string; lessons: LessonOption[] };

function EditRow({ log, today, lessons, onDone }: Shared & { log: PracticeLog; onDone: () => void }) {
  const initial: ActionState = { ok: false };
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await updatePracticeLog(log.id, prev, fd);
    if (r.ok) onDone();
    return r;
  }, initial);
  const v = state.values ?? {};
  return (
    <form onSubmit={keepValuesSubmit(action)} className="edit-form">
      <PracticeFields
        idPrefix={`edit-${log.id}-`}
        today={today}
        lessons={lessons}
        errors={state.fieldErrors}
        values={{
          practicedOn: v.practicedOn ?? log.practicedOn,
          minutes: v.minutes ?? String(log.minutes),
          activity: v.activity ?? log.activity,
          topic: v.topic ?? log.topic ?? '',
          feeling: v.feeling ?? log.feeling ?? '',
          note: v.note ?? log.note ?? '',
          lessonId: v.lessonId ?? log.lessonId ?? '',
        }}
      />
      <FormMessage state={state} />
      <div className="row-actions">
        <button type="submit" className="btn btn-amber" disabled={pending}>
          บันทึก
        </button>
        <button type="button" className="btn btn-line" onClick={onDone}>
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function DeleteDialog({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = `delete-title-${id}`;

  // Native modal: focus trap, Escape and inert background come from showModal().
  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) {
      d.showModal();
      cancelRef.current?.focus();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
      className="confirm"
    >
      <h2 id={titleId}>ลบบันทึกนี้?</h2>
      <p>“{title}” จะหายไปถาวร และนาทีของครั้งนี้จะถูกหักออกจากสถิติ</p>
      {error ? <p role="alert" className="err">{error}</p> : null}
      <div className="row-actions">
        <button
          type="button"
          disabled={pending}
          className="btn btn-danger"
          onClick={() =>
            start(async () => {
              const r = await deletePracticeLog(id);
              if (r.ok) onClose();
              else setError(r.message ?? null);
            })
          }
        >
          ลบ
        </button>
        <button ref={cancelRef} type="button" disabled={pending} className="btn btn-line" onClick={() => dialogRef.current?.close()}>
          ยกเลิก
        </button>
      </div>
    </dialog>
  );
}

function Row({ log, today, lessons }: Shared & { log: PracticeLog }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);
  const title = practiceTitle(log);
  const feeling = feelingLabel(log.feeling);
  return (
    <li className={`entry${editing ? ' editing' : ''}`}>
      {editing ? (
        <EditRow log={log} today={today} lessons={lessons} onDone={() => setEditing(false)} />
      ) : (
        <>
          <div className="entry-text">
            <h4>{title}</h4>
            <p className="entry-meta">
              <span>{activityLabel(log.activity)}</span>
              {log.lessonTitle ? <span>บทเรียน {log.lessonTitle}</span> : null}
              {feeling ? <span className={`feel tone-${log.feeling}`}>{feeling}</span> : null}
            </p>
            {log.note ? <p className="entry-note">{log.note}</p> : null}
            <div className="entry-actions">
              <button type="button" className="link-btn" onClick={() => setEditing(true)}>
                แก้ไข
              </button>
              <button ref={deleteBtnRef} type="button" className="link-btn danger" onClick={() => setDeleting(true)}>
                ลบ
              </button>
            </div>
          </div>
          <p className="entry-mins">
            <b>{log.minutes}</b> นาที
          </p>
        </>
      )}
      {deleting ? (
        <DeleteDialog
          id={log.id}
          title={title}
          onClose={() => {
            setDeleting(false);
            deleteBtnRef.current?.focus();
          }}
        />
      ) : null}
    </li>
  );
}

function hoursText(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} ชม.${m ? ` ${m} นาที` : ''}`;
}

/** วันนี้ / เมื่อวาน / "ศ. 31 ต.ค." (year only when it is not the current one). */
function dayLabel(iso: string, today: string): string {
  if (iso === today) return 'วันนี้';
  const t = new Date(`${today}T00:00:00Z`);
  const d = new Date(`${iso}T00:00:00Z`);
  if ((t.getTime() - d.getTime()) / 864e5 === 1) return 'เมื่อวาน';
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(iso.slice(0, 4) === today.slice(0, 4) ? {} : { year: 'numeric' }),
  }).format(d);
}

export function PracticeList({
  logs,
  today,
  lessons,
  totals,
}: Shared & { logs: PracticeLog[]; totals: { sessions: number; minutes: number } }) {
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query.trim().toLowerCase());
  const shown = q
    ? logs.filter((l) =>
        [l.topic, l.note, l.lessonTitle, activityLabel(l.activity), feelingLabel(l.feeling), l.practicedOn]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q)),
      )
    : logs;
  const days: { date: string; logs: PracticeLog[] }[] = [];
  for (const l of shown) {
    const last = days[days.length - 1];
    if (last?.date === l.practicedOn) last.logs.push(l);
    else days.push({ date: l.practicedOn, logs: [l] });
  }

  return (
    <section className="panel journal" aria-labelledby="history">
      <div className="journal-head">
        <div>
          <h2 id="history">ประวัติการซ้อม</h2>
          <p className="totals" data-testid="practice-totals">
            ซ้อมมาแล้ว {totals.sessions} ครั้ง รวม {hoursText(totals.minutes)}
          </p>
        </div>
        {logs.length > 0 ? (
          <label className="search">
            <span className="sr-only">ค้นหาบันทึกการซ้อม</span>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหา เช่น คอร์ด Am" />
          </label>
        ) : null}
      </div>

      {logs.length === 0 ? (
        <div className="empty" data-testid="practice-empty">
          <p className="empty-title">ยังไม่มีบันทึก</p>
          <p>เริ่มจับเวลาด้านบน ซ้อมสัก 10 นาที แล้วจดไว้ในช่องบันทึก ครั้งแรกจะขึ้นที่นี่</p>
        </div>
      ) : (
        <>
          {/* Always mounted so screen readers announce the change when the result count updates. */}
          <p className={`search-status${q ? '' : ' sr-only'}`} role="status">
            {q ? (shown.length > 0 ? `พบ ${shown.length} รายการ` : `ไม่พบบันทึกที่มีคำว่า “${query.trim()}”`) : ''}
          </p>
          <div className="days">
            {days.map((d) => {
              const sum = d.logs.reduce((n, l) => n + l.minutes, 0);
              return (
                <section key={d.date} className="day" aria-labelledby={`day-${d.date}`}>
                  <h3 id={`day-${d.date}`} className="day-head">
                    <time dateTime={d.date}>{dayLabel(d.date, today)}</time>
                    {d.logs.length > 1 ? <span className="day-sum">รวม {sum} นาที</span> : null}
                  </h3>
                  <ul className="entries">
                    {d.logs.map((l) => (
                      <Row key={l.id} log={l} today={today} lessons={lessons} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          {totals.sessions > logs.length ? (
            <p className="more">แสดง {logs.length} ครั้งล่าสุดจาก {totals.sessions} ครั้ง</p>
          ) : null}
        </>
      )}
    </section>
  );
}
