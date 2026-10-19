import type { FieldErrors } from './validation';

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
  /** Non-sensitive field values to re-fill after a failed submit. Never include passwords. */
  values?: Record<string, string>;
};
