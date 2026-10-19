'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({ children, pending: pendingProp }: { children: React.ReactNode; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
    >
      {children}
    </button>
  );
}
