'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useId, useState, useTransition } from 'react';
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
    (question?.choices ?? ['', '']).map((text) => ({ key: newKey(), text })),
  );
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
                disabled={rowPending}
                className={BTN}
                onClick={() => run(() => deleteQuestion(lessonId, question.id))}
              >
                ลบคำถาม
              </button>
            </>
          ) : null}
        </div>
      </form>
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
