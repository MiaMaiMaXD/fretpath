import type { FieldErrors } from './validation';

export type ActionState = {
  ok: boolean;
  message?: string;
  /** Machine-readable error code (ErrorCode) when the UI needs to branch on it. */
  code?: string;
  fieldErrors?: FieldErrors;
  /** Non-sensitive field values to re-fill after a failed submit. Never include passwords. */
  values?: Record<string, string>;
};
