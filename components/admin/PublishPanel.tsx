'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  deleteLesson,
  publishLesson,
  unpublishLesson,
  type LessonActionResult,
} from '@/app/(admin)/admin/lessons/actions';
import { publishProblemsThai } from '@/lib/admin/lesson-form';

type Props = {
  lessonId: string;
  courseId: string;
  status: 'draft' | 'published';
  /** Question ids in sort_order: "ข้อ N" labels for publish problems. */
  questionIds: string[];
};

const BTN = 'rounded border border-neutral-400 px-3 py-2 disabled:opacity-50';
const DANGER = 'rounded bg-red-700 px-4 py-2 font-medium text-white disabled:opacity-60';

function DeleteDialog({ lessonId, courseId, status, onClose }: Omit<Props, 'questionIds'> & { onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<LessonActionResult | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

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
      aria-labelledby="delete-lesson-title"
      onClose={onClose}
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
      className="m-auto w-full max-w-sm rounded bg-white p-4 text-neutral-900 backdrop:bg-black/50 dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div className="flex flex-col gap-3">
        <h2 id="delete-lesson-title" className="text-lg font-semibold">
          ลบบทเรียนนี้?
        </h2>
        {result?.message ? (
          <p role="alert" className="text-red-600">
            {result.message}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {!result?.offerDraft ? (
            <button
              type="button"
              disabled={pending}
              className={DANGER}
              onClick={() =>
                start(async () => {
                  const r = await deleteLesson(lessonId);
                  if (r.ok) router.push(`/admin/lessons?course=${courseId}`);
                  else setResult(r);
                })
              }
            >
              ลบ
            </button>
          ) : null}
          {result?.offerDraft && status === 'published' ? (
            <button
              type="button"
              disabled={pending}
              className={BTN}
              onClick={() =>
                start(async () => {
                  const r = await unpublishLesson(lessonId);
                  if (r.ok) {
                    dialogRef.current?.close();
                    router.refresh();
                  } else setResult(r);
                })
              }
            >
              เปลี่ยนเป็นฉบับร่างแทน
            </button>
          ) : null}
          <button ref={cancelRef} type="button" disabled={pending} className={BTN} onClick={() => dialogRef.current?.close()}>
            ยกเลิก
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function PublishPanel({ lessonId, courseId, status, questionIds }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<LessonActionResult | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);

  const label = (id: string) => `ข้อ ${questionIds.indexOf(id) + 1}`;
  const problems = result?.problems ? publishProblemsThai(result.problems, label) : [];

  function toggle() {
    start(async () => {
      const r = status === 'published' ? await unpublishLesson(lessonId) : await publishLesson(lessonId);
      setResult(r.ok ? null : r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <section aria-labelledby="publish-h" className="space-y-3 rounded border border-neutral-300 p-3 dark:border-neutral-700">
      <h2 id="publish-h" className="text-lg font-semibold">
        การเผยแพร่
      </h2>
      <p>สถานะ: {status === 'published' ? 'เผยแพร่' : 'ฉบับร่าง'}</p>
      {problems.length > 0 ? (
        <div role="alert" className="text-red-600">
          <p className="font-medium">ยังเผยแพร่ไม่ได้:</p>
          <ul className="list-disc pl-6">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : result?.message ? (
        <p role="alert" className="text-red-600">
          {result.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} className={BTN} onClick={toggle}>
          {status === 'published' ? 'เปลี่ยนเป็นฉบับร่าง' : 'เผยแพร่'}
        </button>
        <button ref={deleteBtnRef} type="button" className={BTN} onClick={() => setDeleting(true)}>
          ลบบทเรียน
        </button>
      </div>
      {deleting ? (
        <DeleteDialog
          lessonId={lessonId}
          courseId={courseId}
          status={status}
          onClose={() => {
            setDeleting(false);
            deleteBtnRef.current?.focus();
          }}
        />
      ) : null}
    </section>
  );
}
