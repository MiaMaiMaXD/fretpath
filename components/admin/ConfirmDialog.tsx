'use client';

import { useEffect, useRef } from 'react';

export type ConfirmTone = 'danger' | 'primary';

/**
 * Modal confirm box from the 2026-11 admin design: icon, question, optional detail, then
 * [confirm][ยกเลิก]. Uses <dialog> so focus is trapped and Escape cancels.
 */
export function ConfirmDialog({
  open,
  title,
  detail,
  confirmLabel = 'ลบ',
  tone = 'danger',
  icon = 'trash',
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  detail?: string;
  confirmLabel?: string;
  tone?: ConfirmTone;
  icon?: 'trash' | 'pause' | 'send';
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`fp-confirm ${tone}`}
      aria-labelledby="fp-confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={(e) => {
        // click on the backdrop (outside the card) cancels
        if (e.target === ref.current && !pending) onCancel();
      }}
    >
      <div className="card">
        <span className={`ic ${icon}`} aria-hidden="true">
          {ICONS[icon]}
        </span>
        <h2 id="fp-confirm-title">{title}</h2>
        {detail ? <p>{detail}</p> : null}
        <div className="actions">
          <button type="button" className="ok" onClick={onConfirm} disabled={pending}>
            {pending ? 'กำลังทำ…' : confirmLabel}
          </button>
          <button type="button" className="cancel" onClick={onCancel} disabled={pending} autoFocus>
            ยกเลิก
          </button>
        </div>
      </div>
    </dialog>
  );
}

const svg = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const ICONS = {
  trash: (
    <svg {...svg}>
      <path d="M4 7h16M10 3h4M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 3 3 10.5l7 2.5 2.5 7z" />
    </svg>
  ),
};
