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
        <button type="submit" className="pill primary" disabled={pending}>
          บันทึก
        </button>
        <button type="button" className="pill" onClick={onDone}>
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
      <p>“{title}” จะถูกลบถาวร และนาทีของรายการนี้จะหายจากสถิติด้วย</p>
      {error ? <p role="alert" className="err">{error}</p> : null}
      <div className="row-actions">
        <button
          type="button"
          disabled={pending}
          className="pill danger"
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
        <button ref={cancelRef} type="button" disabled={pending} className="pill" onClick={() => dialogRef.current?.close()}>
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
        <div className="entry-body">
          <div className="entry-main">
            <p className="chips">
              <span className="chip date">
                <span aria-hidden="true">📅 </span>
                <time dateTime={log.practicedOn}>{log.practicedOn}</time>
              </span>
              <span className="chip mins">
                <span aria-hidden="true">⏱ </span>
                {log.minutes} นาที
              </span>
              {feeling ? <span className="feeling">{feeling}</span> : null}
            </p>
            <h3>{title}</h3>
            <p className="meta">
              {activityLabel(log.activity)}
              {log.lessonTitle ? ` · บทเรียน: ${log.lessonTitle}` : ''}
            </p>
            {log.note ? (
              <p className="tip">
                <span aria-hidden="true">💡 </span>
                {log.note}
              </p>
            ) : null}
          </div>
          <div className="entry-actions">
            <button type="button" className="pill" onClick={() => setEditing(true)}>
              แก้ไข
            </button>
            <button ref={deleteBtnRef} type="button" className="pill danger-outline" onClick={() => setDeleting(true)}>
              ลบรายการ
            </button>
          </div>
        </div>
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
  if (minutes < 60) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return ` (${h} ชม.${m ? ` ${m} นาที` : ''})`;
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

  return (
    <section className="card history" aria-labelledby="history">
      <div className="history-head">
        <div>
          <h2 id="history">
            <span aria-hidden="true">📖 </span>สมุดประวัติการฝึกซ้อมทั้งหมด
          </h2>
          <p className="totals" data-testid="practice-totals">
            รวมทั้งหมด {totals.sessions} ครั้ง • สะสม {totals.minutes} นาที{hoursText(totals.minutes)}
          </p>
        </div>
        {logs.length > 0 ? (
          <label className="search">
            <span className="sr-only">ค้นหาบันทึกการซ้อม</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาหัวข้อที่ซ้อม..."
            />
          </label>
        ) : null}
      </div>

      {logs.length === 0 ? (
        <div className="empty" data-testid="practice-empty">
          <p className="empty-title">ยังไม่มีบันทึกการฝึก</p>
          <p>ลองจับเวลาซ้อมสัก 10 นาที แล้วกด “บันทึกข้อมูลการซ้อม” รายการแรกจะมาอยู่ที่นี่</p>
        </div>
      ) : (
        <>
          {/* Always mounted so screen readers announce the change when the result count updates. */}
          <p className={`search-status${q ? '' : ' sr-only'}`} role="status">
            {q ? (shown.length > 0 ? `พบ ${shown.length} รายการ` : `ไม่พบรายการที่ตรงกับ “${query.trim()}”`) : ''}
          </p>
          <ul className="entries">
            {shown.map((l) => (
              <Row key={l.id} log={l} today={today} lessons={lessons} />
            ))}
          </ul>
          {totals.sessions > logs.length ? (
            <p className="more">แสดง {logs.length} รายการล่าสุดจากทั้งหมด {totals.sessions} รายการ</p>
          ) : null}
        </>
      )}
    </section>
  );
}
