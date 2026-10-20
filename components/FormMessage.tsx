import type { ActionState } from '@/lib/action-state';

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? 'status' : 'alert'} className={state.ok ? 'text-green-700' : 'text-red-600'}>
      {state.message}
    </p>
  );
}
