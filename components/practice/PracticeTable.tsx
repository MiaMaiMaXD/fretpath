'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { deletePracticeLog, updatePracticeLog } from '@/app/(learner)/practice/actions';
import { FormMessage } from '@/components/FormMessage';
import { PracticeFields, type LessonOption } from '@/components/PracticeFields';
import { keepValuesSubmit } from '@/components/useKeepValuesSubmit';
import type { ActionState } from '@/lib/action-state';
import type { PracticeLog } from '@/lib/data/practice';
import { activityLabel, feelingLabel, practiceTitle } from '@/lib/practice-activities';
import './practice-log.css';

type Shared = {
  today: string;
  /** Lessons the learner can link a session to (the edit form's select). */
  lessons?: LessonOption[];
  /** Show the แก้ไข / ลบ buttons (the history page); the dashboard lists sessions read-only. */
  actions?: boolean;
  /** Lesson id → lesson number shown as "บทที่ N". */
  lessonNo: Record<string, number>;
};

function EditForm({
  log,
  today,
  lessons = [],
  onDone,
}: Pick<Shared, 'today' | 'lessons'> & {
  log: PracticeLog;
  onDone: () => void;
}) {
  const initial: ActionState = { ok: false };
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await updatePracticeLog(log.id, prev, fd);
    if (r.ok) onDone();
    return r;
  }, initial);
  const v = state.values ?? {};
  return (
    <form onSubmit={keepValuesSubmit(action)} className="edit-form" aria-label={`แก้ไข ${practiceTitle(log)}`}>
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
  const descId = `delete-desc-${id}`;

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
      aria-describedby={descId}
      onClose={onClose}
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
      className="confirm"
    >
      <svg className="confirm-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      </svg>
      <h2 id={titleId}>คุณต้องการจะลบหรือไม่?</h2>
      <p id={descId}>
        <b>“{title}”</b> จะหายไปถาวร
        <br />
        และเวลาการฝึกครั้งนี้จะถูกหักออกจากสถิติ
      </p>
      {error ? (
        <p role="alert" className="err">
          {error}
        </p>
      ) : null}
      <div className="confirm-actions">
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
        <button
          ref={cancelRef}
          type="button"
          disabled={pending}
          className="btn btn-slate"
          onClick={() => dialogRef.current?.close()}
        >
          ยกเลิก
        </button>
      </div>
    </dialog>
  );
}

function Row({ log, today, lessons, lessonNo, actions = true }: Shared & { log: PracticeLog }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editBtnRef = useRef<HTMLButtonElement>(null);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);
  const title = practiceTitle(log);
  const feeling = feelingLabel(log.feeling);
  const n = log.lessonId ? lessonNo[log.lessonId] : undefined;

  if (editing) {
    return (
      <tr className="editing">
        <td colSpan={3}>
          <EditForm
            log={log}
            today={today}
            lessons={lessons}
            onDone={() => {
              setEditing(false);
              requestAnimationFrame(() => editBtnRef.current?.focus());
            }}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="date">
        <time dateTime={log.practicedOn}>{log.practicedOn}</time>
      </td>
      <td className="what">
        <strong className="title">{title}</strong>
        <span className="meta">
          <span className="cat">{activityLabel(log.activity)}</span>
          {log.lessonTitle ? <span>{n !== undefined ? `บทที่ ${n} ${log.lessonTitle}` : log.lessonTitle}</span> : null}
          {feeling ? <span className={`feel tone-${log.feeling}`}>{feeling}</span> : null}
        </span>
        {log.note?.trim() ? <span className="note">{log.note}</span> : null}
        {actions ? (
          <span className="actions">
            <button ref={editBtnRef} type="button" className="link-btn" onClick={() => setEditing(true)}>
              แก้ไข
            </button>
            <button ref={deleteBtnRef} type="button" className="link-btn danger" onClick={() => setDeleting(true)}>
              ลบ
            </button>
          </span>
        ) : null}
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
      </td>
      <td className="num mins">{log.minutes} นาที</td>
    </tr>
  );
}

/** Practice sessions as a date / topic / minutes table; with `actions`, each row can be edited in place or deleted. */
export function PracticeTable({
  logs,
  labelledBy,
  minutesHead = 'เวลา (นาที)',
  ...shared
}: Shared & { logs: PracticeLog[]; labelledBy: string; minutesHead?: string }) {
  return (
    <div className="fp-log">
      <table className="log-table" aria-labelledby={labelledBy}>
        <thead>
          <tr>
            <th scope="col">วันที่</th>
            <th scope="col">หัวข้อที่ฝึก</th>
            <th scope="col" className="num">
              {minutesHead}
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <Row key={l.id} log={l} {...shared} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
