'use client';

import { startTransition, type FormEvent } from 'react';

/**
 * React 19 resets uncontrolled fields after a <form action> finishes. Submitting through
 * onSubmit runs the same action without that reset, so a failed submit keeps what was typed.
 * Pair with useActionState's pending flag (useFormStatus only works with <form action>).
 */
export function keepValuesSubmit(formAction: (payload: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };
}
