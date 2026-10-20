import type { FieldErrors } from '@/lib/validation';

const len = (s: string) => [...s].length;

export const MIN_CHOICES = 2;
export const MAX_CHOICES = 6;

export type QuestionInput = {
  prompt: string;
  choices: string[];
  /** Index (as a string) into `choices` of the correct one. */
  correctIndex: string;
  explanation: string;
};

/** Blank choices are ignored (not counted); the correct one must not be blank. */
export function validateQuestionInput(input: QuestionInput): FieldErrors {
  const errors: FieldErrors = {};
  const p = len(input.prompt.trim());
  if (p < 1) errors.prompt = 'กรุณาใส่คำถาม';
  else if (p > 500) errors.prompt = 'คำถามต้องไม่เกิน 500 ตัวอักษร';
  const filled = input.choices.map((c) => c.trim()).filter((c) => c !== '');
  if (filled.length < MIN_CHOICES || filled.length > MAX_CHOICES) {
    errors.choices = 'ต้องมีตัวเลือก 2–6 ข้อ';
  } else if (filled.some((c) => len(c) > 200)) {
    errors.choices = 'ตัวเลือกต้องไม่เกิน 200 ตัวอักษร';
  }
  const idx = Number(input.correctIndex);
  if (
    !/^\d+$/.test(input.correctIndex) ||
    idx >= input.choices.length ||
    input.choices[idx].trim() === ''
  ) {
    errors.correctIndex = 'กรุณาเลือกข้อที่ถูก';
  }
  if (len(input.explanation) > 1000) errors.explanation = 'คำอธิบายต้องไม่เกิน 1000 ตัวอักษร';
  return errors;
}

/**
 * Drop blank choices and re-map the correct index onto the remaining list (call after validation).
 * `ids` is aligned with `choices` ('' = new choice) and comes back aligned with the compacted list (null = new).
 */
export function compactChoices(
  choices: string[],
  ids: string[],
  correctIndex: number,
): { choices: string[]; ids: (string | null)[]; correct: number } {
  const out: string[] = [];
  const outIds: (string | null)[] = [];
  let correct = 0;
  choices.forEach((c, i) => {
    const t = c.trim();
    if (t === '') return;
    if (i === correctIndex) correct = out.length;
    out.push(t);
    outIds.push(ids[i] ? ids[i] : null);
  });
  return { choices: out, ids: outIds, correct };
}
