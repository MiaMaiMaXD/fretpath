'use client';

import { MAX_CHOICES, MIN_CHOICES } from '@/lib/admin/question-form';

/** `id` is the stored choice id (null for a choice not saved yet); history depends on it staying stable. */
export type ChoiceItem = { key: string; id: string | null; text: string };

type Props = {
  idPrefix: string;
  choices: ChoiceItem[];
  correct: number | null;
  error?: string;
  correctError?: string;
  onChange: (choices: ChoiceItem[], correct: number | null) => void;
  newKey: () => string;
};

const CONTROL = 'rounded border border-neutral-400 bg-transparent px-3 py-2';
const BTN = 'rounded border border-neutral-400 px-3 py-2';

/** 2–6 choices with add/remove and the "correct answer" radios. */
export function ChoiceList({ idPrefix, choices, correct, error, correctError, onChange, newKey }: Props) {
  function setText(i: number, text: string) {
    onChange(
      choices.map((c, j) => (j === i ? { ...c, text } : c)),
      correct,
    );
  }
  function remove(i: number) {
    const next = choices.filter((_, j) => j !== i);
    onChange(next, correct === null || correct === i ? null : correct > i ? correct - 1 : correct);
  }
  return (
    <div className="flex flex-col gap-3">
      {choices.map((c, i) => (
        <div key={c.key} className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}choice-${c.key}`} className="text-sm font-medium">
            ตัวเลือก {i + 1}
          </label>
          <div className="flex flex-wrap gap-2">
            <input type="hidden" name="choiceId" value={c.id ?? ''} />
            <input
              id={`${idPrefix}choice-${c.key}`}
              name="choice"
              value={c.text}
              onChange={(e) => setText(i, e.target.value)}
              className={`${CONTROL} min-w-0 flex-1`}
            />
            {choices.length > MIN_CHOICES ? (
              <button type="button" aria-label={`ลบตัวเลือก ${i + 1}`} className={BTN} onClick={() => remove(i)}>
                ลบตัวเลือก
              </button>
            ) : null}
          </div>
        </div>
      ))}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {choices.length < MAX_CHOICES ? (
        <div>
          <button
            type="button"
            className={BTN}
            onClick={() => onChange([...choices, { key: newKey(), id: null, text: '' }], correct)}
          >
            เพิ่มตัวเลือก
          </button>
        </div>
      ) : null}
      <fieldset className="flex flex-wrap items-center gap-4">
        <legend className="text-sm font-medium">ข้อที่ถูก</legend>
        {choices.map((c, i) => (
          <label key={c.key} className="flex items-center gap-1">
            <input
              type="radio"
              name="correctIndex"
              value={i}
              checked={correct === i}
              aria-label={`ตัวเลือก ${i + 1} เป็นข้อที่ถูก`}
              onChange={() => onChange(choices, i)}
            />
            <span aria-hidden="true">{i + 1}</span>
          </label>
        ))}
      </fieldset>
      {correctError ? <p className="text-sm text-red-600">{correctError}</p> : null}
    </div>
  );
}
