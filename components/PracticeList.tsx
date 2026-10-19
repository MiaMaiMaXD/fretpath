'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { deletePracticeLog, updatePracticeLog } from '@/app/(learner)/practice/actions';
import { FormMessage } from '@/components/FormMessage';
import { PracticeFields, type LessonOption } from '@/components/PracticeFields';
import { SubmitButton } from '@/components/SubmitButton';
import type { ActionState } from '@/lib/action-state';
import type { PracticeLog } from '@/lib/data/practice';
import { activityLabel } from '@/lib/practice-activities';

type Shared = { today: string; lessons: LessonOption[] };

const BTN = 'rounded border border-neutral-400 px-3 py-1 disabled:opacity-50';

function EditRow({ log, today, lessons, onDone }: Shared & { log: PracticeLog; onDone: () => void }) {
  const initial: ActionState = { ok: false };
  const [state, action] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await updatePracticeLog(log.id, prev, fd);
    if (r.ok) onDone();
    return r;
  }, initial);
  const v = state.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      <PracticeFields
        idPrefix={`edit-${log.id}-`}
        today={today}
        lessons={lessons}
        errors={state.fieldErrors}
        values={{
          practicedOn: v.practicedOn ?? log.practicedOn,
          minutes: v.minutes ?? String(log.minutes),
          activity: v.activity ?? log.activity,
          note: v.note ?? log.note ?? '',
          lessonId: v.lessonId ?? log.lessonId ?? '',
        }}
      />
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton>บันทึก</SubmitButton>
        <button type="button" className={BTN} onClick={onDone}>
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function DeleteDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `delete-title-${id}`;

  // Native modal: focus trap, Escape and inert background come from showModal().
  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-full max-w-sm rounded bg-white p-4 text-neutral-900 backdrop:bg-black/50 dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div className="flex flex-col gap-3">
        <h2 id={titleId} className="text-lg font-semibold">
          ลบบันทึกนี้?
        </h2>
        {error ? (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            className="rounded bg-red-700 px-4 py-2 font-medium text-white disabled:opacity-60"
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
          <button autoFocus type="button" disabled={pending} className={BTN} onClick={() => dialogRef.current?.close()}>
            ยกเลิก
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Row({ log, today, lessons }: Shared & { log: PracticeLog }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);
  return (
    <li className="rounded border border-neutral-300 p-3 dark:border-neutral-700">
      {editing ? (
        <EditRow log={log} today={today} lessons={lessons} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex flex-col gap-1">
          <p className="font-medium">
            <time dateTime={log.practicedOn}>{log.practicedOn}</time> · {log.minutes} นาที · {activityLabel(log.activity)}
          </p>
          {log.lessonTitle ? <p className="text-sm">บทเรียน: {log.lessonTitle}</p> : null}
          {log.note ? <p className="whitespace-pre-wrap break-words text-sm">{log.note}</p> : null}
          <div className="flex gap-2 pt-1">
            <button type="button" className={BTN} onClick={() => setEditing(true)}>
              แก้ไข
            </button>
            <button ref={deleteBtnRef} type="button" className={BTN} onClick={() => setDeleting(true)}>
              ลบ
            </button>
          </div>
        </div>
      )}
      {deleting ? (
        <DeleteDialog
          id={log.id}
          onClose={() => {
            setDeleting(false);
            deleteBtnRef.current?.focus();
          }}
        />
      ) : null}
    </li>
  );
}

export function PracticeList({ logs, today, lessons }: Shared & { logs: PracticeLog[] }) {
  if (logs.length === 0) return <p>ยังไม่มีบันทึกการฝึก</p>;
  return (
    <ul className="flex flex-col gap-3">
      {logs.map((l) => (
        <Row key={l.id} log={l} today={today} lessons={lessons} />
      ))}
    </ul>
  );
}
