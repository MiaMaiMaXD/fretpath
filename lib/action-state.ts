import type { FieldErrors } from './validation';

export type ActionState = { ok: boolean; message?: string; fieldErrors?: FieldErrors };
