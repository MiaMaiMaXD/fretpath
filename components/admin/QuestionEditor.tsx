'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useId, useRef, useState, useTransition } from 'react';
import { deleteQuestion, moveQuestion, saveQuestion } from '@/app/(admin)/admin/lessons/[id]/questions/actions';
import { ChoiceList, type ChoiceItem } from '@/components/admin/ChoiceList';
import { FormMessage } from '@/components/FormMessage';
import { SubmitButton } from '@/components/SubmitButton';
import { keepValuesSubmit } from '@/components/useKeepValuesSubmit';
import type { ActionState } from '@/lib/action-state';
import type { AdminQuestion } from '@/lib/data/admin-lessons';

const CONTROL = 'rounded border border-neutral-400 bg-transparent px-3 py-2';
const BTN = 'rounded border border-neutral-400 px-3 py-2 disabled:opacity-50';
const EMPTY: ActionState = { ok: false };

let choiceCounter = 0;
const newKey = () => `n${choiceCounter++}`;

function DeleteQuestionDialog({
  lessonId,
  questionId,
  label,
  onClose,
}: {
  lessonId: string;
  questionId: string;
  label: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = `delete-q-${questionId}`;

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
      className="m-auto w-full max-w-sm rounded bg-white p-4 text-neutral-900 backdrop:bg-black/50 dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div className="flex flex-col gap-3">
        <h2 id={titleId} className="text-lg font-semibold">
          ลบคำถามนี้?
        </h2>
        <p>{label}</p>
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
                const r = await deleteQuestion(lessonId, questionId);
                if (r.ok) {
                  dialogRef.current?.close();
                  router.refresh();
                } else setError(r.message ?? null);
              })
            }
          >
            ลบ
          </button>
          <button ref={cancelRef} type="button" disabled={pending} className={BTN} onClick={() => dialogRef.current?.close()}>
            ยกเลิก
          </button>
        </div>
      </div>
    </dialog>
  );
}

type EditorProps = {
  lessonId: string;
  /** null = new question */
  question: AdminQuestion | null;
  /** Visible number "ข้อ N"; a new question is named "คำถามใหม่". */
  number?: number;
  isFirst?: boolean;
  isLast?: boolean;
  onSaved?: () => void;
};

function QuestionEditor({ lessonId, question, number, isFirst, isLast, onSaved }: EditorProps) {
  const router = useRouter();
  const uid = useId();
  const [choices, setChoices] = useState<ChoiceItem[]>(() =>
    question
      ? question.choices.map((text, i) => ({ key: newKey(), id: question.choiceIds[i] ?? null, text }))
      : ['', ''].map((text) => ({ key: newKey(), id: null, text })),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);
  const [correct, setCorrect] = useState<number | null>(question?.correctIndex ?? null);
  const [prompt, setPrompt] = useState(question?.prompt ?? '');
  const [explanation, setExplanation] = useState(question?.explanation ?? '');
  const [rowPending, startRow] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);

  const [state, action, pending] = useActionState(
    (prev: ActionState, fd: FormData) => saveQuestion(lessonId, question?.id ?? null, prev, fd),
    EMPTY,
  );
  const e = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onSaved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function run(fn: () => Promise<ActionState>) {
    setRowError(null);
    startRow(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else setRowError(r.message ?? null);
    });
  }

  return (
    <fieldset className="space-y-3 rounded border border-neutral-300 p-3 dark:border-neutral-700">
      <legend className="px-1 font-semibold">{question ? `ข้อ ${number}` : 'คำถามใหม่'}</legend>
      <form onSubmit={keepValuesSubmit(action)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}prompt`} className="text-sm font-medium">
            คำถาม
          </label>
          <textarea
            id={`${uid}prompt`}
            name="prompt"
            rows={2}
            value={prompt}
            onChange={(ev) => setPrompt(ev.target.value)}
            aria-invalid={e.prompt ? true : undefined}
            className={CONTROL}
          />
          {e.prompt ? <p className="text-sm text-red-600">{e.prompt}</p> : null}
        </div>
        <ChoiceList
          idPrefix={uid}
          choices={choices}
          correct={correct}
          error={e.choices}
          correctError={e.correctIndex}
          newKey={newKey}
          onChange={(c, k) => {
            setChoices(c);
            setCorrect(k);
          }}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}explanation`} className="text-sm font-medium">
            คำอธิบาย
          </label>
          <textarea
            id={`${uid}explanation`}
            name="explanation"
            rows={2}
            value={explanation}
            onChange={(ev) => setExplanation(ev.target.value)}
            aria-invalid={e.explanation ? true : undefined}
            className={CONTROL}
          />
          {e.explanation ? <p className="text-sm text-red-600">{e.explanation}</p> : null}
        </div>
        <FormMessage state={state} />
        {rowError ? (
          <p role="alert" className="text-red-600">
            {rowError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <SubmitButton pending={pending}>บันทึกคำถาม</SubmitButton>
          {question ? (
            <>
              <button
                type="button"
                disabled={rowPending || isFirst}
                className={BTN}
                onClick={() => run(() => moveQuestion(lessonId, question.id, 'up'))}
              >
                เลื่อนขึ้น
              </button>
              <button
                type="button"
                disabled={rowPending || isLast}
                className={BTN}
                onClick={() => run(() => moveQuestion(lessonId, question.id, 'down'))}
              >
                เลื่อนลง
              </button>
              <button
                type="button"
                ref={deleteBtnRef}
                disabled={rowPending}
                className={BTN}
                onClick={() => setConfirmingDelete(true)}
              >
                ลบคำถาม
              </button>
            </>
          ) : null}
        </div>
      </form>
      {question && confirmingDelete ? (
        <DeleteQuestionDialog
          lessonId={lessonId}
          questionId={question.id}
          label={`ข้อ ${number}`}
          onClose={() => {
            setConfirmingDelete(false);
            deleteBtnRef.current?.focus();
          }}
        />
      ) : null}
    </fieldset>
  );
}

export function QuestionsSection({ lessonId, questions }: { lessonId: string; questions: AdminQuestion[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <section aria-labelledby="questions-h" className="space-y-4">
      <h2 id="questions-h" className="text-lg font-semibold">
        คำถามท้ายบท
      </h2>
      {questions.length === 0 && !adding ? <p>ยังไม่มีคำถาม</p> : null}
      {questions.map((q, i) => (
        <QuestionEditor
          key={q.id}
          lessonId={lessonId}
          question={q}
          number={i + 1}
          isFirst={i === 0}
          isLast={i === questions.length - 1}
        />
      ))}
      {adding ? <QuestionEditor lessonId={lessonId} question={null} onSaved={() => setAdding(false)} /> : null}
      {!adding ? (
        <button type="button" className={BTN} onClick={() => setAdding(true)}>
          เพิ่มคำถาม
        </button>
      ) : null}
    </section>
  );
}
