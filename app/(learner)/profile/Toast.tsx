'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type ToastInput = { message: string; error?: boolean; undo?: () => void };
/** Show a toast, or pass null to clear the current one (e.g. a newer save makes its undo stale). */
type ShowToast = (t: ToastInput | null) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

/** One small message at the bottom of the profile page, gone after 5 s, with an optional "เลิกทำ". */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(ToastInput & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback<ShowToast>((t) => {
    clearTimeout(timer.current);
    if (!t) {
      setToast(null);
      return;
    }
    setToast({ ...t, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-slot" role="status" aria-live="polite">
        {toast ? (
          <div key={toast.id} className={toast.error ? 'toast is-error' : 'toast'} data-testid="profile-toast">
            <span>{toast.message}</span>
            {toast.undo ? (
              <button
                type="button"
                onClick={() => {
                  const undo = toast.undo;
                  setToast(null);
                  undo?.();
                }}
              >
                เลิกทำ
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
